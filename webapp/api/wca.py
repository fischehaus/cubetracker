"""WCA-API-Endpoints (Phase W.wca-comps).

GET /wca/competitions/upcoming
  Liefert die naechsten WCA-Turniere in der Naehe der User-Postleitzahl.
  Voraussetzung: User hat postal_code im Profil. Sonst 422.

  Query-Parameter:
    - max_distance_km (default 300): Filter, nur Turniere innerhalb dieser
      Distanz vom User. None = kein Distanz-Filter.
    - limit (default 10, max 50): max. Anzahl Eintraege.
    - days_ahead (default 180): wie weit in die Zukunft schauen.

  Antwort: Liste sortiert nach Datum + Distanz. Jeder Eintrag enthaelt
  zusaetzlich `distance_km` (gerundet auf 1 Nachkommastelle).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import User
from wca.client import (
    WcaApiError,
    fetch_upcoming_competitions,
    fetch_upcoming_competitions_multi,
)
from wca.distance import (
    countries_with_neighbors,
    detect_country_from_postal_code,
    haversine_km,
)
from wca.geocoding import GeocodingError, geocode_postal_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wca", tags=["wca"])


@router.get("/competitions/upcoming")
@limiter.limit("30/minute")
async def upcoming_competitions(
    request: Request,
    max_distance_km: float | None = Query(default=300.0, ge=0, le=20000),
    limit: int = Query(default=10, ge=1, le=50),
    days_ahead: int = Query(default=180, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Naechste WCA-Turniere in der Naehe des Users."""
    postal = (current_user.postal_code or "").strip()
    # User.country_iso2 hat Vorrang (Phase W.country-feld) — fuer Nicht-DACH-
    # User funktioniert die PLZ-Heuristik nicht. Falls leer: fallback auf
    # PLZ-Detection (DE/AT/CH-Default fuer 5/4-stellige Codes).
    user_country = (current_user.country_iso2 or "").strip().upper() or None
    if not postal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Keine Postleitzahl im Profil hinterlegt. "
                "Setze sie unter Verwaltung -> Einstellungen -> Account."
            ),
        )
    # Wenn weder Land im Profil noch heuristisch aus PLZ bestimmbar →
    # User soll Land explizit setzen (sonst geocoding-Treffer schlecht +
    # Nachbarlaender unklar).
    detected_country = user_country or detect_country_from_postal_code(postal)
    if not detected_country:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Kein Land im Profil hinterlegt und PLZ-Format nicht "
                "eindeutig zuordbar. Setze dein Land unter Verwaltung -> "
                "Einstellungen -> Account."
            ),
        )

    # 1) Geocoding (mit DB-Cache, also meist sub-millisekunde nach erstem Lookup)
    # Wir uebergeben das User-Land explizit, damit Nominatim die richtige
    # Region trifft (z.B. PLZ 1234 in CH vs AT).
    try:
        geo = await geocode_postal_code(db, postal, country_iso2=detected_country)
    except GeocodingError as e:
        # 503 statt 500, weil's ein externer Service ist
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Geocoding fehlgeschlagen: {e}",
        ) from e

    user_lat = float(geo["lat"])
    user_lng = float(geo["lng"])
    # Country-Resolution-Reihenfolge:
    # 1) User.country_iso2 (explizit gesetzt)
    # 2) geo.country_iso2 (von Nominatim zurueck)
    # 3) PLZ-Heuristik (DACH)
    country = user_country or geo.get("country_iso2") or detect_country_from_postal_code(postal)

    # 2) WCA-API: Land + Nachbarlaender (Phase W.wca-neighbors, User-Wunsch
    #    2026-05-16). DE-User bekommen DE + AT + CH + NL + BE + LU + FR +
    #    DK + PL + CZ, AT-User entsprechend ihr DACH-Nachbar-Set, etc.
    #    Falls Country unbekannt: fallback auf weltweit (= leeres Country-
    #    Argument), aber max_distance-Filter macht die Liste eh klein.
    countries_to_query = countries_with_neighbors(country)
    try:
        if countries_to_query:
            comps = await fetch_upcoming_competitions_multi(
                country_iso2s=countries_to_query, days_ahead=days_ahead
            )
        else:
            # Unknown country → weltweit fetchen (max_distance filtert dann)
            comps = await fetch_upcoming_competitions(days_ahead=days_ahead)
    except WcaApiError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"WCA-API nicht erreichbar: {e}",
        ) from e

    # 3) Distance berechnen + filtern
    enriched: list[dict[str, Any]] = []
    for c in comps:
        clat = c.get("latitude_degrees")
        clng = c.get("longitude_degrees")
        if clat is None or clng is None:
            # WCA-Competition ohne Lat/Lng — kommt vor (manuell angelegte
            # Online-Comps). Wir lassen die ohne Distanz aber rein, wenn
            # kein max_distance gesetzt ist.
            if max_distance_km is None:
                enriched.append({**c, "distance_km": None})
            continue
        try:
            dist = haversine_km(user_lat, user_lng, float(clat), float(clng))
        except (TypeError, ValueError):
            continue
        if max_distance_km is not None and dist > max_distance_km:
            continue
        enriched.append({**c, "distance_km": round(dist, 1)})

    # 4) Sort: zuerst Datum (frueheste zuerst), dann Distanz.
    # QA-Fix Welle A (2026-05-16): explizit `is None`-Check statt `or`.
    # Mit `or 99_999` waere ein Turnier direkt am Wohnort des Users (dist=0.0)
    # als „weit weg" sortiert (0.0 ist falsy in Python).
    def _sort_key(c: dict[str, Any]) -> tuple[str, float]:
        dist = c.get("distance_km")
        return (
            str(c.get("start_date") or "9999-12-31"),
            float(dist) if dist is not None else 99_999.0,
        )

    enriched.sort(key=_sort_key)

    return {
        "user_location": {
            "postal_code": postal,
            "country_iso2": country,
            "lat": user_lat,
            "lng": user_lng,
            "display_name": geo.get("display_name"),
        },
        "filter": {
            "max_distance_km": max_distance_km,
            "days_ahead": days_ahead,
            "limit": limit,
            "countries_queried": countries_to_query,
        },
        "competitions": enriched[:limit],
        "total_found": len(enriched),
    }

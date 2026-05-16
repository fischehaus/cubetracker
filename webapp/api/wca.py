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
from wca.client import WcaApiError, fetch_upcoming_competitions
from wca.distance import detect_country_from_postal_code, haversine_km
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
    if not postal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Keine Postleitzahl im Profil hinterlegt. "
                "Setze sie in Verwaltung -> Einstellungen -> Account."
            ),
        )

    # 1) Geocoding (mit DB-Cache, also meist sub-millisekunde nach erstem Lookup)
    try:
        geo = await geocode_postal_code(db, postal)
    except GeocodingError as e:
        # 503 statt 500, weil's ein externer Service ist
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Geocoding fehlgeschlagen: {e}",
        ) from e

    user_lat = float(geo["lat"])
    user_lng = float(geo["lng"])
    country = geo.get("country_iso2") or detect_country_from_postal_code(postal)

    # 2) WCA-API: Competitions im selben Land. Wir filtern bewusst auf
    #    `country` statt weltweit, weil:
    #      a) der typische User will Turniere "in der Naehe" = im eigenen Land
    #      b) weltweite Liste waere 100+ Eintraege und langsam
    #    Falls country=None: fallback auf weltweit, aber max_distance-Filter
    #    macht die Liste eh klein.
    try:
        comps = await fetch_upcoming_competitions(
            country_iso2=country, days_ahead=days_ahead
        )
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

    # 4) Sort: zuerst Datum (frueheste zuerst), dann Distanz
    def _sort_key(c: dict[str, Any]) -> tuple[str, float]:
        return (
            str(c.get("start_date") or "9999-12-31"),
            float(c.get("distance_km") or 99_999),
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
        },
        "competitions": enriched[:limit],
        "total_found": len(enriched),
    }

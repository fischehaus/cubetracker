"""Postleitzahl → Lat/Lng via Nominatim/OpenStreetMap (Phase W.wca-comps).

Nominatim ist frei, rate-limited (1 req/s) und unzuverlaessig für
high-volume. Daher persistenter DB-Cache (`postal_code_geo`-Tabelle):
PLZ-Geo ändert sich quasi nie, TTL = 30 Tage reicht.

User-Agent-Header ist Pflicht laut Nominatim-ToS. Wir setzen einen
eindeutigen String mit Kontakt-URL — sonst riskiert man Block.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session as OrmSession

from db.models import PostalCodeGeo
from .distance import detect_country_from_postal_code

logger = logging.getLogger(__name__)

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
NOMINATIM_USER_AGENT = "cubetracker.de/2.0 (https://cubetracker.de)"
NOMINATIM_TIMEOUT_S = 10.0
CACHE_TTL_DAYS = 30


class GeocodingError(Exception):
    """Geocoding-Lookup ist gescheitert (Network, Rate-Limit, kein Treffer).

    Caller sollten das fangen + dem User „Postleitzahl konnte nicht
    geocodiert werden, versuche es später nochmal" zeigen, statt 500.
    """


async def geocode_postal_code(
    db: OrmSession,
    postal_code: str,
    country_iso2: str | None = None,
) -> dict[str, Any]:
    """PLZ → {lat, lng, country_iso2, display_name} mit DB-Cache.

    Strategie:
      1. country_iso2 ableiten falls nicht gegeben (PLZ-Struktur-Heuristik).
      2. DB-Cache pruefen — wenn Treffer & TTL OK: zurück (kein HTTP).
      3. Sonst: Nominatim-Call, persist, zurück.

    Raises GeocodingError bei Network-Fehler oder kein-Treffer.
    """
    cleaned = postal_code.strip()
    if not cleaned:
        raise GeocodingError("Postleitzahl ist leer")

    country = country_iso2 or detect_country_from_postal_code(cleaned)
    # Wenn kein Land bestimmbar: nutze leeren String als Cache-Key, lass
    # Nominatim weltweit suchen. Treffer-Wahrscheinlichkeit sinkt, aber
    # blockiert nicht hart.
    cache_country = country or ""

    # 1) Cache-Check
    cached = db.get(PostalCodeGeo, (cleaned, cache_country))
    if cached and cached.fetched_at:
        fetched = cached.fetched_at
        # Fallback für naive DB-Timestamps (SQLite-Dev)
        if fetched.tzinfo is None:
            fetched = fetched.replace(tzinfo=UTC)
        age = datetime.now(UTC) - fetched
        if age < timedelta(days=CACHE_TTL_DAYS):
            return {
                "lat": cached.lat,
                "lng": cached.lng,
                "country_iso2": cached.country_iso2 or country,
                "display_name": cached.display_name,
                "from_cache": True,
            }

    # 2) Nominatim-Call
    params: dict[str, Any] = {
        "postalcode": cleaned,
        "format": "json",
        "limit": 1,
        "addressdetails": 0,
    }
    if country:
        params["countrycodes"] = country.lower()

    try:
        async with httpx.AsyncClient(
            timeout=NOMINATIM_TIMEOUT_S,
            headers={"User-Agent": NOMINATIM_USER_AGENT, "Accept": "application/json"},
        ) as client:
            resp = await client.get(f"{NOMINATIM_BASE}/search", params=params)
            resp.raise_for_status()
            results = resp.json()
    except httpx.HTTPError as e:
        logger.warning("Nominatim-Lookup failed for %s/%s: %s", cleaned, country, e)
        raise GeocodingError(f"Geocoding-Service nicht erreichbar: {e}") from e

    if not isinstance(results, list) or not results:
        raise GeocodingError(
            f"Keine Geo-Daten für Postleitzahl '{cleaned}'"
            + (f" in {country}" if country else "")
        )

    first = results[0]
    try:
        lat = float(first["lat"])
        lng = float(first["lon"])
    except (KeyError, TypeError, ValueError) as e:
        raise GeocodingError(f"Nominatim-Response unbrauchbar: {e}") from e

    display_name = str(first.get("display_name", ""))[:255] or None

    # 3) Persist (upsert)
    if cached:
        cached.lat = lat
        cached.lng = lng
        cached.fetched_at = datetime.now(UTC)
        cached.display_name = display_name
    else:
        db.add(
            PostalCodeGeo(
                postal_code=cleaned,
                country_iso2=cache_country,
                lat=lat,
                lng=lng,
                fetched_at=datetime.now(UTC),
                display_name=display_name,
            )
        )
    db.commit()

    return {
        "lat": lat,
        "lng": lng,
        "country_iso2": country,
        "display_name": display_name,
        "from_cache": False,
    }

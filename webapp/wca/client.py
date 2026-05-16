"""WCA-API-v0-Wrapper (Phase W.wca-comps).

Liest die offizielle World Cube Association API (https://www.worldcubeassociation.org/api/v0).
Public, kein Key, kein Auth — aber rate-limited (zu viele Anfragen fuehren zu 429).

Wir cachen agressiv in-memory (TTL 1h pro Query) und liefern aufbereitete
Slim-Dicts statt der vollen WCA-Response — Frontend braucht nur 8 Felder.

In-Memory-Cache pro Worker: ist OK weil:
  - WCA-API antwortet schnell (~200-500ms)
  - Bei N Workern haben wir N Cache-Misses pro TTL-Window — bei 2 Render-
    Workern und stuendlichem Refresh = 48 Calls/Tag, weit unter Rate-Limit
  - Distributed-Cache (Redis) ist Phase-Hetzner+, jetzt Overkill
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, timedelta
from typing import Any

import httpx

logger = logging.getLogger(__name__)

WCA_API_BASE = "https://www.worldcubeassociation.org/api/v0"
WCA_TIMEOUT_S = 15.0
DEFAULT_CACHE_TTL_S = 3600  # 1h


class WcaApiError(Exception):
    """WCA-API ist nicht erreichbar oder antwortet kaputt."""


# Modul-Level Cache: { cache_key: (timestamp, data) }
_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}


def _cache_get(key: str, ttl_s: int = DEFAULT_CACHE_TTL_S) -> list[dict[str, Any]] | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > ttl_s:
        return None
    return data


def _cache_set(key: str, data: list[dict[str, Any]]) -> None:
    _cache[key] = (time.time(), data)


def _slim_competition(comp: dict[str, Any]) -> dict[str, Any]:
    """Reduziert WCA-Competition-Dict auf die Felder die Frontend braucht.

    WCA-Response hat ~30 Felder pro Competition — wir nehmen 10 davon plus
    eine berechnete `events_count`-Convenience. Hervorhebung der Felder
    die fuer das Frontend wichtig sind, der Rest wird vom Backend
    geschluckt.
    """
    return {
        "id": comp.get("id"),
        "name": comp.get("name"),
        "city": comp.get("city"),
        "country_iso2": comp.get("country_iso2"),
        "venue": comp.get("venue"),
        "start_date": comp.get("start_date"),
        "end_date": comp.get("end_date"),
        "registration_open": comp.get("registration_open"),
        "registration_close": comp.get("registration_close"),
        "url": comp.get("url"),
        "website": comp.get("website"),
        "latitude_degrees": comp.get("latitude_degrees"),
        "longitude_degrees": comp.get("longitude_degrees"),
        "event_ids": comp.get("event_ids") or [],
        "events_count": len(comp.get("event_ids") or []),
    }


async def fetch_upcoming_competitions(
    country_iso2: str | None = None,
    days_ahead: int = 180,
    today: date | None = None,
) -> list[dict[str, Any]]:
    """Holt die naechsten Competitions ab `today` bis +`days_ahead` Tage.

    Optional Land-Filter (`country_iso2`, ISO-3166-alpha-2, z.B. "DE").

    Pagination: WCA liefert per_page=25 Default, wir setzen 100. Wir
    folgen aktuell nicht der Pagination — fuer DE liefert das ~10-20
    Eintraege in einem typischen Halbjahr, fuer „weltweit" auch noch
    < 100. Wenn das mal nicht reicht: paginate.

    Returns: Liste slim-formatierter Competition-Dicts. Bei Fehler:
    `WcaApiError`.
    """
    start = today or date.today()
    end = start + timedelta(days=days_ahead)

    cache_key = f"upcoming:{country_iso2 or 'ALL'}:{start.isoformat()}:{days_ahead}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    params: dict[str, Any] = {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "per_page": 100,
        "sort": "start_date",
    }
    if country_iso2:
        params["country_iso2"] = country_iso2.upper()

    try:
        async with httpx.AsyncClient(
            timeout=WCA_TIMEOUT_S,
            headers={
                "User-Agent": "cubetracker.de/2.0 (https://cubetracker.de)",
                "Accept": "application/json",
            },
        ) as client:
            resp = await client.get(f"{WCA_API_BASE}/competitions", params=params)
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPError as e:
        logger.warning("WCA-API failed: %s", e)
        raise WcaApiError(f"WCA-API nicht erreichbar: {e}") from e

    if not isinstance(raw, list):
        raise WcaApiError(f"WCA-API-Response unerwartet (kein Array): {type(raw)}")

    # Filter: nur noch nicht abgelaufene Competitions (defensive — der
    # `start` Param sollte das schon machen, aber WCA hat manchmal alte
    # Eintraege drin).
    today_iso = start.isoformat()
    items = [
        _slim_competition(c)
        for c in raw
        if isinstance(c, dict) and (c.get("end_date") or "") >= today_iso
    ]

    # Sort by start_date ascending (defensive — sort-Param sollte das
    # schon machen, aber sicher ist sicher)
    def _start_key(c: dict[str, Any]) -> str:
        return str(c.get("start_date") or "9999-12-31")

    items.sort(key=_start_key)

    _cache_set(cache_key, items)
    return items


def clear_cache() -> None:
    """Test-Helper: leert den In-Memory-Cache."""
    _cache.clear()


async def fetch_upcoming_competitions_multi(
    country_iso2s: list[str],
    days_ahead: int = 180,
    today: date | None = None,
) -> list[dict[str, Any]]:
    """Parallel-Fetch fuer mehrere Laender (Phase W.wca-neighbors).

    Ruft `fetch_upcoming_competitions` fuer jedes Land parallel via
    `asyncio.gather` auf — bei 10 Laendern (DE + Nachbarn) ergibt das
    10 parallele HTTP-Calls statt 10 sequentielle (Latenz ~ max statt sum).
    Cache-Hits sind no-op, daher pro Land 0-500ms.

    Per-Country-Fehler werden geschluckt (ein nicht-erreichbares Land
    killt nicht die ganze Liste). Dedup via competition `id` — falls
    ein Turnier aus irgendwelchen Gruenden doppelt zurueckkommt, nehmen
    wir den ersten.
    """
    if not country_iso2s:
        return []

    async def _safe_fetch(country: str) -> list[dict[str, Any]]:
        try:
            return await fetch_upcoming_competitions(
                country_iso2=country, days_ahead=days_ahead, today=today
            )
        except WcaApiError as e:
            logger.warning("WCA fetch for %s failed: %s", country, e)
            return []

    results = await asyncio.gather(*[_safe_fetch(c) for c in country_iso2s])

    # Flatten + Dedup nach competition id (falls jemand in zwei Country-Filtern
    # auftaucht — sollte nicht passieren, aber defensiv).
    seen_ids: set[str] = set()
    merged: list[dict[str, Any]] = []
    for batch in results:
        for comp in batch:
            cid = str(comp.get("id") or "")
            if not cid or cid in seen_ids:
                continue
            seen_ids.add(cid)
            merged.append(comp)

    # Sort by start_date asc (wie single-country)
    merged.sort(key=lambda c: str(c.get("start_date") or "9999-12-31"))
    return merged

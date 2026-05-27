"""WCA-API-v0-Wrapper (Phase W.wca-comps).

Liest die offizielle World Cube Association API (https://www.worldcubeassociation.org/api/v0).
Public, kein Key, kein Auth — aber rate-limited (zu viele Anfragen führen zu 429).

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
    die für das Frontend wichtig sind, der Rest wird vom Backend
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
    """Holt die nächsten Competitions ab `today` bis +`days_ahead` Tage.

    Optional Land-Filter (`country_iso2`, ISO-3166-alpha-2, z.B. "DE").

    Pagination: WCA liefert per_page=25 Default, wir setzen 100. Wir
    folgen aktuell nicht der Pagination — für DE liefert das ~10-20
    Einträge in einem typischen Halbjahr, für „weltweit" auch noch
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
    # Einträge drin).
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


# Person-Cache eigener Slot — andere TTL als Competitions (PRs ändern sich
# nur bei tatsächlicher Wettkampf-Teilnahme, also seltener).
# Tuple: (timestamp, slim-dict | None, is_negative)
_person_cache: dict[str, tuple[float, dict[str, Any] | None, bool]] = {}
PERSON_CACHE_TTL_S = 6 * 3600  # 6h — PBs ändern sich sehr selten
# QA-Fix W.wca-profile-qa: Negative-Cache (= 404 von WCA) deutlich kürzer.
# Sonst sperrt ein Tippfehler bei der Eingabe den User 6h aus (gleiche ID
# nach Korrektur landet wieder im 404-Slot). 30min reicht als Schutz gegen
# Typo-Hammering, ohne den User dauerhaft zu blockieren.
PERSON_CACHE_TTL_NEGATIVE_S = 30 * 60  # 30min


async def fetch_person(wca_id: str) -> dict[str, Any] | None:
    """Holt offizielles WCA-Person-Profil inkl. PBs + Wettkampf-Historie.

    Endpoint: GET /api/v0/persons/{wca_id}.
    Returns: slim-dict mit Felder die Frontend braucht. None wenn die WCA-ID
    unbekannt ist (404). WcaApiError bei Connection-/5xx-Fehler.

    Cache: 6h pro WCA-ID. Bei einem App-User pro Tag triviale Last
    (1 Cache-Miss/Tag/User).
    """
    wca_id = wca_id.strip().upper()
    if not wca_id:
        return None

    cache_key = f"person:{wca_id}"
    entry = _person_cache.get(cache_key)
    if entry is not None:
        ts, data, is_negative = entry
        ttl = PERSON_CACHE_TTL_NEGATIVE_S if is_negative else PERSON_CACHE_TTL_S
        if time.time() - ts <= ttl:
            return data

    try:
        async with httpx.AsyncClient(
            timeout=WCA_TIMEOUT_S,
            headers={
                "User-Agent": "cubetracker.de/2.0 (https://cubetracker.de)",
                "Accept": "application/json",
            },
        ) as client:
            resp = await client.get(f"{WCA_API_BASE}/persons/{wca_id}")
            if resp.status_code == 404:
                # Cache the negative answer so repeated lookups for a typo
                # don't hammer the WCA-API. Kurze TTL (30min) — siehe
                # PERSON_CACHE_TTL_NEGATIVE_S-Kommentar oben.
                _person_cache[cache_key] = (time.time(), None, True)
                return None
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPError as e:
        logger.warning("WCA person fetch failed for %s: %s", wca_id, e)
        raise WcaApiError(f"WCA-API nicht erreichbar: {e}") from e

    if not isinstance(raw, dict):
        raise WcaApiError(f"WCA-API-Response unerwartet (kein Object): {type(raw)}")

    # Strukturieren auf Slim-Dict. WCA-API liefert ein paar verschachtelte
    # Strukturen — wir extrahieren genau die Felder die unsere UI nutzt.
    person = raw.get("person") or {}
    competitions = raw.get("competitions") or []
    medals = raw.get("medals") or {}
    records = raw.get("records") or {}
    personal_records = raw.get("personal_records") or {}

    slim = {
        "wca_id": person.get("wca_id") or wca_id,
        "name": person.get("name"),
        "country_iso2": person.get("country_iso2"),
        "gender": person.get("gender"),
        "delegate_status": person.get("delegate_status"),
        "url": person.get("url"),
        "avatar_url": (person.get("avatar") or {}).get("url"),
        "avatar_thumb_url": (person.get("avatar") or {}).get("thumb_url"),
        "competitions_count": len(competitions),
        "medals": {
            "gold": medals.get("gold", 0),
            "silver": medals.get("silver", 0),
            "bronze": medals.get("bronze", 0),
            "total": medals.get("total", 0),
        },
        "records": {
            "world": records.get("WR", 0),
            "continental": records.get("CR", 0),
            "national": records.get("NR", 0),
            "total": records.get("total", 0),
        },
        # personal_records: dict keyed by event_id, jeder Wert hat "single" + "average".
        # Wir konvertieren zu Array of {event, single, average} für stable Frontend-Render.
        "personal_records": _slim_personal_records(personal_records),
        # Recent competitions (last 5, neueste zuerst) — sortiert nach start_date desc.
        "recent_competitions": _slim_competitions_for_person(competitions),
    }

    _person_cache[cache_key] = (time.time(), slim, False)
    return slim


def _slim_personal_records(prs: dict[str, Any]) -> list[dict[str, Any]]:
    """WCA-PRs in stabile Array-Form bringen (sortiert nach event_id).

    Input: {event_id: {single: {best, world_rank, ...}, average: {...}}}
    Output: [{event, single: {...}, average: {...}}]
    """
    if not isinstance(prs, dict):
        return []

    def _slim_one(entry: dict[str, Any] | None) -> dict[str, Any] | None:
        if not isinstance(entry, dict):
            return None
        return {
            "best": entry.get("best"),
            "world_rank": entry.get("world_rank"),
            "continental_rank": entry.get("continental_rank"),
            "national_rank": entry.get("national_rank"),
        }

    out: list[dict[str, Any]] = []
    # Sortierung nach offizieller WCA-Event-Reihenfolge — Sub-Set, Rest
    # alphabetisch. So bleibt der Output stabil.
    event_order = [
        "333", "222", "444", "555", "666", "777",
        "333bf", "333fm", "333oh",
        "clock", "minx", "pyram", "skewb", "sq1",
        "444bf", "555bf", "333mbf",
    ]
    ordered_events = [e for e in event_order if e in prs] + sorted(
        e for e in prs if e not in event_order
    )
    for event_id in ordered_events:
        raw_entry = prs.get(event_id) or {}
        if not isinstance(raw_entry, dict):
            continue
        out.append({
            "event": event_id,
            "single": _slim_one(raw_entry.get("single")),
            "average": _slim_one(raw_entry.get("average")),
        })
    return out


def _slim_competitions_for_person(
    comps: list[Any], limit: int = 5
) -> list[dict[str, Any]]:
    """Letzte N Wettkämpfe sortiert nach start_date desc."""
    if not isinstance(comps, list):
        return []
    slim = [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "city": c.get("city"),
            "country_iso2": c.get("country_iso2"),
            "start_date": c.get("start_date"),
            "end_date": c.get("end_date"),
            "url": c.get("url"),
        }
        for c in comps
        if isinstance(c, dict)
    ]
    slim.sort(key=lambda c: str(c.get("start_date") or "0000-00-00"), reverse=True)
    return slim[:limit]


async def fetch_upcoming_competitions_multi(
    country_iso2s: list[str],
    days_ahead: int = 180,
    today: date | None = None,
) -> list[dict[str, Any]]:
    """Parallel-Fetch für mehrere Länder (Phase W.wca-neighbors).

    Ruft `fetch_upcoming_competitions` für jedes Land parallel via
    `asyncio.gather` auf — bei 10 Ländern (DE + Nachbarn) ergibt das
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

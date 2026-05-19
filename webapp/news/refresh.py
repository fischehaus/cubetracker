"""News + WCA Auto-Refresh-Helpers (Phase W.auto-refresh, 2026-05-16).

Wird vom Login-Endpoint als BackgroundTask aufgerufen — fetcht News +
WCA-Comps für die Standard-Länder, wenn die jeweiligen Caches stale
sind. Bei warmen Caches: no-op (kein HTTP, kein DB-Write).

Damit ist ein User der sich nach laengerer Pause einloggt mit
hoher Wahrscheinlichkeit von frischen Daten begruesst.

WICHTIG: läuft als FastAPI-BackgroundTask, d.h. NACH der Response.
Eigene DB-Session wird benötigt (die Request-Session ist beim
Response-Send schon geschlossen).
"""

from __future__ import annotations

import asyncio
import logging

from db.database import SessionLocal
from news.fetcher import fetch_all_sources, is_stale
from wca.client import fetch_upcoming_competitions_multi
from wca.distance import NEIGHBORING_COUNTRIES

logger = logging.getLogger(__name__)


def refresh_news_if_stale() -> None:
    """Holt neue News-Items wenn die DB-Cache > 60min alt ist.

    Kein Exception-Throw — Background-Tasks sollen nichts crashen.
    """
    db = SessionLocal()
    try:
        if not is_stale(db):
            return
        stats = fetch_all_sources(db)
        logger.info("login-trigger news refresh: %s", stats.get("totals", {}))
    except Exception as e:  # noqa: BLE001
        logger.warning("login-trigger news refresh failed: %s", e)
        try:
            db.rollback()
        except Exception:  # noqa: BLE001
            pass
    finally:
        db.close()


async def refresh_wca_caches_if_stale() -> None:
    """Warmt die WCA-In-Memory-Caches für die DACH-Region.

    Der WCA-Cache ist pro Worker — das hier waermt nur den Login-Worker.
    Andere Worker fetchen beim ersten Aufruf selbst. Akzeptabel, weil
    WCA-API ~500ms pro Call ist und der Cache 1h hält.

    Wir warmen die 3 großen Sub-Sets (DE-Nachbarn, AT-Nachbarn,
    CH-Nachbarn) — alle drei werden parallel gefetcht. Bei warmen Caches
    sind das 0ms (kein HTTP). Bei kaltem Worker maximal ~1-2s.
    """
    sets_to_warm: set[str] = set()
    for region_neighbors in NEIGHBORING_COUNTRIES.values():
        sets_to_warm.update(region_neighbors)

    if not sets_to_warm:
        return

    try:
        # parallel via gather. Errors per country werden im multi-fetcher
        # geschluckt.
        await fetch_upcoming_competitions_multi(country_iso2s=list(sets_to_warm))
    except Exception as e:  # noqa: BLE001
        logger.warning("login-trigger wca warmup failed: %s", e)


def trigger_background_refresh() -> None:
    """Sync-Wrapper: ruft beide Refreshs auf — News sync, WCA async via
    asyncio.run. FastAPI BackgroundTask läuft in Thread-Pool, daher
    dürfen wir asyncio.run() benutzen.

    Wenn ein Refresh failed: kein Crash, weiter mit dem nächsten.
    """
    # 1) News (sync)
    try:
        refresh_news_if_stale()
    except Exception as e:  # noqa: BLE001
        logger.warning("background-refresh: news failed: %s", e)

    # 2) WCA (async → asyncio.run)
    try:
        asyncio.run(refresh_wca_caches_if_stale())
    except Exception as e:  # noqa: BLE001
        logger.warning("background-refresh: wca failed: %s", e)

"""News-API-Endpoints (Phase W.news).

GET /news/latest
  Liefert die letzten News-Items aus dem RSS-Aggregator. Pull-Strategie:
  wenn die letzte gespeicherte `fetched_at` aelter als 60 Min ist, wird
  vorher synchron neu gefetcht (durchschnittlich 1-2s fuer 2 Feeds).

  Auth erforderlich (keine anonymen Calls — vermeidet Aufruf-Spam).
  Rate-Limit 60/min.

  Query-Parameter:
    - limit (default 10, max 50)
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import NewsItem, User
from news.fetcher import fetch_all_sources, get_latest, is_stale

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])


def _item_to_dict(item: NewsItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "source": item.source,
        "source_label": item.source_label,
        "title": item.title,
        "link": item.link,
        "summary": item.summary,
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "fetched_at": item.fetched_at.isoformat() if item.fetched_at else None,
    }


@router.get("/latest")
@limiter.limit("60/minute")
def latest_news(
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert News-Items mit on-demand-Refresh wenn stale."""
    # Stale-Check + ggf. Re-Fetch
    fetch_stats: dict[str, Any] | None = None
    if is_stale(db):
        try:
            fetch_stats = fetch_all_sources(db)
        except Exception as e:  # noqa: BLE001
            # Fetch-Fehler darf den Endpoint nicht killen — wir liefern
            # einfach was an alten Daten in der DB ist.
            logger.warning("on-demand news fetch failed: %s", e)
            fetch_stats = {"error": str(e)}

    items = get_latest(db, limit=limit)
    return {
        "items": [_item_to_dict(i) for i in items],
        "count": len(items),
        "refreshed": fetch_stats is not None,
        "fetch_stats": fetch_stats,
    }

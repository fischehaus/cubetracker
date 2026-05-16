"""News-Fetcher (Phase W.news).

Pull-Strategie: kein dedizierter Cron, statt dessen "fetch-if-stale" im
Endpoint-Pfad. Wenn die letzte gespeicherte `fetched_at` aelter als
`STALE_AFTER_MIN` Minuten ist, triggern wir einen synchronen Fetch
(durchschnittlich 1-2s fuer 2 Feeds) bevor wir die Liste returnen.

In Multi-Worker-Umgebungen (Render hat 1-2 Worker) kann das zu Race-
Conditions fuehren — zwei Worker fetchen parallel. Defensive: wir
checken vor jedem Persist auf Existenz via `link`-Unique und schlucken
IntegrityErrors.

Auf Render-Free wird der Worker bei Inaktivitaet eingeschlafen — ein
dedizierter Cron-Job liefe sowieso nicht zuverlaessig. On-demand-Fetch
ist daher angemessen.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

from db.models import NewsItem
from .sources import FEED_SOURCES, FeedSource

logger = logging.getLogger(__name__)

FETCH_TIMEOUT_S = 10.0
STALE_AFTER_MIN = 60  # 1h
KEEP_DAYS = 60  # Items aelter als 60d werden im selben Pass geloescht
HTTP_HEADERS = {
    "User-Agent": "cubetracker.de/2.0 (https://cubetracker.de)",
    "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
}


def is_stale(db: OrmSession) -> bool:
    """Letzter fetched_at aelter als STALE_AFTER_MIN? Wenn ja: re-fetch sinnvoll."""
    latest_fetched = db.scalar(select(NewsItem.fetched_at).order_by(NewsItem.fetched_at.desc()).limit(1))
    if latest_fetched is None:
        return True  # Tabelle leer → fetch
    if latest_fetched.tzinfo is None:
        latest_fetched = latest_fetched.replace(tzinfo=UTC)
    return datetime.now(UTC) - latest_fetched > timedelta(minutes=STALE_AFTER_MIN)


def _parse_entry(entry: Any, source: FeedSource) -> dict[str, Any] | None:
    """Reduziert ein feedparser-Entry auf NewsItem-Felder.

    Returnt None wenn entry kaputt (z.B. fehlende Pflichtfelder).

    QA-Fix Welle B (2026-05-16): Operator-Precedence-Bug behoben.
    Vorher: `getattr(entry, "link", None) or entry.get("link") if hasattr(...)`
    parste Python als `(getattr(...) or entry.get("link")) if hasattr(...) else None`
    — bei Entries ohne `.get` waere link faelschlich None. Jetzt explizite
    Klammern + Helper.
    """

    def _attr_or_key(obj: Any, key: str) -> Any:
        # feedparser-Entries sind FeedParserDict — sowohl Attribute als
        # auch Dict-Keys verfuegbar. Wir probieren beides.
        val = getattr(obj, key, None)
        if val is None and hasattr(obj, "get"):
            try:
                val = obj.get(key)
            except (TypeError, AttributeError):
                val = None
        return val

    link = _attr_or_key(entry, "link")
    title = _attr_or_key(entry, "title")
    if not link or not title:
        return None

    summary_raw = _attr_or_key(entry, "summary") or ""
    # Plain-Text-Extract: HTML-Tags grob raus, dann auf 500 Zeichen kappen.
    import re

    summary = re.sub(r"<[^>]+>", "", str(summary_raw)).strip()
    if len(summary) > 500:
        summary = summary[:497] + "..."

    # published_parsed ist ein time.struct_time. Wir konvertieren auf UTC-aware datetime.
    pub_parsed = _attr_or_key(entry, "published_parsed")
    published_at: datetime | None = None
    if pub_parsed:
        try:
            published_at = datetime(*pub_parsed[:6], tzinfo=UTC)
        except (TypeError, ValueError):
            published_at = None

    return {
        "source": source.source_id,
        "source_label": source.label,
        "title": str(title)[:500],
        "link": str(link)[:1000],
        "summary": summary or None,
        "published_at": published_at,
    }


def _fetch_one_source(source: FeedSource) -> list[dict[str, Any]]:
    """Holt einen einzelnen Feed, parsiert mit feedparser, returnt
    Liste der bereinigten Item-Dicts (max `per_fetch_limit`).

    Bei jedem Fehler (Netz, Parse): leere Liste — wir werfen nicht,
    damit ein einzelner kaputter Feed nicht den ganzen Fetch killt.
    """
    try:
        with httpx.Client(timeout=FETCH_TIMEOUT_S, headers=HTTP_HEADERS) as client:
            resp = client.get(source.url)
            resp.raise_for_status()
            body = resp.content
    except httpx.HTTPError as e:
        logger.warning("News fetch failed for %s: %s", source.source_id, e)
        return []

    try:
        import feedparser

        feed = feedparser.parse(body)
    except Exception as e:  # noqa: BLE001
        logger.warning("News parse failed for %s: %s", source.source_id, e)
        return []

    entries = feed.entries[: source.per_fetch_limit] if feed.entries else []
    items: list[dict[str, Any]] = []
    for entry in entries:
        parsed = _parse_entry(entry, source)
        if parsed is not None:
            items.append(parsed)
    return items


def fetch_all_sources(db: OrmSession) -> dict[str, Any]:
    """Synchroner Fetch aller konfigurierten Feeds + Persistenz.

    Workflow:
      1. Pro Source: HTTP-Get + feedparser
      2. Pro Item: link-Lookup in DB, falls neu → INSERT (IntegrityError-
         Schutz fuer Multi-Worker-Race)
      3. Cleanup: alte Items (> KEEP_DAYS) loeschen

    Returns Statistik-Dict (per-source counts + total inserted/skipped).
    """
    now = datetime.now(UTC)
    stats: dict[str, Any] = {"fetched_at": now.isoformat(), "sources": {}}
    total_inserted = 0
    total_skipped = 0

    for source in FEED_SOURCES:
        items = _fetch_one_source(source)
        inserted = 0
        skipped = 0
        for item_data in items:
            # Dedup-Check via link
            existing = db.scalar(select(NewsItem.id).where(NewsItem.link == item_data["link"]))
            if existing is not None:
                skipped += 1
                continue
            # QA-Fix Welle B: SAVEPOINT statt naive try/rollback.
            # Bei IntegrityError (Race) wuerde db.rollback() ALLE bisher
            # geflushten Items derselben Iteration wegrollen — wir verlieren
            # alles bis zum Crash-Item. Mit nested-Transaction (SAVEPOINT)
            # rollt nur das eine kaputte Item zurueck, alle vorherigen
            # bleiben staged fuer den finalen commit().
            try:
                with db.begin_nested():
                    db.add(NewsItem(**item_data, fetched_at=now))
                inserted += 1
            except IntegrityError:
                skipped += 1
        stats["sources"][source.source_id] = {
            "label": source.label,
            "fetched": len(items),
            "inserted": inserted,
            "skipped": skipped,
        }
        total_inserted += inserted
        total_skipped += skipped

    # Cleanup alte Items. NB: published_at IS NULL bleibt erhalten —
    # SQL `NULL < cutoff` ist NULL = falsy, also passt das Filter sie nicht.
    # Wir behalten NULL-Items absichtlich (Edge-Case bei kaputten RSS-Items
    # ohne Datum; selten, lieber stehen lassen als verlieren).
    cutoff = now - timedelta(days=KEEP_DAYS)
    deleted_count = 0
    try:
        from sqlalchemy import delete as sa_delete

        result = db.execute(sa_delete(NewsItem).where(NewsItem.published_at < cutoff))
        deleted_count = result.rowcount or 0
    except Exception as e:  # noqa: BLE001
        logger.warning("News cleanup failed: %s", e)

    db.commit()

    stats["totals"] = {
        "inserted": total_inserted,
        "skipped": total_skipped,
        "deleted_old": deleted_count,
    }
    return stats


def get_latest(db: OrmSession, limit: int = 10) -> list[NewsItem]:
    """Sortiert nach published_at DESC (Fallback: fetched_at DESC)."""
    stmt = (
        select(NewsItem)
        .order_by(
            NewsItem.published_at.desc().nullslast(),
            NewsItem.fetched_at.desc(),
        )
        .limit(limit)
    )
    return list(db.scalars(stmt).all())

"""News-Feed-Konfiguration (Phase W.news).

Liste der RSS-/Atom-Feeds, die der News-Aggregator abklopfen soll.
Bewusst kurz gehalten: lieber wenige hochwertige Quellen als viele.

Erweiterung: einfach Eintrag hinzufuegen. `source_id` ist der interne
Stable-Key (auch in DB), `label` ist user-sichtbar.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FeedSource:
    source_id: str  # Stable-Key, in DB-Spalte `source` persistiert
    label: str  # User-sichtbar in der UI
    url: str  # RSS/Atom-Feed-URL
    # Max wie viele Items pro Fetch von dieser Source uebernommen werden
    # sollen (Schutz gegen schreierische Feeds). r/Cubers haut viel raus,
    # WCA Posts wenige aber relevante.
    per_fetch_limit: int = 15


FEED_SOURCES: list[FeedSource] = [
    FeedSource(
        source_id="wca",
        label="WCA",
        url="https://www.worldcubeassociation.org/posts.rss",
        per_fetch_limit=10,
    ),
    FeedSource(
        source_id="reddit_cubers",
        label="r/Cubers",
        url="https://www.reddit.com/r/Cubers/.rss",
        per_fetch_limit=15,
    ),
]

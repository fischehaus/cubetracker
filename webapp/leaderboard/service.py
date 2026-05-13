"""Leaderboard-Service (Phase W.10) — Vergleich zwischen mir + accepted-Friends.

Pure-Funktionen + DB-Helper. Berechnungen nutzen stats/calc.py (compute_stats
auf SolvePoint-Listen). Cross-User-Queries sind hier auf accepted-Friend-IDs
beschraenkt — die Berechnung passiert in Python, die DB liefert nur die
Rohdaten gefiltert auf erlaubte User.

Privacy:
- Email wird NIE ausgeliefert (Leaderboard zeigt Display-Name only).
- Display-Name-Fallback `User #ID` fuer User ohne Name.
- Nur accepted-Friendships zaehlen — pending/none-Friends bleiben unsichtbar.
- Self wird explizit per is_me=True markiert (nicht in friend-Set gemixt).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session as OrmSession

from db.models import Friendship, Solve, User
from stats.calc import SolvePoint, compute_stats


@dataclass
class LeaderboardRow:
    """Eine Zeile in der Bestenliste."""

    user_id: int
    display_name: str  # mit Fallback "User #ID"
    is_me: bool
    cube_type: str
    solve_count_total: int
    solve_count_30d: int
    best_ms: int | None
    best_ao5: int | None
    best_ao12: int | None
    current_ao5: int | None
    current_ao12: int | None
    last_solve_at: datetime | None


def _accepted_friend_ids(db: OrmSession, current_user: User) -> list[int]:
    """IDs aller User mit denen current_user accepted-friends ist."""
    rows = db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.target_id == current_user.id,
            ),
        )
    ).scalars().all()
    return [
        fs.target_id if fs.requester_id == current_user.id else fs.requester_id
        for fs in rows
    ]


def list_cube_types(db: OrmSession, current_user: User) -> list[str]:
    """Welche Cube-Types haben current_user + seine accepted-Friends in
    Benutzung? Liste fuer den Cube-Type-Picker im Frontend.

    Sortiert nach Solve-Volumen (haeufigste oben) damit der Default-Cube
    fuer den User sinnvoll ist.
    """
    friend_ids = _accepted_friend_ids(db, current_user)
    all_ids = [current_user.id, *friend_ids]
    # Vereinigung Cube-Types ueber alle relevanten User. GROUP BY mit count
    # damit wir nach Haeufigkeit sortieren koennen.
    from sqlalchemy import func

    rows = db.execute(
        select(Solve.cube_type, func.count(Solve.id).label("n"))
        .where(Solve.user_id.in_(all_ids))
        .group_by(Solve.cube_type)
        .order_by(func.count(Solve.id).desc())
    ).all()
    return [r[0] for r in rows]


def build_leaderboard(
    db: OrmSession, current_user: User, cube_type: str
) -> list[LeaderboardRow]:
    """Vergleichs-Tabelle fuer einen Cube-Type.

    Datenfluss:
    1. accepted-Friend-IDs + Self-ID sammeln
    2. EINE Query: alle nicht-DNF/auch-DNF-Solves dieser User fuer cube_type,
       geordnet nach (user_id, timestamp asc) — Stats brauchen chronologisch
    3. In Python pro user_id gruppieren, SolvePoint-Liste bauen
    4. compute_stats() auf jede Liste, daraus LeaderboardRow

    Performance: bei 8 Friends * je 1000 solves * 7 cube_types = ~7000 rows
    pro Query. Akzeptabel bis ~10k Solves pro User. Wenn das mal sprengt
    -> Pre-aggregation in Materialized View.

    Reihenfolge der Rows:
    - Self immer ZUERST (du willst dich selbst oben sehen)
    - Danach Friends sortiert nach best_ms ASC, None ans Ende
    """
    friend_ids = _accepted_friend_ids(db, current_user)
    all_ids = [current_user.id, *friend_ids]

    # Display-Names + Self-Flag-Map vorbereiten
    user_map: dict[int, User] = {
        u.id: u for u in db.execute(select(User).where(User.id.in_(all_ids))).scalars()
    }

    # Solves laden — wir brauchen ALLE (auch DNF), compute_stats trennt selbst
    solves_rows = db.execute(
        select(Solve)
        .where(Solve.user_id.in_(all_ids))
        .where(Solve.cube_type == cube_type)
        .order_by(Solve.user_id, Solve.timestamp.asc())
    ).scalars().all()

    # Gruppen nach user_id
    by_user: dict[int, list[Solve]] = defaultdict(list)
    for s in solves_rows:
        by_user[s.user_id].append(s)

    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

    rows: list[LeaderboardRow] = []
    for uid in all_ids:
        user = user_map.get(uid)
        if user is None:
            continue
        user_solves = by_user.get(uid, [])
        points = [
            SolvePoint(
                time_ms=s.time_ms,
                dnf=bool(s.dnf),
                plus_two=bool(s.plus_two),
                solve_id=s.id,
            )
            for s in user_solves
        ]
        stats = compute_stats(points)
        # QA-Fix M4: defensiv TZ-awareness sicherstellen — falls Solves mal
        # mit naive timestamp angelegt wurden (z.B. alter csTimer-Import-
        # Pfad), wuerde der >=-Vergleich gegen tz-aware thirty_days_ago
        # einen TypeError werfen und den ganzen Endpoint killen.
        def _aware(ts: datetime | None) -> datetime | None:
            if ts is None:
                return None
            return ts if ts.tzinfo is not None else ts.replace(tzinfo=UTC)

        aware_times = [t for t in (_aware(s.timestamp) for s in user_solves) if t is not None]
        last_at = max(aware_times, default=None)
        count_30d = sum(1 for t in aware_times if t >= thirty_days_ago)
        rows.append(
            LeaderboardRow(
                user_id=uid,
                display_name=user.display_name or f"User #{uid}",
                is_me=(uid == current_user.id),
                cube_type=cube_type,
                solve_count_total=len(user_solves),
                solve_count_30d=count_30d,
                best_ms=stats.best_ms,
                best_ao5=stats.best_ao5,
                best_ao12=stats.best_ao12,
                current_ao5=stats.current_ao5,
                current_ao12=stats.current_ao12,
                last_solve_at=last_at,
            )
        )

    # Sortierung: Self oben, dann Friends nach best_ms ASC (None = Ende)
    def sort_key(r: LeaderboardRow) -> tuple[int, float]:
        # Tier 0 = self, Tier 1 = friends
        tier = 0 if r.is_me else 1
        # None best_ms -> ans Ende des friend-Blocks
        best = float("inf") if r.best_ms is None else float(r.best_ms)
        return (tier, best)

    rows.sort(key=sort_key)
    return rows

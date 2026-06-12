"""Achievement-Snapshot-Semantik (achievements/service.py:_build_snapshot).

Pinnt das IST-Verhalten fest, BEVOR die beiden Voll-Scans im Snapshot
(best_per_cube + Pattern-Chrono-Load) auf SQL-Aggregate bzw. Tupel-Queries
umgebaut werden (W.solve-hotpath, App-Analyse Welle B #6).

Wir testen bewusst die private Funktion direkt — sie ist die Naht, an der
der Umbau passiert; die API-Schicht drumherum bleibt unangetastet.
"""

from __future__ import annotations

from datetime import UTC, datetime

from achievements.service import _build_snapshot
from db.models import Solve


def _add_solve(
    db_session,
    user_id: int,
    time_ms: int,
    cube_type: str = "3x3",
    *,
    dnf: bool = False,
    plus_two: bool = False,
    ts: datetime | None = None,
) -> None:
    db_session.add(
        Solve(
            user_id=user_id,
            time_ms=time_ms,
            cube_type=cube_type,
            dnf=dnf,
            plus_two=plus_two,
            timestamp=ts or datetime(2026, 6, 1, 10, 0, tzinfo=UTC),
        )
    )


def test_snapshot_counts_and_best_per_cube(db_session, make_user) -> None:
    user, _ = make_user()

    # 3x3: 12.0s sauber · 11.0s mit +2 (effektiv 13.0s) · 9.5s DNF.
    # 4x4: 45.0s sauber.
    _add_solve(db_session, user.id, 12000)
    _add_solve(db_session, user.id, 11000, plus_two=True)
    _add_solve(db_session, user.id, 9500, dnf=True)
    _add_solve(db_session, user.id, 45000, cube_type="4x4")
    db_session.commit()

    snap = _build_snapshot(db_session, user.id)

    assert snap.total_solves == 4
    assert snap.total_valid_solves == 3  # DNF zählt nicht als valid
    assert snap.solves_per_cube == {"3x3": 2, "4x4": 1}  # nur valide

    # best_per_cube: +2 zählt (11000+2000=13000 > 12000), DNF fliegt raus —
    # obwohl 9500 die schnellste Roh-Zeit wäre.
    assert snap.best_ms_per_cube == {"3x3": 12000, "4x4": 45000}

    # distinct_cube_types zählt über ALLE Solves (auch DNF).
    assert snap.distinct_cube_types == 2


def test_snapshot_day_aggregates_and_streak(db_session, make_user) -> None:
    user, _ = make_user()

    # Tag 1: zwei valide 3x3 + ein DNF (zählt nicht in day_rows).
    d1 = datetime(2026, 6, 1, 9, 0, tzinfo=UTC)
    _add_solve(db_session, user.id, 12000, ts=d1)
    _add_solve(db_session, user.id, 13000, ts=d1.replace(hour=11))
    _add_solve(db_session, user.id, 9000, dnf=True, ts=d1.replace(hour=12))
    # Tag 2: ein valider 4x4.
    d2 = datetime(2026, 6, 2, 9, 0, tzinfo=UTC)
    _add_solve(db_session, user.id, 45000, cube_type="4x4", ts=d2)
    # Tag 4 (Lücke!): wieder 3x3 → Streak bricht bei 2.
    d4 = datetime(2026, 6, 4, 9, 0, tzinfo=UTC)
    _add_solve(db_session, user.id, 14000, ts=d4)
    db_session.commit()

    snap = _build_snapshot(db_session, user.id)

    assert snap.max_solves_one_day_per_cube == {"3x3": 2, "4x4": 1}
    assert snap.max_solves_one_day_any == 2  # Tag 1: zwei valide
    assert snap.max_solve_streak_days == 2  # Tag 1+2, Lücke vor Tag 4

    # Pattern-Flags: bei diesem Mini-Datensatz alle False — wichtig ist,
    # dass der Chrono-Pfad ohne Fehler durchläuft (auch für DNF-Solves).
    assert snap.had_pb_double is False
    assert snap.had_5_consecutive_under_ao12 is False

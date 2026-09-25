"""Daily-Challenge-Snapshot + Generator (Roadmap #47, W.challenge-plausible-pb).

Bug: Die Speed-Challenge verlangte „unter 0,01 s", weil die PB aus einem
unplausibel kurzen Solve (Fehlauslösung/Import-Artefakt) stammte.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from challenges.generator import MIN_PLAUSIBLE_MS, generate_daily_challenges
from challenges.service import (
    _build_generator_snapshot,
    _today_start_naive_utc,
    update_today_progress_for_solve,
)
from db.models import Challenge, Solve


def _add(db, user_id: int, time_ms: int, cube: str = "3x3", **kw) -> None:
    db.add(
        Solve(
            user_id=user_id,
            time_ms=time_ms,
            cube_type=cube,
            timestamp=datetime.now(UTC) - timedelta(hours=1),
            **kw,
        )
    )


def _speed(snap):
    return next(c for c in generate_daily_challenges(snap) if c.kind == "speed")


def test_implausible_solve_is_ignored_for_speed_target(db_session, make_user) -> None:
    user, _ = make_user()
    _add(db_session, user.id, 9)  # Fehlauslösung → vorher Ziel „unter 0,01 s"
    for ms in (12_000, 13_500, 15_000):
        _add(db_session, user.id, ms)
    db_session.commit()

    snap = _build_generator_snapshot(db_session, user.id)
    assert snap.best_ms_per_cube["3x3"] == 12_000
    assert _speed(snap).target_value == int(12_000 * 1.05)


def test_plausible_fast_solve_still_counts(db_session, make_user) -> None:
    user, _ = make_user()
    _add(db_session, user.id, MIN_PLAUSIBLE_MS, cube="2x2")  # Grenzwert zählt
    _add(db_session, user.id, 2_500, cube="2x2")
    db_session.commit()

    snap = _build_generator_snapshot(db_session, user.id)
    assert snap.best_ms_per_cube["2x2"] == MIN_PLAUSIBLE_MS


def test_only_implausible_solves_yield_no_speed_challenge(db_session, make_user) -> None:
    user, _ = make_user()
    _add(db_session, user.id, 5)
    _add(db_session, user.id, 0)
    db_session.commit()

    snap = _build_generator_snapshot(db_session, user.id)
    assert "3x3" not in snap.best_ms_per_cube
    assert all(c.kind != "speed" for c in generate_daily_challenges(snap))


def _speed_challenge_today(db, user_id: int, target_ms: int) -> Challenge:
    ch = Challenge(
        user_id=user_id,
        kind="speed",
        cube_type="3x3",
        target_value=target_ms,
        progress=0,
        generated_for_date=_today_start_naive_utc(),
    )
    db.add(ch)
    db.commit()
    return ch


def test_implausible_solve_does_not_complete_speed_challenge(db_session, make_user) -> None:
    user, _ = make_user()
    ch = _speed_challenge_today(db_session, user.id, 12_600)
    tip = Solve(user_id=user.id, time_ms=5, cube_type="3x3", timestamp=datetime.now(UTC))
    db_session.add(tip)
    db_session.commit()

    assert update_today_progress_for_solve(db_session, user.id, tip) == []
    db_session.refresh(ch)
    assert ch.completed_at is None


def test_plausible_solve_completes_speed_challenge(db_session, make_user) -> None:
    user, _ = make_user()
    ch = _speed_challenge_today(db_session, user.id, 12_600)
    real = Solve(user_id=user.id, time_ms=11_000, cube_type="3x3", timestamp=datetime.now(UTC))
    db_session.add(real)
    db_session.commit()

    assert update_today_progress_for_solve(db_session, user.id, real) == [ch.id]

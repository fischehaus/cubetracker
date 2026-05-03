"""Pure-Function Tests fuer Daily Challenges (Phase 7b)."""

from __future__ import annotations

from challenges.generator import GeneratorInput, generate_daily_challenges
from challenges.tracker import ChallengeState, SolveSnapshot, update_progress_for_solve

# ============================================================
# Generator
# ============================================================


def make_snap(**kwargs) -> GeneratorInput:
    defaults = {
        "avg_solves_per_active_day": 30,
        "most_active_cube": "3x3",
        "best_ms_per_cube": {"3x3": 8000},
        "cubes_unused_for_days": {},
        "distinct_cubes_total": 5,
    }
    defaults.update(kwargs)
    return GeneratorInput(**defaults)


def test_generator_produces_volume_challenge_always():
    challenges = generate_daily_challenges(make_snap())
    assert any(c.kind == "volume" for c in challenges)


def test_volume_target_uses_active_day_avg():
    out = generate_daily_challenges(make_snap(avg_solves_per_active_day=47))
    vol = next(c for c in out if c.kind == "volume")
    assert vol.target_value == 47


def test_volume_target_min_10():
    """Auch bei 0 avg solves heute: mindestens 10 als target."""
    out = generate_daily_challenges(make_snap(avg_solves_per_active_day=0))
    vol = next(c for c in out if c.kind == "volume")
    assert vol.target_value == 10


def test_speed_challenge_uses_pb_factor():
    """Target = PB * 1.05."""
    out = generate_daily_challenges(make_snap(best_ms_per_cube={"3x3": 10_000}))
    speed = next(c for c in out if c.kind == "speed")
    assert speed.target_value == 10_500
    assert speed.cube_type == "3x3"


def test_speed_skipped_if_no_pb():
    out = generate_daily_challenges(make_snap(most_active_cube="3x3", best_ms_per_cube={}))
    assert not any(c.kind == "speed" for c in out)


def test_comeback_picks_unused_cube():
    out = generate_daily_challenges(make_snap(cubes_unused_for_days={"Megaminx": 14, "7x7": 30}))
    comeback = next(c for c in out if c.kind == "comeback")
    assert comeback.cube_type in {"Megaminx", "7x7"}
    assert comeback.target_value == 1


def test_comeback_ignores_recent_cubes():
    """Cubes die <7 tage nicht genutzt wurden zaehlen NICHT als comeback-kandidaten."""
    out = generate_daily_challenges(make_snap(cubes_unused_for_days={"Megaminx": 3, "7x7": 5}))
    # Beide unter Schwelle → kein comeback-challenge
    # (aber diversity als fallback weil distinct=5 >=3)
    assert not any(c.kind == "comeback" for c in out)
    assert any(c.kind == "diversity" for c in out)


def test_diversity_fallback_when_no_comeback_and_enough_cubes():
    out = generate_daily_challenges(make_snap(cubes_unused_for_days={}, distinct_cubes_total=5))
    assert any(c.kind == "diversity" for c in out)


def test_realistic_user_3_challenges():
    """Realistischer User: bekommt drei Challenges."""
    out = generate_daily_challenges(
        make_snap(
            avg_solves_per_active_day=47,
            most_active_cube="3x3",
            best_ms_per_cube={"3x3": 7850},
            cubes_unused_for_days={"Megaminx": 21},
            distinct_cubes_total=13,
        )
    )
    kinds = [c.kind for c in out]
    assert "volume" in kinds
    assert "speed" in kinds
    assert "comeback" in kinds
    assert len(out) == 3


# ============================================================
# Tracker
# ============================================================


def make_state(**kwargs) -> ChallengeState:
    defaults = {
        "kind": "volume",
        "cube_type": None,
        "target_value": 30,
        "progress": 0,
        "is_completed": False,
    }
    defaults.update(kwargs)
    return ChallengeState(**defaults)


def make_solve(
    cube_type: str = "3x3",
    time_ms: int = 10000,
    plus_two: bool = False,
    dnf: bool = False,
) -> SolveSnapshot:
    return SolveSnapshot(cube_type=cube_type, time_ms=time_ms, plus_two=plus_two, dnf=dnf)


def test_tracker_volume_any_cube_increments():
    out = update_progress_for_solve(make_state(), make_solve())
    assert out == 1


def test_tracker_volume_dnf_does_not_count():
    out = update_progress_for_solve(make_state(), make_solve(dnf=True))
    assert out == 0


def test_tracker_volume_specific_cube_only_counts_that_cube():
    state = make_state(cube_type="3x3")
    assert update_progress_for_solve(state, make_solve("3x3")) == 1
    assert update_progress_for_solve(state, make_solve("4x4")) == 0


def test_tracker_speed_below_target_unlocks():
    state = make_state(kind="speed", cube_type="3x3", target_value=10_000)
    assert update_progress_for_solve(state, make_solve("3x3", time_ms=9_500)) == 1


def test_tracker_speed_at_target_does_not_unlock():
    """Strikt < target, also exact target_ms reicht nicht."""
    state = make_state(kind="speed", cube_type="3x3", target_value=10_000)
    assert update_progress_for_solve(state, make_solve("3x3", time_ms=10_000)) == 0


def test_tracker_speed_plus_two_counts():
    """Effective_ms (mit +2) zaehlt fuer den vergleich."""
    state = make_state(kind="speed", cube_type="3x3", target_value=12_000)
    # 9.5s + 2 = 11.5s effective → unter 12s → erreicht
    assert update_progress_for_solve(state, make_solve("3x3", time_ms=9_500, plus_two=True)) == 1


def test_tracker_comeback_one_solve_unlocks():
    state = make_state(kind="comeback", cube_type="Megaminx", target_value=1)
    assert update_progress_for_solve(state, make_solve("Megaminx")) == 1


def test_tracker_comeback_other_cube_no_progress():
    state = make_state(kind="comeback", cube_type="Megaminx", target_value=1)
    assert update_progress_for_solve(state, make_solve("3x3")) == 0


def test_tracker_completed_challenge_stays_completed():
    """Monotonic: wenn schon completed, bleibt's auch wenn solve eigentlich
    progress zurueckziehen wuerde."""
    state = make_state(progress=30, is_completed=True)
    assert update_progress_for_solve(state, make_solve()) == 30  # unveraendert

"""Pure-Function Tests fuer Achievement-check (Phase 7a)."""

from __future__ import annotations

from achievements.check import AchievementInput, check_achievements


def make_input(**kwargs) -> AchievementInput:
    """Helper: AchievementInput mit Defaults."""
    defaults = {
        "total_solves": 0,
        "total_valid_solves": 0,
        "solves_per_cube": {},
        "best_ms_per_cube": {},
        "distinct_cube_types": 0,
        "hardware_count": 0,
    }
    defaults.update(kwargs)
    return AchievementInput(**defaults)


def test_empty_user_no_achievements():
    assert check_achievements(make_input()) == []


def test_volume_100_at_threshold():
    assert "volume_100" in check_achievements(make_input(total_valid_solves=100))


def test_volume_100_just_below():
    assert "volume_100" not in check_achievements(make_input(total_valid_solves=99))


def test_volume_uses_valid_count_not_total():
    """100 solves davon 50 DNF: NICHT unlocked (nur 50 valid)."""
    out = check_achievements(make_input(total_solves=100, total_valid_solves=50))
    assert "volume_100" not in out


def test_all_volume_thresholds_at_10k():
    out = check_achievements(make_input(total_valid_solves=10_000))
    assert "volume_100" in out
    assert "volume_500" in out
    assert "volume_1000" in out
    assert "volume_5000" in out
    assert "volume_10000" in out


def test_cube_3x3_specific():
    out = check_achievements(make_input(solves_per_cube={"3x3": 600}))
    assert "cube_3x3_100" in out
    assert "cube_3x3_500" in out
    assert "cube_3x3_1000" not in out


def test_cube_any_skips_3x3():
    """500 4x4-solves triggert cube_any_500 aber NICHT cube_3x3_500."""
    out = check_achievements(make_input(solves_per_cube={"4x4": 500}))
    assert "cube_any_500" in out
    assert "cube_3x3_500" not in out


def test_speed_3x3_pb_sub_10():
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 9_500}))
    assert "pb_3x3_sub_15" in out
    assert "pb_3x3_sub_12" in out
    assert "pb_3x3_sub_10" in out
    assert "pb_3x3_sub_8" not in out


def test_speed_3x3_at_15s_exactly_not_unlocked():
    """Strikt < 15 sec, nicht <=. PB von genau 15.00s zaehlt nicht."""
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 15_000}))
    assert "pb_3x3_sub_15" not in out


def test_variety():
    assert "variety_5" in check_achievements(make_input(distinct_cube_types=5))
    assert "variety_10" not in check_achievements(make_input(distinct_cube_types=5))
    assert "variety_10" in check_achievements(make_input(distinct_cube_types=10))


def test_hardware():
    assert "hardware_first" in check_achievements(make_input(hardware_count=1))
    assert "hardware_5" not in check_achievements(make_input(hardware_count=4))
    assert "hardware_5" in check_achievements(make_input(hardware_count=5))


def test_realistic_user_profile():
    """Realer Stand: 6202 solves, 3x3 PB 7.85s, 13 cubes, 10 hardware."""
    out = check_achievements(
        make_input(
            total_valid_solves=6200,
            solves_per_cube={"3x3": 1818, "2x2": 1505, "Skewb": 741, "Pyraminx": 629},
            best_ms_per_cube={"3x3": 7850, "2x2": 670},
            distinct_cube_types=13,
            hardware_count=10,
        )
    )
    # erwartet: alle volume bis 5000, 3x3 bis 1000, any bis 1000,
    # alle PB-3x3 bis sub-8, beide variety, beide hardware
    expected = {
        "volume_100",
        "volume_500",
        "volume_1000",
        "volume_5000",
        "cube_3x3_100",
        "cube_3x3_500",
        "cube_3x3_1000",
        "cube_any_500",
        "cube_any_1000",
        "pb_3x3_sub_15",
        "pb_3x3_sub_12",
        "pb_3x3_sub_10",
        "pb_3x3_sub_8",
        "variety_5",
        "variety_10",
        "hardware_first",
        "hardware_5",
    }
    assert set(out) == expected
    # NICHT unlocked: volume_10000 (nur 6200)
    assert "volume_10000" not in out

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
        # Phase 8.5: alle PB-Schwellen die ein 7.85s-Single trifft
        "pb_3x3_sub_30",
        "pb_3x3_sub_22_95",
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
    # NICHT unlocked: volume_10000 (nur 6200), Hex-Master (7.85 > 6.66)
    assert "volume_10000" not in out
    assert "pb_3x3_sub_6_66" not in out


# ============================================================
# Phase 8.5: Tages-Volume + Streaks + neue Speed-Schwellen
# ============================================================


def test_volume_day_per_event_locked_when_max_under_100():
    out = check_achievements(make_input(max_solves_one_day_per_cube={"3x3": 99}))
    assert "volume_day_3x3_100" not in out


def test_volume_day_per_event_unlocked_at_100():
    out = check_achievements(make_input(max_solves_one_day_per_cube={"3x3": 100}))
    assert "volume_day_3x3_100" in out


def test_volume_day_per_event_for_each_event():
    out = check_achievements(
        make_input(
            max_solves_one_day_per_cube={
                "2x2": 100,
                "4x4": 100,
                "5x5": 100,
                "OH": 100,
            }
        )
    )
    assert "volume_day_2x2_100" in out
    assert "volume_day_4x4_100" in out
    assert "volume_day_5x5_100" in out
    assert "volume_day_oh_100" in out


def test_marathon_day_unlocked_at_200():
    assert "volume_day_any_200" not in check_achievements(make_input(max_solves_one_day_any=199))
    assert "volume_day_any_200" in check_achievements(make_input(max_solves_one_day_any=200))


def test_week_3x3_discipline_unlocked_at_7_consecutive():
    assert "volume_week_3x3_100daily" not in check_achievements(
        make_input(max_consecutive_days_3x3_100plus=6)
    )
    assert "volume_week_3x3_100daily" in check_achievements(
        make_input(max_consecutive_days_3x3_100plus=7)
    )


def test_solve_streaks():
    assert "streak_solve_7" not in check_achievements(make_input(max_solve_streak_days=6))
    assert "streak_solve_7" in check_achievements(make_input(max_solve_streak_days=7))
    assert "streak_solve_30" in check_achievements(make_input(max_solve_streak_days=30))
    assert "streak_solve_100" in check_achievements(make_input(max_solve_streak_days=100))
    assert "streak_solve_100" not in check_achievements(make_input(max_solve_streak_days=99))


def test_speed_3x3_sub_30_22_95_6_66():
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 29_999}))
    assert "pb_3x3_sub_30" in out
    assert "pb_3x3_sub_22_95" not in out
    assert "pb_3x3_sub_6_66" not in out

    out = check_achievements(make_input(best_ms_per_cube={"3x3": 22_949}))
    assert "pb_3x3_sub_22_95" in out

    out = check_achievements(make_input(best_ms_per_cube={"3x3": 6_659}))
    assert "pb_3x3_sub_6_66" in out


def test_speed_pb_sanity_floor_blocks_degenerate_zero_ms():
    """Phase 8.5 fix: ein 3x3-Solve mit time_ms=0 (Daten-Edge-Case)
    darf KEINE Speed-Schwellen triggern. Floor = 1000ms.
    """
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 0}))
    assert "pb_3x3_sub_6_66" not in out
    assert "pb_3x3_sub_8" not in out
    assert "pb_3x3_sub_10" not in out
    assert "pb_3x3_sub_30" not in out

    # Solve unter Floor (z.B. 500ms) ebenfalls geblockt
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 500}))
    assert all(c not in out for c in ["pb_3x3_sub_6_66", "pb_3x3_sub_8", "pb_3x3_sub_30"])

    # Knapp ueber Floor (1.5s) → alle zutreffenden Schwellen freigeschaltet
    out = check_achievements(make_input(best_ms_per_cube={"3x3": 1_500}))
    assert "pb_3x3_sub_30" in out
    assert "pb_3x3_sub_6_66" in out

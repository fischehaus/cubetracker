"""Test fuer _longest_consecutive_day_streak (Phase 8.5)."""

from __future__ import annotations

from achievements.service import _longest_consecutive_day_streak


def test_empty_returns_zero():
    assert _longest_consecutive_day_streak(set()) == 0


def test_single_day_returns_1():
    assert _longest_consecutive_day_streak({"2026-01-01"}) == 1


def test_three_consecutive_days():
    assert _longest_consecutive_day_streak({"2026-01-01", "2026-01-02", "2026-01-03"}) == 3


def test_gap_breaks_streak():
    """3 + 2 mit gap → laengste = 3."""
    days = {"2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05", "2026-01-06"}
    assert _longest_consecutive_day_streak(days) == 3


def test_unsorted_input_works():
    days = {"2026-01-03", "2026-01-01", "2026-01-02"}
    assert _longest_consecutive_day_streak(days) == 3


def test_month_boundary():
    """2026-01-31 + 2026-02-01 = 2 consecutive days."""
    assert _longest_consecutive_day_streak({"2026-01-31", "2026-02-01"}) == 2


def test_year_boundary():
    """2026-12-31 + 2027-01-01 = 2 consecutive days."""
    assert _longest_consecutive_day_streak({"2026-12-31", "2027-01-01"}) == 2

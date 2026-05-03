"""Tests fuer PB-Pattern-Detection (Phase 8.5.1)."""

from __future__ import annotations

import math
from datetime import date, timedelta

from achievements.patterns import (
    ChronoSolve,
    PatternResult,
    detect_patterns,
    merge_patterns,
)


def _mk(time_ms: int, day: date, dnf: bool = False, plus_two: bool = False) -> ChronoSolve:
    eff = math.inf if dnf else float(time_ms + (2000 if plus_two else 0))
    return ChronoSolve(
        day=day,
        effective_ms=eff,
        dnf=dnf,
        plus_two=plus_two,
        time_ms=time_ms,
    )


D = date(2026, 1, 1)


def test_empty_no_patterns():
    r = detect_patterns([])
    assert r.had_pb_double is False
    assert r.had_pb_synchronized is False
    assert r.had_pb_triple_day is False
    assert r.had_5_consecutive_under_ao12 is False


def test_single_solve_no_patterns():
    r = detect_patterns([_mk(10000, D)])
    assert r == PatternResult(False, False, False, False)


def test_pb_double_two_consecutive_pbs():
    """Solves: 12s, 11s, 10s — solve 2 ist erster PB (verbessert 12),
    solve 3 ist 2. PB in Folge (verbessert 11). Doppel-PB.
    """
    solves = [_mk(12000, D), _mk(11000, D), _mk(10000, D)]
    r = detect_patterns(solves)
    assert r.had_pb_double is True


def test_pb_double_first_two_solves_dont_count():
    """Sequenz 14s, 12s — solve 1 setzt nur best_single, solve 2 ist
    erster echter PB. Aber kein „Doppel"."""
    solves = [_mk(14000, D), _mk(12000, D)]
    r = detect_patterns(solves)
    assert r.had_pb_double is False


def test_pb_double_with_gap_does_not_trigger():
    """Solves: 12s, 11s (PB), 13s (kein PB), 10s (PB) — isolierte PBs."""
    solves = [_mk(12000, D), _mk(11000, D), _mk(13000, D), _mk(10000, D)]
    r = detect_patterns(solves)
    assert r.had_pb_double is False


def test_pb_synchronized_single_and_ao5_same_solve():
    """5 Solves um 14s setzen baseline ao5. 7. Solve ist single-PB UND
    sein 5er-Window enthaelt 4 noch-schnellere Solves drumherum, sodass
    Trim-Mean drastisch sinkt → ao5-PB.
    """
    solves = [
        _mk(15000, D),  # baseline 5x ~15s
        _mk(15000, D),
        _mk(15000, D),
        _mk(15000, D),
        _mk(15000, D),  # ao5 baseline = 15000
        _mk(8000, D),  # window: 15,15,15,15,8 → trim → mean(15,15,15)=15000 — KEIN ao5-pb
        _mk(8000, D),  # window: 15,15,15,8,8 → trim → mean(8,15,15)=12667 — ao5-PB
        _mk(7000, D),  # window: 15,15,8,8,7 → trim → mean(8,8,15)=10333 — ao5-PB UND single-PB!
    ]
    r = detect_patterns(solves)
    assert r.had_pb_synchronized is True


def test_pb_triple_day_all_three_one_day():
    """Genug Solves dass alle 3 PB-Typen am selben Tag erstmals gesetzt
    werden — alle 12 Solves an Tag D, dann reicht der 12. fuer ao12-PB."""
    # 12 absteigende Solves: jeder bringt single-PB + (ab Solve 5) ao5-PB
    # + (Solve 12) ao12-PB
    solves = [_mk(20000 - i * 500, D) for i in range(12)]
    r = detect_patterns(solves)
    assert r.had_pb_triple_day is True


def test_pb_triple_day_split_across_days_does_not_count():
    """Single-PB an Tag 1, ao5-PB an Tag 2, ao12-PB an Tag 3 — kein
    Triple-Day weil verteilt."""
    d1, d2, d3 = D, D + timedelta(days=1), D + timedelta(days=2)
    solves = [
        _mk(10000, d1),  # single-PB an d1
        _mk(11000, d1),
        _mk(11500, d1),
        _mk(12000, d1),
        _mk(11200, d2),  # nach 5 solves — ao5-PB an d2
        _mk(11000, d2),
        _mk(11000, d2),
        _mk(11000, d2),
        _mk(11000, d2),
        _mk(11000, d2),
        _mk(11000, d2),
        _mk(11000, d3),  # nach 12 solves — ao12-PB an d3
    ]
    r = detect_patterns(solves)
    # Triple-day darf NICHT True sein — kein einzelner Tag hatte alle 3
    assert r.had_pb_triple_day is False


def test_consistency_5_in_a_row_under_ao12():
    """12 normale Solves um 12s, dann 5 deutlich-bessere Solves alle
    unter dem (aus den 12 vorigen berechneten) Ao12.
    """
    solves = [_mk(12000 + (i % 3) * 100, D) for i in range(12)]  # 12 baseline
    # Ao12 dieser 12 ist ~ 12100ms (trim 1, mean of 10 mit 12000-12200)
    # Jetzt 5 Solves bei 8000ms — alle deutlich unter ao12
    solves.extend([_mk(8000, D + timedelta(days=1)) for _ in range(5)])
    r = detect_patterns(solves)
    assert r.had_5_consecutive_under_ao12 is True


def test_consistency_4_in_a_row_not_enough():
    solves = [_mk(12000 + (i % 3) * 100, D) for i in range(12)]
    solves.extend([_mk(8000, D + timedelta(days=1)) for _ in range(4)])
    r = detect_patterns(solves)
    assert r.had_5_consecutive_under_ao12 is False


def test_consistency_dnf_resets_streak():
    solves = [_mk(12000 + (i % 3) * 100, D) for i in range(12)]
    # 3 unter ao12, dann DNF, dann 2 unter ao12 → max-streak nur 3 oder 2
    solves.extend(
        [
            _mk(8000, D + timedelta(days=1)),
            _mk(8000, D + timedelta(days=1)),
            _mk(8000, D + timedelta(days=1)),
            _mk(0, D + timedelta(days=1), dnf=True),
            _mk(8000, D + timedelta(days=1)),
            _mk(8000, D + timedelta(days=1)),
        ]
    )
    r = detect_patterns(solves)
    assert r.had_5_consecutive_under_ao12 is False


def test_dnf_does_not_trigger_single_pb():
    """DNF mit time_ms=0 darf keinen Single-PB ausloesen."""
    solves = [_mk(0, D, dnf=True), _mk(0, D, dnf=True)]
    r = detect_patterns(solves)
    assert r.had_pb_double is False


def test_merge_patterns_or_aggregation():
    a = PatternResult(True, False, False, False)
    b = PatternResult(False, True, False, True)
    merged = merge_patterns([a, b])
    assert merged.had_pb_double is True
    assert merged.had_pb_synchronized is True
    assert merged.had_pb_triple_day is False
    assert merged.had_5_consecutive_under_ao12 is True


def test_merge_empty_list():
    merged = merge_patterns([])
    assert merged == PatternResult(False, False, False, False)

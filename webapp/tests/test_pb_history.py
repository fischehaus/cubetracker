"""Tests fuer die PB-Progression-Logik (W.pb-history).

Pure-function-Tests gegen stats.calc — keine DB, kein FastAPI noetig.
Erster Test im webapp/tests/-Ordner (vorher 0% Coverage, siehe Audit P6).
"""

from __future__ import annotations

from stats.calc import (
    SolvePoint,
    avg_pb_progression,
    compute_stats,
    pb_history,
    single_pb_progression,
)


def _sp(
    solve_id: int, time_ms: int, *, dnf: bool = False, plus_two: bool = False
) -> SolvePoint:
    return SolvePoint(time_ms=time_ms, dnf=dnf, plus_two=plus_two, solve_id=solve_id)


def test_single_pb_progression_basic() -> None:
    # 20 -> 18 -> 19 -> 17 -> 21 -> 16  => PB-Momente 20,18,17,16
    xs = [
        _sp(1, 20000),
        _sp(2, 18000),
        _sp(3, 19000),
        _sp(4, 17000),
        _sp(5, 21000),
        _sp(6, 16000),
    ]
    assert single_pb_progression(xs) == [(1, 20000), (2, 18000), (4, 17000), (6, 16000)]


def test_single_pb_skips_dnf_and_counts_plus_two() -> None:
    # DNF ignoriert; +2 zaehlt (14000+2000=16000 => kein PB nach 15000)
    ys = [
        _sp(1, 15000),
        _sp(2, 10000, dnf=True),
        _sp(3, 14000, plus_two=True),
        _sp(4, 13000),
    ]
    assert single_pb_progression(ys) == [(1, 15000), (4, 13000)]


def test_single_pb_tie_is_not_new_pb() -> None:
    # Gleichstand ist kein neuer PB (strikt <)
    xs = [_sp(1, 10000), _sp(2, 10000), _sp(3, 9000)]
    assert single_pb_progression(xs) == [(1, 10000), (3, 9000)]


def test_single_pb_empty() -> None:
    assert single_pb_progression([]) == []


def test_pb_solve_ids_in_compute_stats() -> None:
    xs = [
        _sp(1, 20000),
        _sp(2, 18000),
        _sp(3, 19000),
        _sp(4, 17000),
        _sp(5, 21000),
        _sp(6, 16000),
    ]
    assert compute_stats(xs).pb_solve_ids == [1, 2, 4, 6]
    assert compute_stats([]).pb_solve_ids == []


def test_avg_pb_progression_ao5() -> None:
    xs = [
        _sp(1, 20000),
        _sp(2, 18000),
        _sp(3, 19000),
        _sp(4, 17000),
        _sp(5, 21000),
        _sp(6, 16000),
    ]
    # Window1 (ids 1-5) trimmed-mean = 19000 (Anker id5);
    # Window2 (ids 2-6) trimmed-mean = 18000 (Anker id6)
    assert avg_pb_progression(xs, 5) == [(5, 19000), (6, 18000)]


def test_avg_pb_progression_too_few() -> None:
    xs = [_sp(1, 20000), _sp(2, 18000)]
    assert avg_pb_progression(xs, 5) == []


def test_pb_history_bundles_all_metrics() -> None:
    # streng fallend -> jede Solve ist ein neuer Single-PB
    xs = [_sp(i, 20000 - i * 100) for i in range(1, 13)]
    hist = pb_history(xs)
    assert len(hist.single) == 12
    assert len(hist.ao5) >= 1
    assert len(hist.ao12) == 1  # n=12 -> genau 1 ao12-Window

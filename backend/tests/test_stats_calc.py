"""Unit-Tests fuer stats/calc.py — pure Berechnungs-Logik (F5)."""

from __future__ import annotations

from stats.calc import (
    SolvePoint,
    average_of_n,
    best_average_window,
    compute_stats,
    trim_for_n,
)


def _sp(time_ms: int, dnf: bool = False, plus_two: bool = False, solve_id: int = 0) -> SolvePoint:
    """Helper: SolvePoint mit Defaults."""
    return SolvePoint(time_ms=time_ms, dnf=dnf, plus_two=plus_two, solve_id=solve_id)


# ============================================================
# trim_for_n
# ============================================================


def test_trim_for_n_small_returns_zero():
    assert trim_for_n(0) == 0
    assert trim_for_n(2) == 0


def test_trim_for_n_5_and_12():
    assert trim_for_n(5) == 1
    assert trim_for_n(12) == 1


def test_trim_for_n_25_floor_5pct():
    # 25 * 0.05 = 1.25 → floor = 1
    assert trim_for_n(25) == 1


def test_trim_for_n_100():
    # 100 * 0.05 = 5
    assert trim_for_n(100) == 5


# ============================================================
# average_of_n — WCA-Trimmed-Mean
# ============================================================


def test_avg5_basic_no_penalty():
    # Times: 10000, 11000, 12000, 13000, 14000 ms
    # Trim: 1 best (10000) + 1 worst (14000) → mean of (11000, 12000, 13000) = 12000
    solves = [_sp(t) for t in [10000, 11000, 12000, 13000, 14000]]
    assert average_of_n(solves) == 12000


def test_avg5_with_plus_two():
    # Times effective: 10000, 11000, 12000, 13000, 16000 (14000 + 2000 plus_two)
    # → trim 10000 + 16000 → mean of (11000, 12000, 13000) = 12000
    solves = [
        _sp(10000),
        _sp(11000),
        _sp(12000),
        _sp(13000),
        _sp(14000, plus_two=True),
    ]
    assert average_of_n(solves) == 12000


def test_avg5_with_one_dnf_works():
    # Eine DNF wird als worst getrimmt → Avg ist OK
    solves = [_sp(10000), _sp(11000), _sp(12000), _sp(13000), _sp(99000, dnf=True)]
    assert average_of_n(solves) == 12000  # mean of 11000, 12000, 13000 (10000 best raus)


def test_avg5_with_two_dnf_returns_dnf():
    # Zwei DNFs → eine wird getrimmt, die zweite bleibt im Mittel → Avg ist DNF
    solves = [_sp(10000), _sp(11000), _sp(12000), _sp(0, dnf=True), _sp(0, dnf=True)]
    assert average_of_n(solves) is None


def test_avg12_basic():
    # 12 Solves: 10..21k (1k Schritte). Trim 10000 + 21000 → mean of 11000..20000 = 15500
    solves = [_sp(10000 + i * 1000) for i in range(12)]
    assert average_of_n(solves) == 15500


def test_avg100_trim_5_each_side():
    # 100 Solves: 1k..100k. Trim 5 best + 5 worst → mean of 6k..95k
    solves = [_sp(1000 + i * 1000) for i in range(100)]
    expected = sum(range(6000, 96000, 1000)) // 90  # mean of 6000 bis 95000
    assert average_of_n(solves) == expected


def test_avg_too_few_returns_none():
    assert average_of_n([_sp(1000), _sp(2000)]) is None


# ============================================================
# best_average_window — Sliding-Window
# ============================================================


def test_best_ao5_finds_minimum_window():
    # 7 Solves, Avg5 fuer Fenster [0:5] und [1:6] und [2:7]
    # Wir bauen so, dass Fenster [2:7] den besten Avg hat
    solves = [
        _sp(20000),  # 0
        _sp(20000),  # 1
        _sp(10000),  # 2 — Start des besten Fensters
        _sp(11000),  # 3
        _sp(12000),  # 4
        _sp(13000),  # 5
        _sp(14000),  # 6 — Ende des besten Fensters
    ]
    # Fenster [2:7] = [10k, 11k, 12k, 13k, 14k] → Avg5 = 12000
    assert best_average_window(solves, 5) == 12000


def test_best_ao5_too_few_returns_none():
    solves = [_sp(10000), _sp(11000)]
    assert best_average_window(solves, 5) is None


# ============================================================
# compute_stats — Integration
# ============================================================


def test_compute_stats_empty():
    r = compute_stats([])
    assert r.count == 0
    assert r.best_ms is None
    assert r.current_ao5 is None


def test_compute_stats_basic_5_solves():
    solves = [
        _sp(10000, solve_id=1),
        _sp(11000, solve_id=2),
        _sp(12000, solve_id=3),
        _sp(13000, solve_id=4),
        _sp(14000, solve_id=5),
    ]
    r = compute_stats(solves)
    assert r.count == 5
    assert r.count_valid == 5
    assert r.count_dnf == 0
    assert r.best_ms == 10000
    assert r.best_solve_id == 1
    assert r.worst_ms == 14000
    assert r.worst_solve_id == 5
    assert r.mean_ms == 12000
    assert r.current_ao5 == 12000
    assert r.best_ao5 == 12000
    assert r.current_ao12 is None  # nicht genug Solves
    assert r.current_ao100 is None


def test_compute_stats_with_dnf_in_best():
    # 1 DNF, 4 valide. Best = beste valide.
    solves = [
        _sp(10000, solve_id=1),
        _sp(11000, solve_id=2),
        _sp(99000, dnf=True, solve_id=3),
        _sp(13000, solve_id=4),
        _sp(14000, solve_id=5),
    ]
    r = compute_stats(solves)
    assert r.count == 5
    assert r.count_valid == 4
    assert r.count_dnf == 1
    assert r.best_ms == 10000  # DNF zaehlt nicht als best
    assert r.worst_ms == 14000
    # Avg5: trim 1 each side = trim DNF + best (10000) → mean of (11000, 13000, 14000)
    assert r.current_ao5 == 12667  # (11000+13000+14000)/3 = 12666.67 round


def test_compute_stats_current_uses_last_n():
    # 7 Solves, current_ao5 = mean der LETZTEN 5 (timestamp asc → tail)
    # Letzte 5: solves[2:7] = [10k, 11k, 12k, 13k, 14k] → trim 10k + 14k → mean 12k
    solves = [
        _sp(50000, solve_id=1),  # alt
        _sp(60000, solve_id=2),  # alt
        _sp(10000, solve_id=3),  # neueste 5 starten hier
        _sp(11000, solve_id=4),
        _sp(12000, solve_id=5),
        _sp(13000, solve_id=6),
        _sp(14000, solve_id=7),  # neueste
    ]
    r = compute_stats(solves)
    assert r.current_ao5 == 12000


def test_compute_stats_best_avg5_finds_optimum():
    # Best Avg5 ueber alle Fenster der Groesse 5
    solves = [
        _sp(20000),
        _sp(20000),
        _sp(20000),
        _sp(20000),
        _sp(20000),  # erstes Fenster: avg = 20k
        _sp(10000),
        _sp(10000),
        _sp(10000),
        _sp(10000),
        _sp(10000),  # letztes Fenster: avg = 10k → das ist best
    ]
    r = compute_stats(solves)
    assert r.best_ao5 == 10000
    assert r.current_ao5 == 10000


def test_compute_stats_all_dnf():
    solves = [_sp(0, dnf=True, solve_id=i) for i in range(5)]
    r = compute_stats(solves)
    assert r.count == 5
    assert r.count_valid == 0
    assert r.count_dnf == 5
    assert r.best_ms is None
    assert r.mean_ms is None
    assert r.current_ao5 is None  # zu viele DNFs

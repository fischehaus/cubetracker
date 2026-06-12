"""Pure-Function-Tests für webapp/stats/calc.py (W.core-tests).

Kein Client, keine DB — direkte Aufrufe gegen die WCA-Stats-Funktionen.
Alle Erwartungswerte sind HANDGERECHNET und im Kommentar nachvollziehbar.

WCA-Trimmed-Mean (Ao5): bester + schlechtester Wert raus, Mittel der
restlichen 3. DNF zählt als "unendlich" (= schlechtester), +2 wird als
+2000ms in die effektive Zeit eingerechnet.
"""

from __future__ import annotations

from stats.calc import (
    SolvePoint,
    average_of_n,
    best_average_window,
    best_average_window_with_anchor,
    compute_stats,
)


def _points(*specs: int | tuple) -> list[SolvePoint]:
    """Hilfs-Factory: int = saubere Zeit, ('dnf', ms) = DNF, ('+2', ms) = +2.

    solve_id wird fortlaufend ab 1 vergeben (chronologische Reihenfolge).
    """
    out: list[SolvePoint] = []
    for i, spec in enumerate(specs, start=1):
        if isinstance(spec, tuple):
            kind, ms = spec
            out.append(
                SolvePoint(
                    time_ms=ms,
                    dnf=(kind == "dnf"),
                    plus_two=(kind == "+2"),
                    solve_id=i,
                )
            )
        else:
            out.append(SolvePoint(time_ms=spec, dnf=False, plus_two=False, solve_id=i))
    return out


# --- average_of_n -------------------------------------------------------------


def test_average_of_n_clean_ao5() -> None:
    # Zeiten: 10.00 / 12.00 / 11.00 / 14.00 / 13.00
    # sortiert: [10000, 11000, 12000, 13000, 14000]
    # trim 1 each side → [11000, 12000, 13000] → Mittel = 36000/3 = 12000
    solves = _points(10000, 12000, 11000, 14000, 13000)
    assert average_of_n(solves) == 12000


def test_average_of_n_one_dnf_counts_as_worst() -> None:
    # 1 DNF im 5er-Fenster: DNF = inf = schlechtester Wert → wird wegtrimmt.
    # effektiv sortiert: [10000, 11000, 12000, 14000, inf]
    # trim 1 each side → [11000, 12000, 14000] → Mittel = 37000/3 = 12333.33 → 12333
    solves = _points(12000, ("dnf", 9000), 10000, 14000, 11000)
    assert average_of_n(solves) == 12333


def test_average_of_n_two_dnfs_is_dnf() -> None:
    # 2 DNFs: nur EINER kann als schlechtester wegtrimmt werden, der zweite
    # bleibt im Mittelteil (inf) → ganzer Average ist DNF → None.
    solves = _points(10000, ("dnf", 9000), ("dnf", 8000), 11000, 12000)
    assert average_of_n(solves) is None


def test_average_of_n_plus_two_is_counted() -> None:
    # +2 auf 10000 → effektiv 12000.
    # effektiv sortiert: [8000, 9000, 11000, 12000, 13000]
    # trim 1 each side → [9000, 11000, 12000] → Mittel = 32000/3 = 10666.67 → 10667
    solves = _points(9000, ("+2", 10000), 11000, 13000, 8000)
    assert average_of_n(solves) == 10667


def test_average_of_n_too_few_solves_is_none() -> None:
    # Weniger als 3 Solves → kein Average definiert.
    assert average_of_n(_points()) is None
    assert average_of_n(_points(10000)) is None
    assert average_of_n(_points(10000, 11000)) is None


# --- best_average_window (Best Ao5 / Ao12) -------------------------------------


def test_best_ao5_over_known_sequence() -> None:
    # 7 Solves (chronologisch): 15000, 12000, 13000, 11000, 14000, 9000, 10000
    # Window 1 (Solves 1-5): sortiert [11000,12000,13000,14000,15000]
    #   → Mitte [12000,13000,14000] → 39000/3 = 13000
    # Window 2 (Solves 2-6): sortiert [9000,11000,12000,13000,14000]
    #   → Mitte [11000,12000,13000] → 36000/3 = 12000
    # Window 3 (Solves 3-7): sortiert [9000,10000,11000,13000,14000]
    #   → Mitte [10000,11000,13000] → 34000/3 = 11333.33 → 11333
    # Best = min(13000, 12000, 11333) = 11333
    solves = _points(15000, 12000, 13000, 11000, 14000, 9000, 10000)
    assert best_average_window(solves, 5) == 11333


def test_best_ao5_anchor_is_last_solve_of_best_window() -> None:
    # Gleiche Sequenz wie oben: bestes Window sind Solves 3-7 (ids 3..7)
    # → Anker = letzter Solve im Window = solve_id 7.
    solves = _points(15000, 12000, 13000, 11000, 14000, 9000, 10000)
    assert best_average_window_with_anchor(solves, 5) == (11333, 7)


def test_best_ao12_exact_window() -> None:
    # Genau 12 Solves: 10000, 11000, ..., 21000 (aufsteigend).
    # trim_for_n(12) = 1 each side → 10000 und 21000 raus.
    # Mittel von 11000..20000 = (11000+20000)*10/2 / 10 = 15500
    solves = _points(*range(10000, 22000, 1000))
    assert best_average_window(solves, 12) == 15500


def test_best_average_window_too_few_solves_is_none() -> None:
    # Fenster größer als Solve-Anzahl → None.
    assert best_average_window(_points(10000, 11000, 12000, 13000), 5) is None


# --- compute_stats --------------------------------------------------------------


def test_compute_stats_basics_dnf_excluded_from_best_and_mean() -> None:
    # Chronologisch: id1=12000 sauber, id2=10000 DNF, id3=11000 +2 (→13000),
    # id4=9000 sauber.
    solves = _points(12000, ("dnf", 10000), ("+2", 11000), 9000)
    stats = compute_stats(solves)

    assert stats.count == 4
    assert stats.count_valid == 3  # DNF zählt nicht als valide
    assert stats.count_dnf == 1

    # Best/Worst über EFFEKTIVE Zeiten der validen Solves:
    # [12000, 13000, 9000] → best 9000 (id4), worst 13000 (id3, wegen +2).
    # Der DNF mit Roh-Zeit 10000 fällt raus, obwohl er "schneller" wäre.
    assert stats.best_ms == 9000
    assert stats.best_solve_id == 4
    assert stats.worst_ms == 13000
    assert stats.worst_solve_id == 3

    # Mittel der validen: (12000 + 13000 + 9000)/3 = 34000/3 = 11333.33 → 11333
    assert stats.mean_ms == 11333

    # PB-Progression: id1 setzt 12000, id2 (DNF) übersprungen,
    # id3 effektiv 13000 (kein PB), id4 9000 (neuer PB) → [1, 4]
    assert stats.pb_solve_ids == [1, 4]

    # Unter 5 Solves: keine Averages.
    assert stats.current_ao5 is None
    assert stats.best_ao5 is None


def test_compute_stats_with_ao5() -> None:
    # 5 Solves: 15000, 12000, 13000, 11000, 14000
    # Ao5: sortiert [11000,...,15000] → Mitte [12000,13000,14000] → 13000
    # (gleiche Rechnung wie Window 1 im Best-Ao5-Test)
    solves = _points(15000, 12000, 13000, 11000, 14000)
    stats = compute_stats(solves)

    assert stats.count == 5
    assert stats.current_ao5 == 13000
    assert stats.best_ao5 == 13000  # nur ein Window möglich
    assert stats.best_ao5_solve_id == 5  # Anker = letzter Solve im Window
    assert stats.best_ao12 is None  # zu wenig Solves für Ao12


def test_compute_stats_empty_and_all_dnf() -> None:
    # Leere Liste → alles None / 0.
    empty = compute_stats([])
    assert empty.count == 0
    assert empty.best_ms is None
    assert empty.mean_ms is None
    assert empty.pb_solve_ids == []

    # Nur DNFs → count zählt, aber best/worst/mean sind None.
    all_dnf = compute_stats(_points(("dnf", 10000), ("dnf", 11000)))
    assert all_dnf.count == 2
    assert all_dnf.count_valid == 0
    assert all_dnf.count_dnf == 2
    assert all_dnf.best_ms is None
    assert all_dnf.worst_ms is None
    assert all_dnf.mean_ms is None
    assert all_dnf.pb_solve_ids == []

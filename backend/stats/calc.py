"""Stats-Berechnungen — pure Funktionen, ohne DB-Bezug.

Speedcubing-Konvention (WCA):
- Average of N (AvgN) = trimmed mean: trim die N*5%-besten und
  N*5%-schlechtesten (mind. 1 each side fuer N=5 und N=12), dann
  arithmetisches Mittel der restlichen.
- DNF zaehlt als „unendlich" beim Sortieren.
- Wenn mehr DNFs als trimmbar → ganzer Avg ist DNF (None).

Konkrete Trim-Werte (WCA + Praxis):
- Avg5:   trim 1 each side → mean of 3
- Avg12:  trim 1 each side → mean of 10
- Avg100: trim 5 each side → mean of 90
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class SolvePoint:
    """Pure Daten-Klasse fuer Stats-Input — entkoppelt von ORM.

    `time_ms`: Roh-Zeit in ms.
    `dnf`: True → zaehlt als "unendlich" / Avg-DNF.
    `plus_two`: +2-Strafe → effektive Zeit = time_ms + 2000.
    `solve_id`: ORM-ID, fuer Best-Marker im Frontend.
    """

    time_ms: int
    dnf: bool
    plus_two: bool
    solve_id: int

    @property
    def effective_ms(self) -> float:
        """Zeit fuer Vergleich/Avg. DNF = inf."""
        if self.dnf:
            return math.inf
        return float(self.time_ms + (2000 if self.plus_two else 0))


def trim_for_n(n: int) -> int:
    """WCA-Trim-Konvention: 1 each side fuer 5/12, sonst max(1, floor(n*5%))."""
    if n < 3:
        return 0
    if n <= 12:
        return 1
    return max(1, math.floor(n * 0.05))


def average_of_n(solves: list[SolvePoint]) -> int | None:
    """WCA-Trimmed-Mean. None wenn < 3 Solves oder zu viele DNF.

    Liefert Millisekunden als int (gerundet).
    """
    n = len(solves)
    if n < 3:
        return None
    trim = trim_for_n(n)
    times = sorted(s.effective_ms for s in solves)
    middle = times[trim : n - trim]
    if any(math.isinf(t) for t in middle):
        return None  # zu viele DNFs → Avg ist DNF
    return round(sum(middle) / len(middle))


def best_average_window(solves: list[SolvePoint], window: int) -> int | None:
    """Best Avg aus allen Sliding-Windows der Groesse `window`.

    Solves muessen in chronologischer Reihenfolge sein (timestamp asc).
    Liefert min. Avg, oder None wenn nicht genug Solves oder alle Avgs DNF.
    """
    n = len(solves)
    if n < window:
        return None
    best: int | None = None
    for i in range(n - window + 1):
        avg = average_of_n(solves[i : i + window])
        if avg is not None and (best is None or avg < best):
            best = avg
    return best


@dataclass
class StatsResult:
    """Vollstaendige Statistik-Antwort fuer eine Solve-Menge."""

    count: int
    count_valid: int  # ohne DNF
    count_dnf: int

    # Singles
    best_ms: int | None
    best_solve_id: int | None
    worst_ms: int | None
    worst_solve_id: int | None
    mean_ms: int | None  # arithm. Mittel valider Solves

    # Aktuelle Avgs (basierend auf den letzten N nach timestamp)
    current_ao5: int | None
    current_ao12: int | None
    current_ao100: int | None

    # Beste Avgs (sliding window)
    best_ao5: int | None
    best_ao12: int | None
    best_ao100: int | None


def compute_stats(solves: list[SolvePoint]) -> StatsResult:
    """Vollstaendige Statistik aus einer Solve-Liste.

    Reihenfolge: Solves sollten in chronologischer Reihenfolge (asc)
    sein, damit "current" wirklich die letzten N umfasst.
    """
    n = len(solves)
    if n == 0:
        return StatsResult(
            count=0,
            count_valid=0,
            count_dnf=0,
            best_ms=None,
            best_solve_id=None,
            worst_ms=None,
            worst_solve_id=None,
            mean_ms=None,
            current_ao5=None,
            current_ao12=None,
            current_ao100=None,
            best_ao5=None,
            best_ao12=None,
            best_ao100=None,
        )

    valid = [s for s in solves if not s.dnf]
    count_dnf = n - len(valid)

    if valid:
        # Best Single (nach effective_ms aufsteigend, weil +2 zaehlt)
        best = min(valid, key=lambda s: s.effective_ms)
        worst = max(valid, key=lambda s: s.effective_ms)
        best_ms = int(best.effective_ms)
        worst_ms = int(worst.effective_ms)
        mean_ms = round(sum(s.effective_ms for s in valid) / len(valid))
    else:
        best_ms = worst_ms = mean_ms = None
        best = worst = None

    # Aktuelle Avgs (letzte N — Liste ist asc, also tail)
    current_ao5 = average_of_n(solves[-5:]) if n >= 5 else None
    current_ao12 = average_of_n(solves[-12:]) if n >= 12 else None
    current_ao100 = average_of_n(solves[-100:]) if n >= 100 else None

    # Beste Avgs (sliding window, alle Solves)
    best_ao5 = best_average_window(solves, 5) if n >= 5 else None
    best_ao12 = best_average_window(solves, 12) if n >= 12 else None
    best_ao100 = best_average_window(solves, 100) if n >= 100 else None

    return StatsResult(
        count=n,
        count_valid=len(valid),
        count_dnf=count_dnf,
        best_ms=best_ms,
        best_solve_id=best.solve_id if best else None,
        worst_ms=worst_ms,
        worst_solve_id=worst.solve_id if worst else None,
        mean_ms=mean_ms,
        current_ao5=current_ao5,
        current_ao12=current_ao12,
        current_ao100=current_ao100,
        best_ao5=best_ao5,
        best_ao12=best_ao12,
        best_ao100=best_ao100,
    )

"""Stats-Berechnungen — pure Funktionen, ohne DB-Bezug.

Speedcubing-Konvention (WCA):
- Average of N (AvgN) = trimmed mean: trim die N*5%-besten und
  N*5%-schlechtesten (mind. 1 each side für N=5 und N=12), dann
  arithmetisches Mittel der restlichen.
- DNF zählt als „unendlich" beim Sortieren.
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
    """Pure Daten-Klasse für Stats-Input — entkoppelt von ORM.

    `time_ms`: Roh-Zeit in ms.
    `dnf`: True → zählt als "unendlich" / Avg-DNF.
    `plus_two`: +2-Strafe → effektive Zeit = time_ms + 2000.
    `solve_id`: ORM-ID, für Best-Marker im Frontend.
    """

    time_ms: int
    dnf: bool
    plus_two: bool
    solve_id: int

    @property
    def effective_ms(self) -> float:
        """Zeit für Vergleich/Avg. DNF = inf."""
        if self.dnf:
            return math.inf
        return float(self.time_ms + (2000 if self.plus_two else 0))


def trim_for_n(n: int) -> int:
    """WCA-Trim-Konvention: 1 each side für 5/12, sonst max(1, floor(n*5%))."""
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
    """Best Avg aus allen Sliding-Windows der Größe `window`.

    Solves müssen in chronologischer Reihenfolge sein (timestamp asc).
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


def best_average_window_with_anchor(
    solves: list[SolvePoint], window: int
) -> tuple[int, int] | None:
    """Wie best_average_window, liefert zusätzlich die solve_id des
    LETZTEN Solves im besten Window (= Ankerpunkt für den Zeitstempel
    „wann wurde dieser Best-Avg erzielt").

    Phase 8.4: erlaubt dem Frontend Anzeige „Best Ao5 12.34 (am 03.05.)".
    """
    n = len(solves)
    if n < window:
        return None
    best_avg: int | None = None
    best_anchor_id: int | None = None
    for i in range(n - window + 1):
        avg = average_of_n(solves[i : i + window])
        if avg is not None and (best_avg is None or avg < best_avg):
            best_avg = avg
            # Anker = letzter Solve im Window
            best_anchor_id = solves[i + window - 1].solve_id
    if best_avg is None or best_anchor_id is None:
        return None
    return (best_avg, best_anchor_id)


def single_pb_progression(solves: list[SolvePoint]) -> list[tuple[int, int]]:
    """PB-Progression der Single-Zeiten in chronologischer Reihenfolge.

    Solves muessen chronologisch (timestamp asc) sein. Liefert fuer jede Solve,
    die den bisherigen Rekord UNTERBIETET (strikt <), ein (solve_id, ms)-Paar.
    DNF wird uebersprungen, +2 zaehlt (effective_ms). Das letzte Paar = der
    aktuelle Allzeit-PB.
    """
    out: list[tuple[int, int]] = []
    best = math.inf
    for s in solves:
        if s.dnf:
            continue
        e = s.effective_ms
        if e < best:
            best = e
            out.append((s.solve_id, int(e)))
    return out


def avg_pb_progression(solves: list[SolvePoint], window: int) -> list[tuple[int, int]]:
    """PB-Progression eines Average-of-N (ao5/ao12/...) in chronologischer Folge.

    Laeuft alle Sliding-Windows der Groesse `window` durch (Solves asc) und
    emittiert fuer jeden neuen Best-Avg (strikt <) ein (anchor_solve_id, avg_ms)-
    Paar. Anker = letzter Solve im Window (= „wann wurde dieser Avg-PB erzielt").
    """
    n = len(solves)
    out: list[tuple[int, int]] = []
    if n < window:
        return out
    best: int | None = None
    for i in range(n - window + 1):
        avg = average_of_n(solves[i : i + window])
        if avg is not None and (best is None or avg < best):
            best = avg
            anchor_id = solves[i + window - 1].solve_id
            out.append((anchor_id, avg))
    return out


@dataclass
class StatsResult:
    """Vollstaendige Statistik-Antwort für eine Solve-Menge."""

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

    # Phase 8.4: Anker-Solve-IDs (letzter Solve im besten Window)
    # → Frontend resolved daraus den Timestamp für Anzeige.
    best_ao5_solve_id: int | None
    best_ao12_solve_id: int | None
    best_ao100_solve_id: int | None

    # W.pb-history: IDs aller Solves, die zum Zeitpunkt ihres Setzens ein
    # Single-PB waren (chronologische Progression). Fuer Listen-Marker.
    pb_solve_ids: list[int]


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
            best_ao5_solve_id=None,
            best_ao12_solve_id=None,
            best_ao100_solve_id=None,
            pb_solve_ids=[],
        )

    valid = [s for s in solves if not s.dnf]
    count_dnf = n - len(valid)

    if valid:
        # Best Single (nach effective_ms aufsteigend, weil +2 zählt)
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

    # Beste Avgs (sliding window, alle Solves) — mit Anker-Solve-ID
    ao5_anchor = best_average_window_with_anchor(solves, 5) if n >= 5 else None
    ao12_anchor = best_average_window_with_anchor(solves, 12) if n >= 12 else None
    ao100_anchor = best_average_window_with_anchor(solves, 100) if n >= 100 else None

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
        best_ao5=ao5_anchor[0] if ao5_anchor else None,
        best_ao12=ao12_anchor[0] if ao12_anchor else None,
        best_ao100=ao100_anchor[0] if ao100_anchor else None,
        best_ao5_solve_id=ao5_anchor[1] if ao5_anchor else None,
        best_ao12_solve_id=ao12_anchor[1] if ao12_anchor else None,
        best_ao100_solve_id=ao100_anchor[1] if ao100_anchor else None,
        pb_solve_ids=[sid for sid, _ in single_pb_progression(solves)],
    )


@dataclass
class PbHistoryResult:
    """PB-Progressionen fuer die Visualisierung (W.pb-history).

    Jede Liste enthaelt (solve_id, ms)-Paare in chronologischer Reihenfolge —
    je ein Eintrag pro neuem Rekord. solve_id ist beim Single die Solve selbst,
    bei den Averages der Anker (letzter Solve im Window). Den Timestamp loest
    die API-Schicht aus der solve_id auf.
    """

    single: list[tuple[int, int]]
    ao5: list[tuple[int, int]]
    ao12: list[tuple[int, int]]


def pb_history(solves: list[SolvePoint]) -> PbHistoryResult:
    """Single- + ao5- + ao12-PB-Progression. Solves muessen chronologisch sein."""
    return PbHistoryResult(
        single=single_pb_progression(solves),
        ao5=avg_pb_progression(solves, 5),
        ao12=avg_pb_progression(solves, 12),
    )

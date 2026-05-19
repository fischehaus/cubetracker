"""PB-Pattern-Detection (Phase 8.5.1) — pure Funktionen.

Erkennt Pattern wie „Doppel-PB", „Synchronized PB", „Triple-Day", und
„5 in Folge unter Ao12". Brauchen chronologisches Tracking durch alle
Solves eines Cube-Types.

Das ist die rechen-intensive Variante: pro cube_type ein O(N)-Pass durch
alle Solves chronologisch sortiert. Bei 6200 Solves total auf 13 cubes
< 100ms gemessen.

Arbeitet auf einem leichten ChronoSolve-Dataclass — service.py mappt
DB-Solves auf das Format.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

from stats.calc import SolvePoint, average_of_n


@dataclass(frozen=True)
class ChronoSolve:
    """Minimaler Solve-Snapshot für pattern-detection."""

    day: date
    effective_ms: float  # math.inf wenn DNF
    dnf: bool
    plus_two: bool
    time_ms: int

    def to_point(self, solve_id: int = 0) -> SolvePoint:
        """Konvertiert zu SolvePoint für average_of_n."""
        return SolvePoint(
            time_ms=self.time_ms,
            dnf=self.dnf,
            plus_two=self.plus_two,
            solve_id=solve_id,
        )


@dataclass(frozen=True)
class PatternResult:
    """Aggregierte Pattern-Flags für EINEN cube_type.

    Caller (service.py) ODert über alle cube_types für
    achievement-aggregation.
    """

    had_pb_double: bool
    """Jemals 2 single-PBs in 2 aufeinanderfolgenden Solves."""

    had_pb_synchronized: bool
    """Jemals single-PB UND ao5-PB im selben Solve."""

    had_pb_triple_day: bool
    """Jemals an einem Tag: single-PB + ao5-PB + ao12-PB."""

    had_5_consecutive_under_ao12: bool
    """Jemals 5 valide Solves in Folge alle unter dem damals-geltenden
    rolling-Ao12 (berechnet aus den 12 SOLVES VOR dem aktuellen)."""


def detect_patterns(solves: list[ChronoSolve]) -> PatternResult:
    """Findet alle PB-Patterns in chronologisch sortierten Solves.

    Solves müssen nach timestamp aufsteigend sortiert sein.
    """
    best_single: float | None = None
    best_ao5: int | None = None
    best_ao12: int | None = None

    last_was_single_pb = False
    had_double = False
    had_synchronized = False
    days_with_triple: set[date] = set()
    pbs_per_day: dict[date, set[str]] = {}

    had_5_consec = False
    consecutive_under_ao12 = 0

    window5: list[SolvePoint] = []
    window12: list[SolvePoint] = []
    prev_window12: list[SolvePoint] = []  # die 12 SOLVES VOR dem aktuellen (für Konsistenz-Check)

    for s in solves:
        point = s.to_point()
        eff = s.effective_ms
        day = s.day
        pbs_today = pbs_per_day.setdefault(day, set())

        # ===== KONSISTENZ-CHECK ZUERST (vor window-update) =====
        # „5 in Folge unter aktuellem Ao12" — wir berechnen ao12 aus den
        # PRE-Window (12 vorige Solves), damit der aktuelle Solve nicht
        # in seinen eigenen Vergleichswert einfliesst.
        if len(prev_window12) >= 12:
            ao12_prev = average_of_n(prev_window12)
            if ao12_prev is not None and not s.dnf and eff < ao12_prev:
                consecutive_under_ao12 += 1
                if consecutive_under_ao12 >= 5:
                    had_5_consec = True
            else:
                consecutive_under_ao12 = 0
        else:
            consecutive_under_ao12 = 0

        # ===== WINDOWS UPDATEN =====
        prev_window12.append(point)
        if len(prev_window12) > 12:
            prev_window12.pop(0)

        window5.append(point)
        if len(window5) > 5:
            window5.pop(0)
        window12.append(point)
        if len(window12) > 12:
            window12.pop(0)

        # ===== PB-DETECTION =====
        # is_X_pb (echte Verbesserung) wird für Double-Pattern genutzt;
        # erste Setzung zählt nicht — sonst löst jede 2-Solve-Sequenz
        # automatisch Doppel-PB aus.
        # pbs_today (alle "set-or-improved" Events) wird für Triple-Day
        # genutzt — auch erstes Setzen zählt, weil's der erste „neue
        # Bestwert" ist und der User es als Erfolg empfindet.
        is_single_pb = False
        if not s.dnf and not math.isinf(eff):
            if best_single is None:
                best_single = eff
                pbs_today.add("single")  # first-set zählt für Triple-Day
            elif eff < best_single:
                best_single = eff
                is_single_pb = True
                pbs_today.add("single")

        is_ao5_pb = False
        if len(window5) == 5:
            cur_ao5 = average_of_n(window5)
            if cur_ao5 is not None:
                if best_ao5 is None:
                    best_ao5 = cur_ao5
                    pbs_today.add("ao5")
                elif cur_ao5 < best_ao5:
                    best_ao5 = cur_ao5
                    is_ao5_pb = True
                    pbs_today.add("ao5")

        # Ao12-PB-Event: nur für Triple-Day-Tracking, kein eigenes Pattern
        if len(window12) == 12:
            cur_ao12 = average_of_n(window12)
            if cur_ao12 is not None and (best_ao12 is None or cur_ao12 < best_ao12):
                best_ao12 = cur_ao12
                pbs_today.add("ao12")

        # ===== PATTERNS =====
        # Synchronized: single + ao5 im selben Solve
        if is_single_pb and is_ao5_pb:
            had_synchronized = True

        # Double: 2 single-PBs in Folge
        if is_single_pb and last_was_single_pb:
            had_double = True
        last_was_single_pb = is_single_pb

        # Triple-Day: an EINEM Tag alle 3 PB-Typen (kann über den Tag
        # akkumuliert werden — verschiedene Solves)
        if "single" in pbs_today and "ao5" in pbs_today and "ao12" in pbs_today:
            days_with_triple.add(day)

    return PatternResult(
        had_pb_double=had_double,
        had_pb_synchronized=had_synchronized,
        had_pb_triple_day=len(days_with_triple) > 0,
        had_5_consecutive_under_ao12=had_5_consec,
    )


def merge_patterns(results: list[PatternResult]) -> PatternResult:
    """ODert die Flags über mehrere cube_types — wird in service.py
    aggregiert weil Achievement-Definitionen cube-übergreifend sind
    (z.B. „Doppel-PB" = jemals in IRGENDEINEM Event 2 PBs in Folge)."""
    return PatternResult(
        had_pb_double=any(r.had_pb_double for r in results),
        had_pb_synchronized=any(r.had_pb_synchronized for r in results),
        had_pb_triple_day=any(r.had_pb_triple_day for r in results),
        had_5_consecutive_under_ao12=any(r.had_5_consecutive_under_ao12 for r in results),
    )

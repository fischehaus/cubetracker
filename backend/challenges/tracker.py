"""Pure Daily-Challenge-Tracker (Phase 7b).

Berechnet den neuen progress-Wert einer Challenge nach einem Solve-Ereignis.
Die service-layer ruft das fuer jede aktive Challenge auf.

Monotonic-Eigenschaft (User-decision): progress kann nur >= alter wert
werden. Auch wenn ein Solve nachtraeglich geloescht wird, bleibt
progress + completed_at erhalten.

Diversity wird hier NICHT behandelt (braucht DB-context: alle solves heute).
Das macht die service-layer.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SolveSnapshot:
    """Minimale Solve-Info fuer den tracker — wir wollen DB-Modelle nicht hier."""

    cube_type: str
    time_ms: int
    plus_two: bool
    dnf: bool

    @property
    def effective_ms(self) -> int:
        return self.time_ms + (2000 if self.plus_two else 0)


@dataclass(frozen=True)
class ChallengeState:
    """Aktueller Stand einer Challenge — was der tracker zum entscheiden braucht."""

    kind: str  # "volume" | "speed" | "comeback" (diversity macht service)
    cube_type: str | None
    target_value: int
    progress: int
    is_completed: bool


def update_progress_for_solve(challenge: ChallengeState, solve: SolveSnapshot) -> int:
    """Liefert den NEUEN progress-Wert der Challenge nach diesem Solve.

    Rueckgabe ist >= challenge.progress (monotonic).
    """
    if challenge.is_completed:
        return challenge.progress  # bleibt erfuellt

    if challenge.kind == "volume":
        # cube_type=None: jeder cube zaehlt
        if challenge.cube_type and solve.cube_type != challenge.cube_type:
            return challenge.progress
        if solve.dnf:
            return challenge.progress  # DNFs zaehlen nicht fuer volume
        return challenge.progress + 1

    if challenge.kind == "speed":
        # progress=1 sobald ein solve schneller als target_ms war
        if solve.cube_type != challenge.cube_type or solve.dnf:
            return challenge.progress
        if solve.effective_ms < challenge.target_value:
            return 1  # erreicht
        return challenge.progress

    if challenge.kind == "comeback":
        # ein solve im challenge.cube_type genuegt
        if solve.cube_type != challenge.cube_type or solve.dnf:
            return challenge.progress
        return 1

    # diversity wird in der service-layer behandelt (braucht DB-context)
    return challenge.progress

"""Pure Daily-Challenge-Generator (Phase 7b).

Bekommt einen `GeneratorInput`-Snapshot mit User-Stats und liefert
3 sinnvolle Challenges fuer heute. Jede Challenge ist ein
`ChallengeSpec`-dataclass — der Caller persistiert sie in der DB.

Strategie: 3 verschiedene Typen pro Tag, damit Abwechslung garantiert ist.
- 1x Volume (anzahl-solves heute)
- 1x Speed (sub-X im Haupt-cube)
- 1x Comeback (cube der laenger nicht angefasst wurde) — Fallback Diversity

Anpassbar via Schwellwerten (CHALLENGE_*) am Datei-Anfang.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

# Schwellwerte (gut tunbar)
VOLUME_MIN = 10  # mindestens 10 solves als challenge, nie weniger
SPEED_PB_FACTOR = 1.05  # ziel = PB * 1.05 (5% schlechter — realistisch zu schaffen)
COMEBACK_MIN_DAYS_UNUSED = 7  # ab wann ein cube als „vergessen" gilt
DIVERSITY_TARGET = 3  # x verschiedene cubes als fallback


@dataclass(frozen=True)
class GeneratorInput:
    """Snapshot der User-Stats fuer Challenge-Generierung."""

    avg_solves_per_active_day: int  # mittel ueber letzte 7-30 tage
    most_active_cube: str | None  # wo der user am meisten solved
    best_ms_per_cube: dict[str, int]  # PB pro cube
    cubes_unused_for_days: dict[str, int]  # cube_type → tage seit letztem solve
    distinct_cubes_total: int  # alle jemals beruehrten cubes


@dataclass(frozen=True)
class ChallengeSpec:
    """Plan fuer eine Challenge — wird von der service-layer in DB persistiert."""

    kind: str  # "volume" | "speed" | "comeback" | "diversity"
    cube_type: str | None
    target_value: int
    description: str  # menschen-lesbarer text fuers UI
    params: dict[str, int | str] = field(default_factory=dict)


def _volume_challenge(snap: GeneratorInput) -> ChallengeSpec:
    target = max(VOLUME_MIN, snap.avg_solves_per_active_day)
    return ChallengeSpec(
        kind="volume",
        cube_type=None,  # any cube zaehlt
        target_value=target,
        description=f"Mache heute {target} Solves (egal welcher Cube)",
    )


def _speed_challenge(snap: GeneratorInput) -> ChallengeSpec | None:
    """Ziel: ein Solve in Haupt-Cube schneller als PB * 1.05.

    Liefert None wenn nicht genug Daten (kein PB im Haupt-Cube).
    """
    cube = snap.most_active_cube
    if cube is None:
        return None
    pb = snap.best_ms_per_cube.get(cube)
    if pb is None:
        return None
    target_ms = int(pb * SPEED_PB_FACTOR)
    target_seconds = target_ms / 1000
    return ChallengeSpec(
        kind="speed",
        cube_type=cube,
        target_value=target_ms,
        description=f"Schaffe einen {cube}-Solve unter {target_seconds:.2f}s "
        f"(dein PB liegt bei {pb / 1000:.2f}s)",
    )


def _comeback_challenge(snap: GeneratorInput) -> ChallengeSpec | None:
    """Pick einen cube der >= COMEBACK_MIN_DAYS nicht angefasst wurde."""
    candidates = [c for c, d in snap.cubes_unused_for_days.items() if d >= COMEBACK_MIN_DAYS_UNUSED]
    if not candidates:
        return None
    # Zufaellig waehlen, sonst immer derselbe
    cube = random.choice(candidates)
    days = snap.cubes_unused_for_days[cube]
    return ChallengeSpec(
        kind="comeback",
        cube_type=cube,
        target_value=1,
        description=f"Mache mind. einen {cube}-Solve — du hast ihn seit "
        f"{days} Tagen nicht angefasst",
    )


def _diversity_challenge(snap: GeneratorInput) -> ChallengeSpec | None:
    """Fallback wenn comeback nicht greift: X verschiedene cubes heute."""
    if snap.distinct_cubes_total < DIVERSITY_TARGET:
        return None  # User hat insgesamt zu wenig cube-types
    return ChallengeSpec(
        kind="diversity",
        cube_type=None,
        target_value=DIVERSITY_TARGET,
        description=f"Trainiere heute {DIVERSITY_TARGET} verschiedene Cube-Types",
    )


def generate_daily_challenges(snap: GeneratorInput) -> list[ChallengeSpec]:
    """Generiert bis zu 3 Challenges fuer heute. Reihenfolge:
    Volume, Speed, Comeback (Fallback Diversity).

    Wenn weniger als 3 sinnvolle Specs gefunden werden, weniger als 3
    zurueckgegeben — UI zeigt entsprechend leerer.
    """
    out: list[ChallengeSpec] = []

    out.append(_volume_challenge(snap))

    speed = _speed_challenge(snap)
    if speed:
        out.append(speed)

    comeback = _comeback_challenge(snap)
    if comeback:
        out.append(comeback)
    else:
        diversity = _diversity_challenge(snap)
        if diversity:
            out.append(diversity)

    return out

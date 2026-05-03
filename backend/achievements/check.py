"""Pure Achievement-Check-Logik (Phase 7a).

Bewusst getrennt von DB/API: nimmt einen `AchievementInput`-Snapshot
und liefert die Liste codes, die UNLOCKED sein sollten. Caller-Code
in der API entscheidet dann, welche neu sind und in die DB inserted
werden muessen.

Vorteile:
- voll testbar (keine DB-deps)
- einfach zu erweitern (neuer code? funktion erweitern + test)
- klare cross-modul-grenze (nur dieses file kennt die regeln)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AchievementInput:
    """Snapshot des aktuellen User-Stands fuer Achievement-Pruefung.

    Wird vom Caller (api/achievements.py) aus DB-queries zusammengebaut.
    """

    total_solves: int  # alle solves, inkl. DNF
    total_valid_solves: int  # alle solves ohne DNF
    solves_per_cube: dict[str, int]  # cube_type → count (ohne DNF)
    best_ms_per_cube: dict[str, int]  # cube_type → best_ms (effective)
    distinct_cube_types: int  # wie viele verschiedene cubes wurden geuebt
    hardware_count: int  # eintraege in hardware-tabelle


def check_achievements(snapshot: AchievementInput) -> list[str]:
    """Liefert die Liste codes, die jetzt UNLOCKED sein sollten.

    Caller filtert dann selbst, welche schon unlocked sind und welche
    neu in DB inserted werden muessen.
    """
    unlocked: list[str] = []

    # --- Volume gesamt (zaehlt nur valide solves, sonst ueberraschend
    # wenn DNFs bei einem volume_100 mit-zaehlen)
    if snapshot.total_valid_solves >= 100:
        unlocked.append("volume_100")
    if snapshot.total_valid_solves >= 500:
        unlocked.append("volume_500")
    if snapshot.total_valid_solves >= 1000:
        unlocked.append("volume_1000")
    if snapshot.total_valid_solves >= 5000:
        unlocked.append("volume_5000")
    if snapshot.total_valid_solves >= 10000:
        unlocked.append("volume_10000")

    # --- Volume 3x3
    n_3x3 = snapshot.solves_per_cube.get("3x3", 0)
    if n_3x3 >= 100:
        unlocked.append("cube_3x3_100")
    if n_3x3 >= 500:
        unlocked.append("cube_3x3_500")
    if n_3x3 >= 1000:
        unlocked.append("cube_3x3_1000")

    # --- Volume any-cube (max ueber alle cubes)
    max_per_cube = max(snapshot.solves_per_cube.values(), default=0)
    if max_per_cube >= 500:
        unlocked.append("cube_any_500")
    if max_per_cube >= 1000:
        unlocked.append("cube_any_1000")

    # --- Speed 3x3 (PBs in ms)
    best_3x3 = snapshot.best_ms_per_cube.get("3x3")
    if best_3x3 is not None:
        if best_3x3 < 15_000:
            unlocked.append("pb_3x3_sub_15")
        if best_3x3 < 12_000:
            unlocked.append("pb_3x3_sub_12")
        if best_3x3 < 10_000:
            unlocked.append("pb_3x3_sub_10")
        if best_3x3 < 8_000:
            unlocked.append("pb_3x3_sub_8")

    # --- Variety
    if snapshot.distinct_cube_types >= 5:
        unlocked.append("variety_5")
    if snapshot.distinct_cube_types >= 10:
        unlocked.append("variety_10")

    # --- Hardware
    if snapshot.hardware_count >= 1:
        unlocked.append("hardware_first")
    if snapshot.hardware_count >= 5:
        unlocked.append("hardware_5")

    return unlocked

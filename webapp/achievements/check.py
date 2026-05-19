"""Pure Achievement-Check-Logik (Phase 7a).

Bewusst getrennt von DB/API: nimmt einen `AchievementInput`-Snapshot
und liefert die Liste codes, die UNLOCKED sein sollten. Caller-Code
in der API entscheidet dann, welche neu sind und in die DB inserted
werden müssen.

Vorteile:
- voll testbar (keine DB-deps)
- einfach zu erweitern (neuer code? funktion erweitern + test)
- klare cross-modul-grenze (nur dieses file kennt die regeln)
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Sanity-Floor: time_ms unter 1000ms (1s) sind realistisch nicht erreichbar
# (Welt-Single-Rekord ist ~3s). Schuetzt vor degenerierten Daten-Einträgen
# (z.B. time_ms=0 ohne DNF-Flag, wie bei manchem Import-Edge-Case).
SPEED_3X3_SANITY_FLOOR_MS = 1_000


@dataclass(frozen=True)
class AchievementInput:
    """Snapshot des aktuellen User-Stands für Achievement-Prüfung.

    Wird vom Caller (api/achievements.py) aus DB-queries zusammengebaut.
    """

    total_solves: int  # alle solves, inkl. DNF
    total_valid_solves: int  # alle solves ohne DNF
    solves_per_cube: dict[str, int]  # cube_type → count (ohne DNF)
    best_ms_per_cube: dict[str, int]  # cube_type → best_ms (effective)
    distinct_cube_types: int  # wie viele verschiedene cubes wurden geübt
    hardware_count: int  # einträge in hardware-tabelle
    # Phase 8.5
    max_solves_one_day_per_cube: dict[str, int] = field(default_factory=dict)
    """Bestes Tagesvolumen pro Cube-Type (über alle Tage gerechnet)."""
    max_solves_one_day_any: int = 0
    """Bestes Tagesvolumen über alle Cubes zusammen (an EINEM Tag)."""
    max_consecutive_days_3x3_100plus: int = 0
    """Laengste Streak von Tagen in Folge mit ≥100 3x3-Solves."""
    max_solve_streak_days: int = 0
    """Laengste Streak von Tagen in Folge mit ≥1 Solve (egal welcher Cube)."""
    # Phase 8.5.1 — PB-Patterns (chronologisch detektiert pro cube_type, ge-OR-t)
    had_pb_double: bool = False
    """Jemals 2 single-PBs in Folge in IRGENDEINEM cube_type."""
    had_pb_synchronized: bool = False
    """Jemals single-PB UND ao5-PB im selben Solve."""
    had_pb_triple_day: bool = False
    """Jemals an einem Tag alle 3 PB-Events (single + ao5 + ao12)."""
    had_5_consecutive_under_ao12: bool = False
    """Jemals 5 valide Solves in Folge unter dem damals-running-Ao12."""


def check_achievements(snapshot: AchievementInput) -> list[str]:
    """Liefert die Liste codes, die jetzt UNLOCKED sein sollten.

    Caller filtert dann selbst, welche schon unlocked sind und welche
    neu in DB inserted werden müssen.
    """
    unlocked: list[str] = []

    # --- Volume gesamt (zählt nur valide solves, sonst überraschend
    # wenn DNFs bei einem volume_100 mit-zählen)
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

    # --- Volume any-cube (max über alle cubes)
    max_per_cube = max(snapshot.solves_per_cube.values(), default=0)
    if max_per_cube >= 500:
        unlocked.append("cube_any_500")
    if max_per_cube >= 1000:
        unlocked.append("cube_any_1000")

    # --- Speed 3x3 (PBs in ms) — Sanity-Floor schuetzt vor time_ms=0-Edge-Cases
    best_3x3 = snapshot.best_ms_per_cube.get("3x3")
    if best_3x3 is not None and best_3x3 >= SPEED_3X3_SANITY_FLOOR_MS:
        if best_3x3 < 30_000:
            unlocked.append("pb_3x3_sub_30")  # 8.5
        if best_3x3 < 22_950:
            unlocked.append("pb_3x3_sub_22_95")  # 8.5 (User-Wunsch)
        if best_3x3 < 15_000:
            unlocked.append("pb_3x3_sub_15")
        if best_3x3 < 12_000:
            unlocked.append("pb_3x3_sub_12")
        if best_3x3 < 10_000:
            unlocked.append("pb_3x3_sub_10")
        if best_3x3 < 8_000:
            unlocked.append("pb_3x3_sub_8")
        if best_3x3 < 6_660:
            unlocked.append("pb_3x3_sub_6_66")  # 8.5 (User-Wunsch / Hex)

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

    # --- Phase 8.5: 100er-Tag pro Event (≥100 Solves an einem Tag)
    for event in ["3x3", "2x2", "4x4", "5x5", "OH"]:
        if snapshot.max_solves_one_day_per_cube.get(event, 0) >= 100:
            unlocked.append(f"volume_day_{_event_code(event)}_100")

    # --- 8.5: Marathon-Tag (≥200 Solves egal welcher Cube an einem Tag)
    if snapshot.max_solves_one_day_any >= 200:
        unlocked.append("volume_day_any_200")

    # --- 8.5: Wochen-Disziplin 3x3 (7+ Tage in Folge je ≥100 3x3-Solves)
    if snapshot.max_consecutive_days_3x3_100plus >= 7:
        unlocked.append("volume_week_3x3_100daily")

    # --- 8.5: Solve-Streaks (Tage in Folge mit ≥1 Solve)
    if snapshot.max_solve_streak_days >= 7:
        unlocked.append("streak_solve_7")
    if snapshot.max_solve_streak_days >= 30:
        unlocked.append("streak_solve_30")
    if snapshot.max_solve_streak_days >= 100:
        unlocked.append("streak_solve_100")

    # --- 8.5.1: PB-Patterns + Konsistenz
    if snapshot.had_pb_double:
        unlocked.append("pb_double")
    if snapshot.had_pb_synchronized:
        unlocked.append("pb_synchronized")
    if snapshot.had_pb_triple_day:
        unlocked.append("pb_triple_day")
    if snapshot.had_5_consecutive_under_ao12:
        unlocked.append("consistency_5_under_ao12")

    return unlocked


def _event_code(event: str) -> str:
    """Cube-Type-Name in achievement-code-friendly Form."""
    return event.lower().replace("x", "x")  # Identität, ein-Konventions-Hook

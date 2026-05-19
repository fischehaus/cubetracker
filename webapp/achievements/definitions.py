"""Achievement-Definitionen (Phase 7a).

Statische Code-Konstanten — die DB speichert nur welche codes der User
schon unlocked hat (siehe `db.models.Achievement`). Vorteil: einfache
Migration zwischen App-Versionen, keine Schema-Änderung wenn neue
Achievements dazukommen.

Categories steuern die UI-Gruppierung (lila Sektionen im AchievementsCard).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AchievementDef:
    code: str  # eindeutiger Identifier, in DB als unique-constraint
    name: str  # angezeigter Titel
    description: str  # ein-satz-erklärung
    category: str  # "volume" | "speed" | "variety" | "hardware"
    icon: str  # emoji für UI


# ============================================================
# Volume — Gesamt-Solve-Anzahl
# ============================================================

VOLUME_TOTAL: list[AchievementDef] = [
    AchievementDef("volume_100", "Erste Hundert", "100 Solves insgesamt", "volume", "💯"),
    AchievementDef("volume_500", "Fuenfhundert", "500 Solves insgesamt", "volume", "🥉"),
    AchievementDef("volume_1000", "Eintausend", "1000 Solves insgesamt", "volume", "🥈"),
    AchievementDef("volume_5000", "Fuenftausend", "5000 Solves insgesamt", "volume", "🥇"),
    AchievementDef("volume_10000", "Zehntausend", "10000 Solves insgesamt", "volume", "🏆"),
]

# ============================================================
# Volume pro Cube — für 3x3 (relevantester Cube)
# Plus generische 'irgendein cube hat N solves'
# ============================================================

VOLUME_3X3: list[AchievementDef] = [
    AchievementDef("cube_3x3_100", "100 in 3x3", "100 Solves im 3x3-Cube", "volume", "🟦"),
    AchievementDef("cube_3x3_500", "500 in 3x3", "500 Solves im 3x3-Cube", "volume", "🟦"),
    AchievementDef("cube_3x3_1000", "1000 in 3x3", "1000 Solves im 3x3-Cube", "volume", "🟦"),
]

VOLUME_ANY_CUBE: list[AchievementDef] = [
    AchievementDef(
        "cube_any_500",
        "Cube-Spezialist",
        "Irgendein Cube hat 500+ Solves",
        "volume",
        "⭐",
    ),
    AchievementDef(
        "cube_any_1000",
        "Cube-Master",
        "Irgendein Cube hat 1000+ Solves",
        "volume",
        "🌟",
    ),
]

# ============================================================
# Speed — 3x3-PB-Marks
# ============================================================

SPEED_3X3: list[AchievementDef] = [
    AchievementDef("pb_3x3_sub_30", "Sub-30", "3x3-Solve unter 30 Sekunden", "speed", "🐌"),
    AchievementDef(
        "pb_3x3_sub_22_95", "Sub-22.95", "3x3-Solve unter 22.95 Sekunden", "speed", "🦔"
    ),
    AchievementDef("pb_3x3_sub_15", "Sub-15", "3x3-Solve unter 15 Sekunden", "speed", "🐢"),
    AchievementDef("pb_3x3_sub_12", "Sub-12", "3x3-Solve unter 12 Sekunden", "speed", "🐇"),
    AchievementDef("pb_3x3_sub_10", "Sub-10", "3x3-Solve unter 10 Sekunden", "speed", "⚡"),
    AchievementDef("pb_3x3_sub_8", "Sub-8", "3x3-Solve unter 8 Sekunden", "speed", "🚀"),
    AchievementDef("pb_3x3_sub_6_66", "Hex-Master", "3x3-Solve unter 6.66 Sekunden", "speed", "🔥"),
]

# ============================================================
# Variety — verschiedene Cubes ausprobiert
# ============================================================

VARIETY: list[AchievementDef] = [
    AchievementDef(
        "variety_5", "Vielseitig", "5 verschiedene Cube-Types ausprobiert", "variety", "🎲"
    ),
    AchievementDef(
        "variety_10",
        "Sammler",
        "10 verschiedene Cube-Types ausprobiert",
        "variety",
        "🎯",
    ),
]

# ============================================================
# Hardware — Inventar
# ============================================================

HARDWARE: list[AchievementDef] = [
    AchievementDef(
        "hardware_first",
        "Erstes Stück",
        "Erste Hardware im Inventar angelegt",
        "hardware",
        "🧊",
    ),
    AchievementDef(
        "hardware_5",
        "Cuber-Sammler",
        "5+ Hardware-Einträge im Inventar",
        "hardware",
        "📦",
    ),
]

# ============================================================
# Phase 8.5 — Tages-Volume + Marathon + Wochen-Disziplin + Streaks
# ============================================================

VOLUME_DAY: list[AchievementDef] = [
    AchievementDef(
        "volume_day_3x3_100", "100er-Tag (3x3)", "100 3x3-Solves an einem Tag", "volume", "📅"
    ),
    AchievementDef(
        "volume_day_2x2_100", "100er-Tag (2x2)", "100 2x2-Solves an einem Tag", "volume", "📅"
    ),
    AchievementDef(
        "volume_day_4x4_100", "100er-Tag (4x4)", "100 4x4-Solves an einem Tag", "volume", "📅"
    ),
    AchievementDef(
        "volume_day_5x5_100", "100er-Tag (5x5)", "100 5x5-Solves an einem Tag", "volume", "📅"
    ),
    AchievementDef(
        "volume_day_oh_100", "100er-Tag (OH)", "100 OH-Solves an einem Tag", "volume", "📅"
    ),
    AchievementDef(
        "volume_day_any_200",
        "Marathon-Tag",
        "200 Solves an einem Tag (egal welcher Cube)",
        "volume",
        "🏃",
    ),
    AchievementDef(
        "volume_week_3x3_100daily",
        "Wochen-Disziplin",
        "7 Tage in Folge je ≥100 3x3-Solves",
        "volume",
        "📈",
    ),
]

PB_PATTERNS: list[AchievementDef] = [
    AchievementDef(
        "pb_double",
        "Doppel-PB",
        "Zwei Single-PBs in zwei aufeinanderfolgenden Solves",
        "consistency",
        "⚡⚡",
    ),
    AchievementDef(
        "pb_synchronized",
        "Perfect Storm",
        "Single-PB und Ao5-PB im selben Solve",
        "consistency",
        "🌪",
    ),
    AchievementDef(
        "pb_triple_day",
        "Komplett-Bestform",
        "An einem Tag: Single-PB + Ao5-PB + Ao12-PB",
        "consistency",
        "🌟",
    ),
    AchievementDef(
        "consistency_5_under_ao12",
        "Konstant",
        "5 Solves in Folge unter persoenlichem Ao12",
        "consistency",
        "📏",
    ),
]

STREAKS: list[AchievementDef] = [
    AchievementDef(
        "streak_solve_7", "Wochen-Aktiv", "7 Tage in Folge mit mind. 1 Solve", "consistency", "🔥"
    ),
    AchievementDef(
        "streak_solve_30",
        "Monats-Disziplin",
        "30 Tage in Folge mit mind. 1 Solve",
        "consistency",
        "💪",
    ),
    AchievementDef(
        "streak_solve_100",
        "Cuber-Lifestyle",
        "100 Tage in Folge mit mind. 1 Solve",
        "consistency",
        "👑",
    ),
]

# ============================================================
# Alle zusammen — single source of truth
# ============================================================

ALL_ACHIEVEMENTS: list[AchievementDef] = (
    VOLUME_TOTAL
    + VOLUME_3X3
    + VOLUME_ANY_CUBE
    + VOLUME_DAY
    + SPEED_3X3
    + VARIETY
    + HARDWARE
    + STREAKS
    + PB_PATTERNS
)


def by_code(code: str) -> AchievementDef | None:
    """Lookup einer Definition. Liefert None bei unbekanntem code."""
    for d in ALL_ACHIEVEMENTS:
        if d.code == code:
            return d
    return None

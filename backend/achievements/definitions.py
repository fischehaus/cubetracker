"""Achievement-Definitionen (Phase 7a).

Statische Code-Konstanten — die DB speichert nur welche codes der User
schon unlocked hat (siehe `db.models.Achievement`). Vorteil: einfache
Migration zwischen App-Versionen, keine Schema-Aenderung wenn neue
Achievements dazukommen.

Categories steuern die UI-Gruppierung (lila Sektionen im AchievementsCard).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AchievementDef:
    code: str  # eindeutiger Identifier, in DB als unique-constraint
    name: str  # angezeigter Titel
    description: str  # ein-satz-erklaerung
    category: str  # "volume" | "speed" | "variety" | "hardware"
    icon: str  # emoji fuer UI


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
# Volume pro Cube — fuer 3x3 (relevantester Cube)
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
    AchievementDef("pb_3x3_sub_15", "Sub-15", "3x3-Solve unter 15 Sekunden", "speed", "🐢"),
    AchievementDef("pb_3x3_sub_12", "Sub-12", "3x3-Solve unter 12 Sekunden", "speed", "🐇"),
    AchievementDef("pb_3x3_sub_10", "Sub-10", "3x3-Solve unter 10 Sekunden", "speed", "⚡"),
    AchievementDef("pb_3x3_sub_8", "Sub-8", "3x3-Solve unter 8 Sekunden", "speed", "🚀"),
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
        "Erstes Stueck",
        "Erste Hardware im Inventar angelegt",
        "hardware",
        "🧊",
    ),
    AchievementDef(
        "hardware_5",
        "Cuber-Sammler",
        "5+ Hardware-Eintraege im Inventar",
        "hardware",
        "📦",
    ),
]

# ============================================================
# Alle zusammen — single source of truth
# ============================================================

ALL_ACHIEVEMENTS: list[AchievementDef] = (
    VOLUME_TOTAL + VOLUME_3X3 + VOLUME_ANY_CUBE + SPEED_3X3 + VARIETY + HARDWARE
)


def by_code(code: str) -> AchievementDef | None:
    """Lookup einer Definition. Liefert None bei unbekanntem code."""
    for d in ALL_ACHIEVEMENTS:
        if d.code == code:
            return d
    return None

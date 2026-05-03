"""Seed-Daten fuer Hardware-Inventar (Phase 5 / F16).

Quelle: User-Eingabe vom 2026-05-03, dokumentiert in
`docs/hardware-inventory-seed.md`.

Verwendet vom POST /hardware/seed Endpoint.
Das Format ist bewusst Python statt Markdown-Parsing: stabil + ohne
Parser-Risiko, der Mehraufwand ist minimal.

Konvention bei Mehrdeutigkeit:
- „QiYi Stickered" taucht in 5 Cube-Types auf — als 5 separate Eintraege
  mit primary_cube_type-Disambiguation gefuehrt.
- „Into Cube: Schwarz; Rot" wird als 2 Eintraege mit cube_type "3x3"
  importiert (Annahme: Standard-3x3-Variante in 2 Farben). Notiz im
  notes-Feld dokumentiert die Unklarheit, damit User es spaeter klaeren
  kann.
"""

from __future__ import annotations

# (cube_type, [(name, optional_notes), ...])
HARDWARE_SEED: list[tuple[str, list[tuple[str, str | None]]]] = [
    (
        "3x3",
        [
            ("Weilong v11", None),
            ("Gan 15", None),
            ("Gan I4", None),
            ("Tornado v3", None),
            ("QiYi MS", None),
            ("QiYi Stickered", None),
        ],
    ),
    (
        "4x4",
        [
            ("AoSu v7", None),
            ("Vin 4x4", None),
            ("Pillowed 4x4", None),
            ("Rubix 4x4", None),
        ],
    ),
    (
        "5x5",
        [
            ("X-Man Hong", None),
            ("Gan 562", None),
        ],
    ),
    (
        "7x7",
        [
            ("Moyu Meilong", None),
        ],
    ),
    (
        "2x2",
        [
            ("Vin 2x2", None),
            ("QiYi M Pro", None),
            ("QiYi Stickered", None),
        ],
    ),
    (
        "Square-1",
        [
            ("YJ MGC", None),
        ],
    ),
    (
        "Pyraminx",
        [
            ("Gan Pyraminx", None),
            ("Moyu Weilong", None),
            ("YJ Pyraminx", None),
            ("QiYi Stickered", None),
        ],
    ),
    (
        "Skewb",
        [
            ("Gan Skewb", None),
            ("YJ Skewb", None),
            ("QiYi Stickered", None),
        ],
    ),
    (
        "Clock",
        [
            ("QiYi Clock", None),
        ],
    ),
    (
        "Megaminx",
        [
            ("Dayan Pro", None),
            ("Moyu Mofang", None),
            ("QiYi Stickered", None),
        ],
    ),
    # OH (One-Handed) teilt physisch dieselben 3x3-Cubes — wir legen sie
    # NICHT separat an. Beim OH-Solve waehlt der User aus den 3x3-Eintraegen.
    # Spaeter koennte ein „secondary_cube_types"-Feld das explizit machen.
    (
        "Into Cube",
        [
            (
                "Into Cube Schwarz",
                "Aus Seed-Liste vom 2026-05-03; cube_type unklar — ggf. korrigieren",
            ),
            (
                "Into Cube Rot",
                "Aus Seed-Liste vom 2026-05-03; cube_type unklar — ggf. korrigieren",
            ),
        ],
    ),
]


def total_count() -> int:
    """Anzahl der Eintraege im Seed."""
    return sum(len(items) for _, items in HARDWARE_SEED)

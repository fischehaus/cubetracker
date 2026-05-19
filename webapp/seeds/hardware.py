"""Seed-Daten für Hardware-Inventar (Phase 5 / F16 + W.hardware-auto-seed).

Quelle: User-Eingabe vom 2026-05-03, dokumentiert in
`docs/hardware-inventory-seed.md`.

Seit W.hardware-auto-seed (2026-05-14): wird automatisch beim Register
neuer User + via Lifespan-Backfill für bestehende User ohne Hardware
angelegt. Default-Aktivierung: is_active=False — User aktiviert selbst
nur was er besitzt.

Konvention bei Mehrdeutigkeit:
- „QiYi Stickered" taucht in 5 Cube-Types auf — als 5 separate Einträge
  mit primary_cube_type-Disambiguation gefuehrt.
- „Into Cube: Schwarz; Rot" wird als 2 Einträge mit cube_type "3x3"
  importiert (Annahme: Standard-3x3-Variante in 2 Farben). Notiz im
  notes-Feld dokumentiert die Unklarheit, damit User es später klaeren
  kann.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

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
    # NICHT separat an. Beim OH-Solve wählt der User aus den 3x3-Eintraegen.
    # Später könnte ein „secondary_cube_types"-Feld das explizit machen.
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
    """Anzahl der Einträge im Seed."""
    return sum(len(items) for _, items in HARDWARE_SEED)


def seed_user_hardware(
    db: OrmSession, user_id: int, *, default_active: bool = False
) -> int:
    """Legt die HARDWARE_SEED-Liste für einen User an.

    Wird genutzt von:
    - /auth/register (neuer User → Default-Inventar)
    - Lifespan-Backfill (bestehende User ohne Hardware)
    - /hardware/seed (force-Recovery)

    `default_active=False` (neu seit W.hardware-auto-seed): User soll selbst
    bewusst aktivieren was er besitzt — sonst stehen ihm 30 Cubes ungewollt
    als "im Besitz" in den Selectoren. Mit `default_active=True` werden
    alle als aktiv angelegt (Legacy-Verhalten für Recovery-Use-Cases).

    Idempotenz: überprüft NICHT ob schon Hardware da ist — Caller muss
    selber entscheiden. Doppelaufruf legt Duplikate an.

    Returns: Anzahl angelegter Hardware-Rows.
    """
    # Lazy-import damit Circular-Import-Risiko ausgeschlossen
    from db.models import Hardware

    created = 0
    for cube_type, items in HARDWARE_SEED:
        for name, notes in items:
            db.add(
                Hardware(
                    user_id=user_id,
                    name=name,
                    primary_cube_type=cube_type,
                    notes=notes,
                    is_active=default_active,
                )
            )
            created += 1
    db.commit()
    return created


def backfill_users_without_hardware(db: OrmSession) -> tuple[int, int]:
    """Idempotenter Backfill: für jeden User ohne Hardware-Eintrag wird
    die Default-Liste mit is_active=False angelegt.

    Wird vom lifespan einmalig (pro Cold-Start) gerufen. Bei n=0 User-
    backfills = O(1) Query, ansonsten n * len(HARDWARE_SEED) Inserts.

    Returns: (users_seeded, total_rows_created).
    """
    from db.models import Hardware, User

    # User ohne irgendeine Hardware-Row: LEFT JOIN + WHERE hw.id IS NULL.
    # SQL ist effizienter als pro-User-Existenz-Check.
    stmt = (
        select(User.id)
        .outerjoin(Hardware, Hardware.user_id == User.id)
        .where(Hardware.id.is_(None))
        .group_by(User.id)
    )
    user_ids = list(db.execute(stmt).scalars().all())
    if not user_ids:
        return (0, 0)

    total_created = 0
    for uid in user_ids:
        total_created += seed_user_hardware(db, uid, default_active=False)
    return (len(user_ids), total_created)

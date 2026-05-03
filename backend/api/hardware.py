"""Hardware-CRUD-API (Phase 5 / F16).

Endpoints:
- GET    /hardware                 — Liste aller Hardware-Eintraege
- POST   /hardware                 — Neuer Eintrag
- GET    /hardware/{id}            — Einzelner Eintrag
- PATCH  /hardware/{id}            — Teil-Update
- DELETE /hardware/{id}            — Loeschen (Solve.hardware_id wird NULL)
- POST   /hardware/seed?force=...  — Seed-Daten aus seeds/hardware.py
                                     anlegen. Default ohne force: nur wenn
                                     Tabelle leer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Hardware
from db.schemas import HardwareCreate, HardwareRead, HardwareUpdate
from seeds.hardware import HARDWARE_SEED

router = APIRouter(prefix="/hardware", tags=["hardware"])


def _get_or_404(hw_id: int, db: OrmSession) -> Hardware:
    hw = db.get(Hardware, hw_id)
    if hw is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hardware {hw_id} not found",
        )
    return hw


@router.get("", response_model=list[HardwareRead])
def list_hardware(
    cube_type: str | None = Query(default=None, description="Filter auf primary_cube_type"),
    active_only: bool = Query(default=False, description="Nur is_active=true"),
    db: OrmSession = Depends(get_db),
) -> list[Hardware]:
    """Liste aller Hardware-Eintraege, sortiert: aktiv zuerst, dann name."""
    stmt = select(Hardware).order_by(
        Hardware.is_active.desc(), Hardware.primary_cube_type, Hardware.name
    )
    if cube_type is not None:
        stmt = stmt.where(Hardware.primary_cube_type == cube_type)
    if active_only:
        stmt = stmt.where(Hardware.is_active.is_(True))
    return list(db.scalars(stmt).all())


@router.post("", response_model=HardwareRead, status_code=status.HTTP_201_CREATED)
def create_hardware(payload: HardwareCreate, db: OrmSession = Depends(get_db)) -> Hardware:
    """Neuen Hardware-Eintrag anlegen.

    Namen sind nicht unique — derselbe Modellname in zwei cube_types
    ist ein gewollter Use-Case (z.B. „QiYi Stickered" als 3x3 + 2x2).
    """
    hw = Hardware(**payload.model_dump(exclude_unset=False))
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return hw


@router.get("/{hw_id}", response_model=HardwareRead)
def get_hardware(hw_id: int, db: OrmSession = Depends(get_db)) -> Hardware:
    return _get_or_404(hw_id, db)


@router.patch("/{hw_id}", response_model=HardwareRead)
def update_hardware(
    hw_id: int, payload: HardwareUpdate, db: OrmSession = Depends(get_db)
) -> Hardware:
    hw = _get_or_404(hw_id, db)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(hw, k, v)
    db.commit()
    db.refresh(hw)
    return hw


@router.delete("/{hw_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hardware(hw_id: int, db: OrmSession = Depends(get_db)) -> None:
    """Hardware loeschen.

    Betroffene Solves verlieren ihre hardware_id (FK ondelete=SET NULL).
    """
    hw = _get_or_404(hw_id, db)
    db.delete(hw)
    db.commit()


@router.post("/seed")
def seed_hardware(
    force: bool = Query(
        default=False,
        description="Wenn False: nur wenn Hardware-Tabelle leer ist. Wenn True: "
        "Eintraege werden zusaetzlich angelegt (kann Duplikate erzeugen).",
    ),
    db: OrmSession = Depends(get_db),
) -> dict[str, int | bool]:
    """Lade die Standard-Hardware aus seeds/hardware.py.

    Verwendet die User-Liste vom 2026-05-03 (~37 Eintraege ueber 11 Cube-Types).
    """
    existing = db.scalar(select(Hardware.id).limit(1))
    if existing is not None and not force:
        return {
            "loaded": 0,
            "skipped_because_not_empty": True,
            "use_force_to_load_anyway": True,
        }

    created = 0
    for cube_type, items in HARDWARE_SEED:
        for name, notes in items:
            db.add(
                Hardware(
                    name=name,
                    primary_cube_type=cube_type,
                    notes=notes,
                    is_active=True,
                )
            )
            created += 1
    db.commit()
    return {"loaded": created, "skipped_because_not_empty": False}

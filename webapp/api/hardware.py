"""Hardware-CRUD-API (Phase W) — Multi-User-Variante.

Per-User Hardware-Eintraege. Inkl. Seed-Endpoint (W.hardware-fix):
jeder User kann sich die Standard-Liste vom 2026-05-03 als
Starthilfe in sein leeres Inventar laden — empty-Check + Insert
beide auf user_id gefiltert (kein Cross-User-Bleed).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from achievements.service import run_achievement_check
from auth.deps import get_current_user
from db.database import get_db
from db.models import Hardware, Solve, User
from db.schemas import HardwareCreate, HardwareRead, HardwareUpdate
from seeds.hardware import seed_user_hardware

router = APIRouter(prefix="/hardware", tags=["hardware"])


def _get_or_404(hw_id: int, user: User, db: OrmSession) -> Hardware:
    """Hardware nach ID + user_id holen. 404 wenn fremd/nicht-existent."""
    hw = db.scalar(select(Hardware).where(Hardware.id == hw_id, Hardware.user_id == user.id))
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
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> list[Hardware]:
    """Liste eigener Hardware-Eintraege, sortiert: aktiv zuerst, dann name."""
    stmt = (
        select(Hardware)
        .where(Hardware.user_id == current_user.id)
        .order_by(Hardware.is_active.desc(), Hardware.primary_cube_type, Hardware.name)
    )
    if cube_type is not None:
        stmt = stmt.where(Hardware.primary_cube_type == cube_type)
    if active_only:
        stmt = stmt.where(Hardware.is_active.is_(True))
    return list(db.scalars(stmt).all())


@router.post("", response_model=HardwareRead, status_code=status.HTTP_201_CREATED)
def create_hardware(
    payload: HardwareCreate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Hardware:
    """Neuen Hardware-Eintrag fuer aktuellen User anlegen.

    Namen sind nicht unique — derselbe Modellname in zwei cube_types
    ist ein gewollter Use-Case (z.B. „QiYi Stickered" als 3x3 + 2x2).
    """
    hw = Hardware(user_id=current_user.id, **payload.model_dump(exclude_unset=False))
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return hw


@router.get("/suggest")
def suggest_hardware_for_cube(
    cube_type: str = Query(..., min_length=1, description="Cube-Type"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Empfehle die Hardware, die der User am haeufigsten fuer diesen
    Cube-Type benutzt hat. Fallback: erste eigene aktive Hardware mit
    passendem primary_cube_type.
    """
    # 1. Versuch: meiste eigene Solves
    stmt = (
        select(Solve.hardware_id, func.count().label("n"))
        .where(Solve.user_id == current_user.id)
        .where(Solve.cube_type == cube_type)
        .where(Solve.hardware_id.is_not(None))
        .group_by(Solve.hardware_id)
        .order_by(func.count().desc())
        .limit(1)
    )
    row = db.execute(stmt).first()
    if row is not None and row[0] is not None:
        return {
            "hardware_id": row[0],
            "count": int(row[1]),
            "cube_type": cube_type,
            "reason": "most_used",
        }

    # 2. Fallback: erste eigene aktive Hardware mit passendem primary_cube_type
    fallback = db.scalar(
        select(Hardware.id)
        .where(Hardware.user_id == current_user.id)
        .where(Hardware.primary_cube_type == cube_type)
        .where(Hardware.is_active.is_(True))
        .order_by(Hardware.name)
        .limit(1)
    )
    if fallback is not None:
        return {
            "hardware_id": fallback,
            "count": 0,
            "cube_type": cube_type,
            "reason": "first_active",
        }

    return {
        "hardware_id": None,
        "count": 0,
        "cube_type": cube_type,
        "reason": "none",
    }


@router.get("/{hw_id}", response_model=HardwareRead)
def get_hardware(
    hw_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Hardware:
    return _get_or_404(hw_id, current_user, db)


@router.patch("/{hw_id}", response_model=HardwareRead)
def update_hardware(
    hw_id: int,
    payload: HardwareUpdate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Hardware:
    hw = _get_or_404(hw_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(hw, k, v)
    db.commit()
    db.refresh(hw)
    return hw


@router.delete("/{hw_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hardware(
    hw_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """Hardware loeschen.

    Betroffene Solves verlieren ihre hardware_id (FK ondelete=SET NULL).
    """
    hw = _get_or_404(hw_id, current_user, db)
    db.delete(hw)
    db.commit()


@router.post("/seed")
def seed_hardware(
    force: bool = Query(
        default=False,
        description="Wenn False: nur wenn EIGENE Hardware-Liste leer ist. "
        "Wenn True: Eintraege werden zusaetzlich angelegt (kann Duplikate erzeugen).",
    ),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Lade die Standard-Hardware-Liste vom 2026-05-03 ins EIGENE Inventar.

    Seit W.hardware-auto-seed: Recovery-Endpoint. Neuer User bekommt eh
    automatisch beim Register die Liste (is_active=False). Dieser Endpoint
    bleibt fuer Force-Recovery falls jemand bewusst alles geloescht hat
    und neu starten will.
    """
    existing = db.scalar(
        select(Hardware.id).where(Hardware.user_id == current_user.id).limit(1)
    )
    if existing is not None and not force:
        return {
            "loaded": 0,
            "skipped_because_not_empty": True,
            "use_force_to_load_anyway": True,
        }

    created = seed_user_hardware(db, current_user.id, default_active=False)
    # Achievement-Recheck nach Bulk-Insert — Hardware-related Achievements
    # (z.B. "5 verschiedene Cubes") koennten getriggert werden.
    new_unlocks = run_achievement_check(db, current_user.id)
    return {
        "loaded": created,
        "skipped_because_not_empty": False,
        "newly_unlocked_achievements": new_unlocks,
    }


# ============================================================
# Bulk-Operationen (W.hardware-auto-seed)
# ============================================================


class HardwareBulkUpdate(BaseModel):
    """Body fuer Bulk-Patch — gleicher Patch wird auf alle IDs angewendet."""

    model_config = ConfigDict(extra="forbid")
    ids: list[int] = Field(min_length=1, max_length=200)
    is_active: bool | None = None


class HardwareBulkDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[int] = Field(min_length=1, max_length=200)


@router.post("/bulk-update")
def bulk_update_hardware(
    payload: HardwareBulkUpdate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, int]:
    """Setzt is_active auf eine Menge eigener Hardware-Eintraege.

    Multi-User: WHERE user_id = current_user filtert — fremde IDs werden
    stillschweigend ignoriert (kein 403, kein 404 — sonst leakt Existenz).
    """
    if payload.is_active is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mindestens ein Feld (is_active) muss gesetzt sein.",
        )
    # UPDATE statt loop: eine Query reicht, scoped auf user_id.
    rows = db.execute(
        select(Hardware).where(
            Hardware.user_id == current_user.id,
            Hardware.id.in_(payload.ids),
        )
    ).scalars().all()
    for hw in rows:
        hw.is_active = payload.is_active
    db.commit()
    return {"updated": len(rows)}


@router.post("/bulk-delete")
def bulk_delete_hardware(
    payload: HardwareBulkDelete,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, int]:
    """Loescht eine Menge eigener Hardware-Eintraege.

    Betroffene Solves verlieren ihre hardware_id (FK ondelete=SET NULL).
    Fremde IDs werden ignoriert.
    """
    rows = db.execute(
        select(Hardware).where(
            Hardware.user_id == current_user.id,
            Hardware.id.in_(payload.ids),
        )
    ).scalars().all()
    for hw in rows:
        db.delete(hw)
    db.commit()
    return {"deleted": len(rows)}

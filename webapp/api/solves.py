"""Solves-CRUD-API (Phase W) — Multi-User-Variante.

Alle Endpoints benoetigen Auth via current_user-Dep.
ALLE Queries filtern auf user_id == current_user.id.

Cross-Tenant-Sicherheits-Checks:
- POST /solves: session_id + hardware_id muessen dem aktuellen User gehoeren
- PATCH /solves/{id}: dito + Solve selbst muss dem User gehoeren
- GET/PATCH/DELETE /solves/{id}: Solve muss dem User gehoeren (sonst 404,
  NICHT 403 — verhindert Probing fremder IDs)

Achievement-Check + PB-Detection sind DEAKTIVIERT in W.3 — kommen in W.4
wenn der Achievement/Challenge-Stack per-User portiert ist.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from db.database import get_db
from db.models import Hardware, Session as DbSession, Solve, User
from db.schemas import SolveCreate, SolveRead, SolveUpdate

router = APIRouter(prefix="/solves", tags=["solves"])


def _get_solve_or_404(solve_id: int, user: User, db: OrmSession) -> Solve:
    """Solve nach ID UND user_id holen. 404 wenn anderer User oder nicht existent.

    KRITISCH: NIE nur db.get(Solve, id) — das wuerde fremde Solves zurueckgeben!
    """
    solve = db.scalar(select(Solve).where(Solve.id == solve_id, Solve.user_id == user.id))
    if solve is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solve {solve_id} not found",
        )
    return solve


def _verify_session_ownership(session_id: int | None, user: User, db: OrmSession) -> None:
    """Wenn session_id gesetzt: pruefe dass die Session dem User gehoert.

    Sonst koennte ein User Solves in fremde Sessions einhaengen.
    """
    if session_id is None:
        return
    exists = db.scalar(
        select(DbSession.id).where(DbSession.id == session_id, DbSession.user_id == user.id)
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} gehoert nicht dem aktuellen User oder existiert nicht",
        )


def _verify_hardware_ownership(hardware_id: int | None, user: User, db: OrmSession) -> None:
    """Wenn hardware_id gesetzt: pruefe dass die Hardware dem User gehoert."""
    if hardware_id is None:
        return
    exists = db.scalar(
        select(Hardware.id).where(Hardware.id == hardware_id, Hardware.user_id == user.id)
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hardware {hardware_id} gehoert nicht dem aktuellen User oder existiert nicht",
        )


@router.get("", response_model=list[SolveRead])
def list_solves(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    alg_case: str | None = Query(
        default=None,
        description="Filter auf alg_case (z.B. 'PLL-Tperm') fuer DrillCard-Liste",
    ),
    limit: int = Query(default=100, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> list[Solve]:
    """Liste der eigenen Solves, neueste zuerst."""
    stmt = select(Solve).where(Solve.user_id == current_user.id).order_by(Solve.timestamp.desc())
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    if alg_case is not None:
        stmt = stmt.where(Solve.alg_case == alg_case)
    stmt = stmt.limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


@router.post("", response_model=SolveRead, status_code=status.HTTP_201_CREATED)
def create_solve(
    payload: SolveCreate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Neuen Solve fuer aktuellen User anlegen.

    Cross-Refs (session_id, hardware_id) werden auf Ownership geprueft.
    """
    _verify_session_ownership(payload.session_id, current_user, db)
    _verify_hardware_ownership(payload.hardware_id, current_user, db)

    data = payload.model_dump(exclude_unset=False)
    if data.get("timestamp") is None:
        data["timestamp"] = datetime.now(UTC)
    solve = Solve(user_id=current_user.id, **data)
    db.add(solve)
    db.commit()
    db.refresh(solve)
    return solve


@router.get("/{solve_id}", response_model=SolveRead)
def get_solve(
    solve_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Einzelnen Solve nach ID holen (nur eigene)."""
    return _get_solve_or_404(solve_id, current_user, db)


@router.patch("/{solve_id}", response_model=SolveRead)
def update_solve(
    solve_id: int,
    payload: SolveUpdate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Teil-Update eines Solves (alle Felder optional, nur eigene)."""
    solve = _get_solve_or_404(solve_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)

    # Cross-Refs revalidieren wenn geaendert
    if "session_id" in update_data:
        _verify_session_ownership(update_data["session_id"], current_user, db)
    if "hardware_id" in update_data:
        _verify_hardware_ownership(update_data["hardware_id"], current_user, db)

    for key, value in update_data.items():
        setattr(solve, key, value)
    db.commit()
    db.refresh(solve)
    return solve


@router.delete("/{solve_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_solve(
    solve_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """Solve loeschen (nur eigene)."""
    solve = _get_solve_or_404(solve_id, current_user, db)
    db.delete(solve)
    db.commit()

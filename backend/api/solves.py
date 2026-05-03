"""Solves-CRUD-API.

Endpoints:
- GET    /solves           — Liste, mit optionalen Filtern (cube_type, session_id, limit, offset)
- POST   /solves           — Neuer Solve
- GET    /solves/{id}      — Einzelner Solve
- PATCH  /solves/{id}      — Teil-Update (z.B. plus_two/dnf-Toggle)
- DELETE /solves/{id}      — Loeschen
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from achievements.service import run_achievement_check
from challenges.service import update_today_progress_for_solve
from db.database import get_db
from db.models import Solve
from db.schemas import SolveCreate, SolveRead, SolveUpdate

router = APIRouter(prefix="/solves", tags=["solves"])


def _set_unlock_header(response: Response, db: OrmSession) -> None:
    """Nach Solve-Mutation: Achievement-Check + Challenge-Progress.
    Beides via Response-Header zurueck, sodass Frontend Toasts feuern
    kann.
    """
    new_unlocks = run_achievement_check(db)
    if new_unlocks:
        response.headers["X-Achievements-Unlocked"] = ",".join(new_unlocks)


def _set_unlock_header_with_solve(response: Response, db: OrmSession, solve: Solve | None) -> None:
    """Achievement-Check + Challenge-Progress fuer create/update.
    Bei delete reicht der achievement-check (es gibt keinen 'solve' mehr).
    """
    _set_unlock_header(response, db)
    if solve is not None:
        completed_ids = update_today_progress_for_solve(db, solve)
        if completed_ids:
            response.headers["X-Challenges-Completed"] = ",".join(str(i) for i in completed_ids)


def _get_solve_or_404(solve_id: int, db: OrmSession) -> Solve:
    """Solve nach ID holen, sonst 404."""
    solve = db.get(Solve, solve_id)
    if solve is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solve {solve_id} not found",
        )
    return solve


@router.get("", response_model=list[SolveRead])
def list_solves(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    alg_case: str | None = Query(
        default=None,
        description="Phase 8.1: Filter auf alg_case (z.B. 'PLL-Tperm') fuer DrillCard-Liste",
    ),
    limit: int = Query(default=100, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    db: OrmSession = Depends(get_db),
) -> list[Solve]:
    """Liste aller Solves, neueste zuerst."""
    stmt = select(Solve).order_by(Solve.timestamp.desc())
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
    response: Response,
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Neuen Solve anlegen."""
    data = payload.model_dump(exclude_unset=False)
    if data.get("timestamp") is None:
        data["timestamp"] = datetime.now(UTC)
    solve = Solve(**data)
    db.add(solve)
    db.commit()
    db.refresh(solve)
    _set_unlock_header_with_solve(response, db, solve)
    return solve


@router.get("/{solve_id}", response_model=SolveRead)
def get_solve(solve_id: int, db: OrmSession = Depends(get_db)) -> Solve:
    """Einzelnen Solve nach ID holen."""
    return _get_solve_or_404(solve_id, db)


@router.patch("/{solve_id}", response_model=SolveRead)
def update_solve(
    solve_id: int,
    payload: SolveUpdate,
    response: Response,
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Teil-Update eines Solves (alle Felder optional)."""
    solve = _get_solve_or_404(solve_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(solve, key, value)
    db.commit()
    db.refresh(solve)
    # PATCH kann auch DNF/+2-Toggle sein → Challenge-Progress neu rechnen
    _set_unlock_header_with_solve(response, db, solve)
    return solve


@router.delete("/{solve_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_solve(solve_id: int, response: Response, db: OrmSession = Depends(get_db)) -> None:
    """Solve loeschen.

    Achievements bleiben unlocked (monotonic), aber Schwellwerte
    koennten neu unterschritten werden — wir lassen das bewusst stehen.
    """
    solve = _get_solve_or_404(solve_id, db)
    db.delete(solve)
    db.commit()
    _set_unlock_header(response, db)

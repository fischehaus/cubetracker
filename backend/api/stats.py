"""Stats-API.

Endpoint:
- GET /stats?cube_type=X&session_id=Y → vollstaendige Stats fuer
  die gefilterte Solve-Menge (Avg5/12/100, Best, Worst, Mean,
  current + best Averages, Best-Solve-ID fuer Frontend-Marker).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Solve
from stats.calc import SolvePoint, compute_stats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert Stats fuer die gefilterte Solve-Menge."""
    stmt = select(Solve).order_by(Solve.timestamp.asc())  # asc fuer "current ist letzte"
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)

    rows = db.scalars(stmt).all()
    points = [
        SolvePoint(
            time_ms=s.time_ms,
            dnf=s.dnf,
            plus_two=s.plus_two,
            solve_id=s.id,
        )
        for s in rows
    ]
    result = compute_stats(points)

    return {
        "count": result.count,
        "count_valid": result.count_valid,
        "count_dnf": result.count_dnf,
        "best_ms": result.best_ms,
        "best_solve_id": result.best_solve_id,
        "worst_ms": result.worst_ms,
        "worst_solve_id": result.worst_solve_id,
        "mean_ms": result.mean_ms,
        "current_ao5": result.current_ao5,
        "current_ao12": result.current_ao12,
        "current_ao100": result.current_ao100,
        "best_ao5": result.best_ao5,
        "best_ao12": result.best_ao12,
        "best_ao100": result.best_ao100,
        "filter": {"cube_type": cube_type, "session_id": session_id},
    }

"""Stats-API.

Endpoints:
- GET /stats?cube_type=X&session_id=Y → vollstaendige Stats fuer
  die gefilterte Solve-Menge (Avg5/12/100, Best, Worst, Mean,
  current + best Averages, Best-Solve-ID fuer Frontend-Marker).
- GET /stats/by-cube → Stats pro Cube-Type, fuer Multi-Cube-Vergleich.
  Liefert pro cube_type: count, current_ao5, mean_ms, best_ms und
  einen „form_factor" = current_ao5 / mean_ms (kleiner = aktuell besser
  als Gesamtdurchschnitt).
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

# Mindest-Solves pro Cube, damit form_factor sinnvoll ist (current_ao5 braucht
# 5, mean braucht ein paar mehr fuer Aussagekraft)
MIN_SOLVES_FOR_BY_CUBE = 5


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


@router.get("/by-cube")
def get_stats_by_cube(
    session_id: int | None = Query(default=None, description="Optional auf Session einschraenken"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats gruppiert pro Cube-Type — Basis fuer Multi-Cube-Vergleich.

    Pro Cube-Type werden geliefert:
      - count            : Anzahl aller Solves (inkl. DNF)
      - count_valid      : Anzahl valider Solves
      - current_ao5      : letzte 5 (oder None bei <5 validen)
      - mean_ms          : arithmetisches Mittel valider Solves
      - best_ms          : Best-Single
      - form_factor      : current_ao5 / mean_ms
                           ( < 1 = aktuell besser als Gesamtschnitt )
                           ( > 1 = aktuell schlechter           )

    Cubes mit weniger als MIN_SOLVES_FOR_BY_CUBE Solves werden uebersprungen.
    Sortierung: form_factor aufsteigend (beste aktuelle Form zuerst). Cubes
    ohne form_factor (zu wenige Solves fuer ao5) landen ans Ende.
    """
    stmt = select(Solve).order_by(Solve.timestamp.asc())
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    # Gruppieren nach cube_type, Reihenfolge (chronologisch) bewahren
    by_cube: dict[str, list[Solve]] = {}
    for s in rows:
        by_cube.setdefault(s.cube_type, []).append(s)

    cubes: list[dict[str, Any]] = []
    for cube_type, group in by_cube.items():
        if len(group) < MIN_SOLVES_FOR_BY_CUBE:
            continue
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        stats = compute_stats(points)
        form_factor: float | None = None
        if stats.current_ao5 is not None and stats.mean_ms is not None and stats.mean_ms > 0:
            form_factor = round(stats.current_ao5 / stats.mean_ms, 4)
        cubes.append(
            {
                "cube_type": cube_type,
                "count": stats.count,
                "count_valid": stats.count_valid,
                "current_ao5": stats.current_ao5,
                "mean_ms": stats.mean_ms,
                "best_ms": stats.best_ms,
                "form_factor": form_factor,
            }
        )

    # Sortieren: form_factor asc (beste Form zuerst), None ans Ende
    cubes.sort(key=lambda c: (c["form_factor"] is None, c["form_factor"] or 0))

    return {
        "cubes": cubes,
        "filter": {"session_id": session_id},
    }

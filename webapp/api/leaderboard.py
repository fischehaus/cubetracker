"""Leaderboard-API (Phase W.10) — Vergleich mit accepted-Friends.

Endpoints:
    GET /leaderboard/cube-types         — Cube-Types fuer Picker
    GET /leaderboard?cube_type=3x3      — Bestenliste fuer einen Cube-Type

Privacy:
- Nur accepted-Friends + Self tauchen auf
- KEINE Emails im Output
- Display-Name-Fallback "User #ID" fuer Friends ohne Name

Rate-Limit: 60/min — etwas hoeher als CRUD weil das Frontend bei
Cube-Type-Wechsel re-fetched, aber nicht massiv (nur authentifizierte User).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import User
from leaderboard.service import LeaderboardRow, build_leaderboard, list_cube_types

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

LEADERBOARD_LIMIT = "60/minute"


# ============================================================
# Schemas
# ============================================================


class LeaderboardEntry(BaseModel):
    """Eine Zeile in der Bestenliste — frontend-friendly Shape."""

    user_id: int
    display_name: str
    is_me: bool
    cube_type: str
    solve_count_total: int
    solve_count_30d: int
    best_ms: int | None
    best_ao5: int | None
    best_ao12: int | None
    current_ao5: int | None
    current_ao12: int | None
    last_solve_at: str | None


class LeaderboardResponse(BaseModel):
    cube_type: str
    rows: list[LeaderboardEntry]
    count: int


class CubeTypesResponse(BaseModel):
    cube_types: list[str]


def _to_entry(row: LeaderboardRow) -> LeaderboardEntry:
    return LeaderboardEntry(
        user_id=row.user_id,
        display_name=row.display_name,
        is_me=row.is_me,
        cube_type=row.cube_type,
        solve_count_total=row.solve_count_total,
        solve_count_30d=row.solve_count_30d,
        best_ms=row.best_ms,
        best_ao5=row.best_ao5,
        best_ao12=row.best_ao12,
        current_ao5=row.current_ao5,
        current_ao12=row.current_ao12,
        last_solve_at=row.last_solve_at.isoformat() if row.last_solve_at else None,
    )


# ============================================================
# Endpoints
# ============================================================


@router.get("/cube-types", response_model=CubeTypesResponse)
@limiter.limit(LEADERBOARD_LIMIT)
def get_cube_types(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> CubeTypesResponse:
    """Liste aller Cube-Types die der current_user ODER seine accepted-Friends
    benutzt haben. Sortiert nach Solve-Volumen (haeufigste oben).

    Frontend nutzt das fuer den Cube-Type-Picker. Wenn die Liste leer ist
    (kein User hat irgendwas gesolved), zeigt das Frontend eine
    Default-Auswahl an.
    """
    cube_types = list_cube_types(db, current_user)
    return CubeTypesResponse(cube_types=cube_types)


@router.get("", response_model=LeaderboardResponse)
@limiter.limit(LEADERBOARD_LIMIT)
def get_leaderboard(
    request: Request,
    cube_type: str = Query(..., min_length=1, max_length=32),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> LeaderboardResponse:
    """Bestenliste fuer einen Cube-Type — Self + accepted-Friends.

    Sortierung: Self immer oben, dann Friends nach best_ms ASC (None = Ende).
    Wer noch keine Solves fuer diesen Cube hat, bekommt None-Stats und landet
    am Ende — sichtbar damit man Lust kriegt zum Solven.

    Keine Pagination — bei Friends-Phase erwarten wir <30 Eintraege.
    """
    rows = build_leaderboard(db, current_user, cube_type)
    return LeaderboardResponse(
        cube_type=cube_type,
        rows=[_to_entry(r) for r in rows],
        count=len(rows),
    )

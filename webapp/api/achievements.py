"""Achievements-API (Phase W) — Multi-User-Variante.

Pro User:
- GET  /achievements          — Definitionen + unlocked-Status (eigene)
- POST /achievements/recheck  — Recheck (eigene Daten)

Auto-Trigger nach Solve-Mutationen passiert in api/solves.py.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from achievements.definitions import ALL_ACHIEVEMENTS
from achievements.service import run_achievement_check
from auth.deps import get_current_user
from db.database import get_db
from db.models import Achievement, User

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
def list_achievements(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Alle Definitionen mit unlocked-Status fuer den aktuellen User."""
    unlocked_rows = db.scalars(
        select(Achievement).where(Achievement.user_id == current_user.id)
    ).all()
    unlocked_at_by_code: dict[str, str] = {
        a.code: a.unlocked_at.isoformat() for a in unlocked_rows
    }
    return [
        {
            "code": d.code,
            "name": d.name,
            "description": d.description,
            "category": d.category,
            "icon": d.icon,
            "unlocked_at": unlocked_at_by_code.get(d.code),
        }
        for d in ALL_ACHIEVEMENTS
    ]


@router.post("/recheck")
def recheck_achievements(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Manueller Voll-Recheck (z.B. nach Import grosser Datenmengen)."""
    new_codes = run_achievement_check(db, current_user.id)
    total_unlocked = db.scalar(
        select(func.count(Achievement.id)).where(Achievement.user_id == current_user.id)
    )
    return {
        "newly_unlocked": new_codes,
        "newly_unlocked_count": len(new_codes),
        "total_unlocked": int(total_unlocked or 0),
    }

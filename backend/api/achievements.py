"""Achievement-API (Phase 7a).

Endpoints:
- GET  /achievements           — Liste aller Definitionen + unlocked-Status
- POST /achievements/recheck   — Manueller Check (fuer Initial-Backfill)

Auto-Trigger: nach jeder Solve-Mutation (POST/PATCH/DELETE) sowie nach
csTimer-Import laeuft `run_achievement_check` automatisch. Die Endpoints
hier sind explizit fuer das UI (anzeige) und manuelle re-evaluation.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from achievements.definitions import ALL_ACHIEVEMENTS
from achievements.service import run_achievement_check
from db.database import get_db
from db.models import Achievement

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
def list_achievements(db: OrmSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Alle Definitionen (~17) zusammen mit unlocked-Status.

    Frontend rendert sie als Grid mit locked/unlocked-Optik. Reihenfolge
    ist die Definitionsreihenfolge (Volume → 3x3-Volume → Any-Cube → Speed
    → Variety → Hardware) — bewusst ueberraschend stabil, damit das UI
    nicht beim Unlock springt.
    """
    unlocked_rows = db.scalars(select(Achievement)).all()
    unlocked_at_by_code: dict[str, str] = {a.code: a.unlocked_at.isoformat() for a in unlocked_rows}

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
def recheck_achievements(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Manueller Voll-Recheck.

    Use-cases:
    - Initial-Backfill nach Import von Bestandsdaten
    - Wenn Definitionen sich aendern (neue Schwellwerte)
    - Debug
    """
    new_codes = run_achievement_check(db)
    total_unlocked = db.scalar(select(func.count(Achievement.id)))
    return {
        "newly_unlocked": new_codes,
        "newly_unlocked_count": len(new_codes),
        "total_unlocked": int(total_unlocked or 0),
    }

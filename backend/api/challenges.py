"""Daily-Challenges-API (Phase 7b).

Endpoints:
- GET    /challenges/today               — heutige Challenges (auto-generiert)
- POST   /challenges/today/regenerate    — neu generieren (verwirft heutige)
- POST   /challenges/{id}/dismiss        — vom User weggeklickt
- GET    /challenges/history?days=N      — vergangene Challenges (default 30 Tage)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from challenges.service import get_or_generate_today, regenerate_today
from db.database import get_db
from db.models import Challenge

router = APIRouter(prefix="/challenges", tags=["challenges"])


def _challenge_to_dict(c: Challenge) -> dict[str, Any]:
    return {
        "id": c.id,
        "kind": c.kind,
        "cube_type": c.cube_type,
        "target_value": c.target_value,
        "progress": c.progress,
        "generated_for_date": (
            c.generated_for_date.date().isoformat() if c.generated_for_date else None
        ),
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        "dismissed": c.dismissed,
        # description: caller (frontend) generiert das aus kind+cube+target,
        # weil sich UI-Texte ohne Backend-deploy aendern koennen sollen
    }


@router.get("/today")
def get_today(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Heutige Challenges. Wenn fuer heute noch keine existieren, wird
    eine neue Generierung ausgeloest.
    """
    challenges = get_or_generate_today(db)
    return {
        "date": datetime.now(UTC).date().isoformat(),
        "challenges": [_challenge_to_dict(c) for c in challenges],
    }


@router.post("/today/regenerate")
def regenerate(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Verwirft heutige Challenges und generiert frisch.

    Use-cases: User mag die generierten nicht, oder Stats haben sich
    geaendert. Maximal sinnvoll 1x pro Tag.
    """
    challenges = regenerate_today(db)
    return {
        "date": datetime.now(UTC).date().isoformat(),
        "challenges": [_challenge_to_dict(c) for c in challenges],
    }


@router.post("/{challenge_id}/dismiss")
def dismiss_challenge(challenge_id: int, db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """User klickt eine Challenge weg. Bleibt in DB als historischer
    Eintrag, ist aber nicht mehr aktiv.
    """
    ch = db.get(Challenge, challenge_id)
    if ch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge {challenge_id} not found",
        )
    ch.dismissed = True
    db.commit()
    db.refresh(ch)
    return _challenge_to_dict(ch)


@router.get("/history")
def get_history(
    days: int = Query(default=30, ge=1, le=365),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Vergangene Challenges der letzten N Tage (inkl. heute)."""
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days)
    rows = list(
        db.scalars(
            select(Challenge)
            .where(Challenge.generated_for_date >= cutoff)
            .order_by(Challenge.generated_for_date.desc())
        ).all()
    )
    return {"challenges": [_challenge_to_dict(c) for c in rows]}

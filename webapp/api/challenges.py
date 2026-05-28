"""Daily-Challenges-API (Phase W) — Multi-User-Variante.

Pro User:
- GET    /challenges/today               — heutige Challenges (auto-generiert)
- POST   /challenges/today/regenerate    — neu generieren
- POST   /challenges/{id}/dismiss        — vom User weggeklickt (eigene only)
- GET    /challenges/history?days=N      — vergangene Challenges (eigene)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from challenges.service import get_or_generate_today, regenerate_today
from db.database import get_db
from db.models import Challenge, User

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
    }


@router.get("/today")
def get_today(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Heutige Challenges des aktuellen Users (auto-generiert wenn fehlend)."""
    challenges = get_or_generate_today(db, current_user.id)
    return {
        "date": datetime.now(UTC).date().isoformat(),
        "challenges": [_challenge_to_dict(c) for c in challenges],
    }


@router.post("/today/regenerate")
def regenerate(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Verwirft + regeneriert heutige Challenges des Users."""
    challenges = regenerate_today(db, current_user.id)
    return {
        "date": datetime.now(UTC).date().isoformat(),
        "challenges": [_challenge_to_dict(c) for c in challenges],
    }


@router.post("/{challenge_id}/dismiss")
def dismiss_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """User klickt eigene Challenge weg. Fremde -> 404 (kein Probing)."""
    ch = db.scalar(
        select(Challenge)
        .where(Challenge.id == challenge_id)
        .where(Challenge.user_id == current_user.id)
    )
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
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Vergangene Challenges der letzten N Tage (eigene only)."""
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days)
    rows = list(
        db.scalars(
            select(Challenge)
            .where(Challenge.user_id == current_user.id)
            .where(Challenge.generated_for_date >= cutoff)
            .order_by(Challenge.generated_for_date.desc())
        ).all()
    )
    return {"challenges": [_challenge_to_dict(c) for c in rows]}

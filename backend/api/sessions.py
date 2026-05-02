"""Sessions-API (minimal in F2).

Endpoints:
- GET /sessions       — Liste aller Sessions
- GET /sessions/{id}  — Einzelne Session

POST/PATCH/DELETE kommen in F14 (Sessions-Frontend).
Sessions werden im MVP primaer ueber den csTimer-Import (F4) angelegt.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Session as DbSession
from db.schemas import SessionRead

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionRead])
def list_sessions(db: OrmSession = Depends(get_db)) -> list[DbSession]:
    """Alle Sessions, alphabetisch nach Name."""
    stmt = select(DbSession).order_by(DbSession.name)
    return list(db.scalars(stmt).all())


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: OrmSession = Depends(get_db)) -> DbSession:
    """Einzelne Session."""
    session = db.get(DbSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    return session

"""Sessions-API.

Endpoints:
- GET    /sessions                       — Liste aller Sessions
- POST   /sessions                       — Neue Session anlegen
- GET    /sessions/{id}                  — Einzelne Session
- PATCH  /sessions/{id}                  — Session umbenennen / Notizen aendern
- DELETE /sessions/{id}                  — Session loeschen (Solves bleiben,
                                            session_id wird NULL via FK)
- GET    /sessions/suggest?cube_type=X   — empfohlene Session fuer einen
                                            Cube-Type (jene, in der der User
                                            die meisten Solves dieses Cubes hat)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Session as DbSession
from db.models import Solve
from db.schemas import SessionCreate, SessionRead, SessionUpdate

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _get_or_404(session_id: int, db: OrmSession) -> DbSession:
    s = db.get(DbSession, session_id)
    if s is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    return s


@router.get("", response_model=list[SessionRead])
def list_sessions(db: OrmSession = Depends(get_db)) -> list[DbSession]:
    """Alle Sessions, alphabetisch nach Name."""
    stmt = select(DbSession).order_by(DbSession.name)
    return list(db.scalars(stmt).all())


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: OrmSession = Depends(get_db)) -> DbSession:
    """Neue Session anlegen.

    Manuell angelegte Sessions haben kein cstimer_session_id (None).
    """
    s = DbSession(**payload.model_dump(exclude_unset=False))
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/suggest")
def suggest_session_for_cube(
    cube_type: str = Query(..., min_length=1, description="Cube-Type"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Empfehle die Session, in der der User am meisten Solves dieses
    Cube-Types hat.

    Heuristik: COUNT(solves) GROUP BY session_id, beschraenkt auf
    Solves mit cube_type=<param>. Liefert die top-1.

    Liefert `{"session_id": null}` wenn:
    - es keine Solves dieses Cubes gibt, oder
    - alle Solves keine session_id haben (session-los)
    """
    stmt = (
        select(Solve.session_id, func.count().label("n"))
        .where(Solve.cube_type == cube_type)
        .where(Solve.session_id.is_not(None))
        .group_by(Solve.session_id)
        .order_by(func.count().desc())
        .limit(1)
    )
    row = db.execute(stmt).first()
    if row is None:
        return {"session_id": None, "count": 0, "cube_type": cube_type}
    session_id, count = row
    return {"session_id": session_id, "count": int(count), "cube_type": cube_type}


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: OrmSession = Depends(get_db)) -> DbSession:
    """Einzelne Session."""
    return _get_or_404(session_id, db)


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(
    session_id: int, payload: SessionUpdate, db: OrmSession = Depends(get_db)
) -> DbSession:
    """Teil-Update einer Session (umbenennen, Notizen aendern, scramble_type)."""
    s = _get_or_404(session_id, db)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: OrmSession = Depends(get_db)) -> None:
    """Session loeschen.

    Betroffene Solves verlieren ihre session_id (FK ondelete=SET NULL),
    bleiben aber erhalten.
    """
    s = _get_or_404(session_id, db)
    db.delete(s)
    db.commit()

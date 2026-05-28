"""Sessions-API (Phase W) — Multi-User-Variante.

Alle Endpoints brauchen Auth + filtern auf user_id == current_user.id.

Cross-Tenant-Sicherheits-Checks:
- DELETE /sessions/{id}?move_solves_to=Y: Y muss demselben User gehören
- POST /sessions/{id}/merge?target_id=Y: Y muss demselben User gehören
- /suggest filtert auf user-eigene Solves
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user, require_not_demo
from db.database import get_db
from db.models import Session as DbSession, Solve, User
from db.schemas import SessionCreate, SessionRead, SessionUpdate

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _get_or_404(session_id: int, user: User, db: OrmSession) -> DbSession:
    """Session nach ID + user_id holen. 404 wenn fremd/nicht-existent."""
    s = db.scalar(
        select(DbSession).where(DbSession.id == session_id, DbSession.user_id == user.id)
    )
    if s is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    return s


@router.get("", response_model=list[SessionRead])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> list[DbSession]:
    """Alle eigenen Sessions, alphabetisch nach Name."""
    stmt = (
        select(DbSession).where(DbSession.user_id == current_user.id).order_by(DbSession.name)
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> DbSession:
    """Neue Session anlegen.

    cstimer_session_id ist pro User unique (DB-Constraint), nicht global —
    so kollidieren zwei verschiedene User mit gleichem cstimer-Export nicht.
    """
    s = DbSession(user_id=current_user.id, **payload.model_dump(exclude_unset=False))
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/suggest")
def suggest_session_for_cube(
    cube_type: str = Query(..., min_length=1, description="Cube-Type"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Empfehle die Session, in der der User am meisten Solves dieses
    Cube-Types hat (per-User natuerlich).
    """
    stmt = (
        select(Solve.session_id, func.count().label("n"))
        .where(Solve.user_id == current_user.id)
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
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> DbSession:
    return _get_or_404(session_id, current_user, db)


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> DbSession:
    s = _get_or_404(session_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    move_solves_to: int | None = Query(
        default=None,
        description="Wenn gesetzt: Solves der zu löschenden Session werden "
        "VOR dem Löschen auf diese Ziel-Session umgelegt. Sonst: "
        "session_id wird NULL (FK SET NULL).",
    ),
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> None:
    """Session löschen.

    Default: Betroffene Solves verlieren ihre session_id (FK SET NULL).
    Mit `move_solves_to=Y`: Solves werden VOR dem Löschen zu Y umgelegt.
    Y muss dem aktuellen User gehören!
    """
    s = _get_or_404(session_id, current_user, db)

    if move_solves_to is not None:
        if move_solves_to == session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="move_solves_to darf nicht die zu löschende Session sein",
            )
        # Ziel muss existieren UND demselben User gehören
        _get_or_404(move_solves_to, current_user, db)
        # Solves umlegen — auch hier user_id-Filter zur Sicherheit
        db.execute(
            update(Solve)
            .where(Solve.session_id == session_id, Solve.user_id == current_user.id)
            .values(session_id=move_solves_to)
        )

    db.delete(s)
    db.commit()


@router.post("/{session_id}/merge", response_model=SessionRead)
def merge_session(
    session_id: int,
    target_id: int = Query(..., description="Ziel-Session, in die gemerged wird"),
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> DbSession:
    """Source-Session in target mergen. Beide müssen demselben User gehören."""
    if session_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source und Target dürfen nicht gleich sein",
        )
    source = _get_or_404(session_id, current_user, db)
    target = _get_or_404(target_id, current_user, db)

    db.execute(
        update(Solve)
        .where(Solve.session_id == session_id, Solve.user_id == current_user.id)
        .values(session_id=target_id)
    )

    if source.notes:
        prefix = f"[merged from '{source.name}']"
        if target.notes:
            target.notes = f"{target.notes}\n\n{prefix} {source.notes}"
        else:
            target.notes = f"{prefix} {source.notes}"

    db.delete(source)
    db.commit()
    db.refresh(target)
    return target

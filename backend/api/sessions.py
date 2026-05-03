"""Sessions-API.

Endpoints:
- GET    /sessions                       — Liste aller Sessions
- POST   /sessions                       — Neue Session anlegen
- GET    /sessions/{id}                  — Einzelne Session
- PATCH  /sessions/{id}                  — Session umbenennen / Notizen aendern
- DELETE /sessions/{id}?move_solves_to=Y — Loeschen. Default: Solves bleiben
                                            mit session_id=NULL. Mit
                                            move_solves_to: Solves wandern
                                            erst zu Y, dann wird X geloescht.
- POST   /sessions/{id}/merge?target_id=Y — Alle Solves von id zu target_id
                                             umlegen, source loeschen. Notizen
                                             werden in target appended.
- GET    /sessions/suggest?cube_type=X   — empfohlene Session fuer einen
                                            Cube-Type (jene, in der der User
                                            die meisten Solves dieses Cubes hat)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
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
def delete_session(
    session_id: int,
    move_solves_to: int | None = Query(
        default=None,
        description="Wenn gesetzt: Solves der zu loeschenden Session werden "
        "VOR dem Loeschen auf diese Ziel-Session umgelegt. Sonst: "
        "session_id wird NULL (FK SET NULL).",
    ),
    db: OrmSession = Depends(get_db),
) -> None:
    """Session loeschen.

    Default: Betroffene Solves verlieren ihre session_id (FK SET NULL).
    Mit `move_solves_to=Y`: Solves werden VOR dem Loeschen zu Y umgelegt.

    Validation:
    - move_solves_to darf nicht == session_id sein (kein Self-Move)
    - Ziel-Session muss existieren
    """
    s = _get_or_404(session_id, db)

    if move_solves_to is not None:
        if move_solves_to == session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="move_solves_to darf nicht die zu loeschende Session sein",
            )
        # Ziel existiert? sonst 404
        _get_or_404(move_solves_to, db)
        # Solves umlegen
        db.execute(
            update(Solve).where(Solve.session_id == session_id).values(session_id=move_solves_to)
        )

    db.delete(s)
    db.commit()


@router.post("/{session_id}/merge", response_model=SessionRead)
def merge_session(
    session_id: int,
    target_id: int = Query(..., description="Ziel-Session, in die gemerged wird"),
    db: OrmSession = Depends(get_db),
) -> DbSession:
    """Source-Session in target mergen.

    Schritte (atomic):
    1. Alle Solves von source.session_id = target_id setzen
    2. Source-notes in target-notes appenden (mit Trenner) — falls vorhanden
    3. Source-Session loeschen

    Validation:
    - source != target (kein Self-Merge)
    - beide Sessions muessen existieren
    """
    if session_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source und Target duerfen nicht gleich sein",
        )
    source = _get_or_404(session_id, db)
    target = _get_or_404(target_id, db)

    # 1. Solves umlegen
    db.execute(update(Solve).where(Solve.session_id == session_id).values(session_id=target_id))

    # 2. Notes appenden (wenn source notes hat)
    if source.notes:
        prefix = f"[merged from '{source.name}']"
        if target.notes:
            target.notes = f"{target.notes}\n\n{prefix} {source.notes}"
        else:
            target.notes = f"{prefix} {source.notes}"

    # 3. Source loeschen
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target

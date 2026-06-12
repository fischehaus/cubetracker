"""Solves-CRUD-API (Phase W) — Multi-User-Variante.

Alle Endpoints benötigen Auth via current_user-Dep.
ALLE Queries filtern auf user_id == current_user.id.

Cross-Tenant-Sicherheits-Checks:
- POST /solves: session_id + hardware_id müssen dem aktuellen User gehören
- PATCH /solves/{id}: dito + Solve selbst muss dem User gehören
- GET/PATCH/DELETE /solves/{id}: Solve muss dem User gehören (sonst 404,
  NICHT 403 — verhindert Probing fremder IDs)

Phase W.4: Nach Solve-Mutation läuft für den aktuellen User
- Achievement-Check (X-Achievements-Unlocked-Header)
- Challenge-Progress (X-Challenges-Completed-Header)
- PB-Detection (X-PB-Achieved-Header)
Frontend liest die Header und feuert Toaster/Confetti.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from achievements.service import run_achievement_check
from auth.deps import get_current_user
from challenges.service import update_today_progress_for_solve
from db.database import get_db
from db.models import Hardware, Session as DbSession, Solve, User
from db.schemas import SolveCreate, SolveRead, SolveUpdate
from stats.calc import SolvePoint, best_average_window

router = APIRouter(prefix="/solves", tags=["solves"])


def _detect_pbs_for_user(db: OrmSession, user_id: int, solve: Solve) -> list[str]:
    """Liefert Liste der PB-Typen die DIESER Solve gerade gesetzt hat.
    Mogliche Typen: 'single', 'ao5', 'ao12'. Nur eigene Solves zählen.

    Performance (W.solve-hotpath, 2026-06-13): Das hier läuft bei JEDEM
    Timer-Stop. Vorher: voller ORM-Load (inkl. Scramble-/Notes-Text) +
    2× compute_stats — das rechnet zusätzlich ao100-Windows und drei
    PB-Progressionen, die hier niemand braucht. Jetzt: 4-Spalten-Tupel-
    Query + gezielt best_ao5/ao12. Semantik bitidentisch — festgepinnt
    in tests/test_pb_detection.py. Der verbleibende O(n)-Scan fällt erst
    mit der user_cube_stats-Aggregat-Tabelle (Analyse Welle C #11).
    """
    rows = db.execute(
        select(Solve.id, Solve.time_ms, Solve.dnf, Solve.plus_two)
        .where(Solve.user_id == user_id)
        .where(Solve.cube_type == solve.cube_type)
        .order_by(Solve.timestamp.asc())
    ).all()
    if not rows:
        return []

    points_with = [
        SolvePoint(time_ms=r.time_ms, dnf=r.dnf, plus_two=r.plus_two, solve_id=r.id)
        for r in rows
    ]
    points_without = [p for p in points_with if p.solve_id != solve.id]

    pbs: list[str] = []
    if not solve.dnf:
        eff = solve.time_ms + (2000 if solve.plus_two else 0)
        valid_with = [p.effective_ms for p in points_with if not p.dnf]
        valid_without = [p.effective_ms for p in points_without if not p.dnf]
        best_with = int(min(valid_with)) if valid_with else None
        best_without = int(min(valid_without)) if valid_without else None
        is_best = best_with is not None and eff == best_with
        improved_single = best_without is None or eff < best_without
        if is_best and improved_single:
            pbs.append("single")

    ao5_with = best_average_window(points_with, 5)
    ao5_without = best_average_window(points_without, 5)
    if ao5_with is not None and (ao5_without is None or ao5_with < ao5_without):
        pbs.append("ao5")

    ao12_with = best_average_window(points_with, 12)
    ao12_without = best_average_window(points_without, 12)
    if ao12_with is not None and (ao12_without is None or ao12_with < ao12_without):
        pbs.append("ao12")

    return pbs


def _set_post_mutation_headers(
    response: Response, db: OrmSession, user: User, solve: Solve | None
) -> None:
    """Achievement-Check + Challenge-Progress + PB-Detect, für den aktuellen
    User. Setzt entsprechende X-Header damit das Frontend Toaster/Confetti
    triggern kann.
    """
    new_unlocks = run_achievement_check(db, user.id)
    if new_unlocks:
        response.headers["X-Achievements-Unlocked"] = ",".join(new_unlocks)
    if solve is not None:
        completed_ids = update_today_progress_for_solve(db, user.id, solve)
        if completed_ids:
            response.headers["X-Challenges-Completed"] = ",".join(str(i) for i in completed_ids)
        pb_kinds = _detect_pbs_for_user(db, user.id, solve)
        if pb_kinds:
            response.headers["X-PB-Achieved"] = ",".join(pb_kinds)


def _get_solve_or_404(solve_id: int, user: User, db: OrmSession) -> Solve:
    """Solve nach ID UND user_id holen. 404 wenn anderer User oder nicht existent.

    KRITISCH: NIE nur db.get(Solve, id) — das würde fremde Solves zurückgeben!
    """
    solve = db.scalar(select(Solve).where(Solve.id == solve_id, Solve.user_id == user.id))
    if solve is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solve {solve_id} not found",
        )
    return solve


def _verify_session_ownership(session_id: int | None, user: User, db: OrmSession) -> None:
    """Wenn session_id gesetzt: prüfe dass die Session dem User gehört.

    Sonst könnte ein User Solves in fremde Sessions einhaengen.
    """
    if session_id is None:
        return
    exists = db.scalar(
        select(DbSession.id).where(DbSession.id == session_id, DbSession.user_id == user.id)
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} gehört nicht dem aktuellen User oder existiert nicht",
        )


def _verify_hardware_ownership(hardware_id: int | None, user: User, db: OrmSession) -> None:
    """Wenn hardware_id gesetzt: prüfe dass die Hardware dem User gehört."""
    if hardware_id is None:
        return
    exists = db.scalar(
        select(Hardware.id).where(Hardware.id == hardware_id, Hardware.user_id == user.id)
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hardware {hardware_id} gehört nicht dem aktuellen User oder existiert nicht",
        )


@router.get("", response_model=list[SolveRead])
def list_solves(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    alg_case: str | None = Query(
        default=None,
        description="Filter auf alg_case (z.B. 'PLL-Tperm') für DrillCard-Liste",
    ),
    limit: int = Query(default=100, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> list[Solve]:
    """Liste der eigenen Solves, neueste zuerst."""
    stmt = select(Solve).where(Solve.user_id == current_user.id).order_by(Solve.timestamp.desc())
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    if alg_case is not None:
        stmt = stmt.where(Solve.alg_case == alg_case)
    stmt = stmt.limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


@router.post("", response_model=SolveRead, status_code=status.HTTP_201_CREATED)
def create_solve(
    payload: SolveCreate,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Neuen Solve für aktuellen User anlegen.

    Cross-Refs (session_id, hardware_id) werden auf Ownership geprüft.
    Achievement-Check + Challenge-Progress + PB-Detect via X-Header.
    """
    _verify_session_ownership(payload.session_id, current_user, db)
    _verify_hardware_ownership(payload.hardware_id, current_user, db)

    data = payload.model_dump(exclude_unset=False)
    if data.get("timestamp") is None:
        data["timestamp"] = datetime.now(UTC)
    solve = Solve(user_id=current_user.id, **data)
    db.add(solve)
    db.commit()
    db.refresh(solve)
    _set_post_mutation_headers(response, db, current_user, solve)
    return solve


@router.get("/{solve_id}", response_model=SolveRead)
def get_solve(
    solve_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Einzelnen Solve nach ID holen (nur eigene)."""
    return _get_solve_or_404(solve_id, current_user, db)


@router.patch("/{solve_id}", response_model=SolveRead)
def update_solve(
    solve_id: int,
    payload: SolveUpdate,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Solve:
    """Teil-Update eines Solves (alle Felder optional, nur eigene).

    PATCH (z.B. +2/DNF-Toggle) kann Stats + Challenge-Progress ändern,
    daher Header-Helper auch hier aufrufen.
    """
    solve = _get_solve_or_404(solve_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)

    if "session_id" in update_data:
        _verify_session_ownership(update_data["session_id"], current_user, db)
    if "hardware_id" in update_data:
        _verify_hardware_ownership(update_data["hardware_id"], current_user, db)

    for key, value in update_data.items():
        setattr(solve, key, value)
    db.commit()
    db.refresh(solve)
    _set_post_mutation_headers(response, db, current_user, solve)
    return solve


@router.delete("/{solve_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_solve(
    solve_id: int,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """Solve löschen (nur eigene). Achievements bleiben unlocked
    (monotonic), aber Recheck damit ggf. neu unlockte sichtbar werden
    (z.B. wenn Delete andere Schwellwerte unterschreitet).
    """
    solve = _get_solve_or_404(solve_id, current_user, db)
    db.delete(solve)
    db.commit()
    # Bei delete gibt's keinen Solve für PB/Challenge-Progress
    _set_post_mutation_headers(response, db, current_user, None)

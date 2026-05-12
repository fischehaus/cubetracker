"""Backup-API (Phase W.5) — Multi-User-Variante.

Endpoints:
- GET    /backup/json                            — Voll-Export eigene Daten
- POST   /backup/restore?mode=merge|replace      — JSON-Upload, mode + dry_run
- GET    /backup/snapshots                       — eigene Snapshots
- POST   /backup/snapshots                       — manueller Snapshot
- POST   /backup/snapshots/{id}/restore          — auf Snapshot zurueck
- DELETE /backup/snapshots/{id}                  — eigenen Snapshot loeschen

Sicherheits-/Limits:
- File-Size 30 MB (~100k Solves)
- Rate-Limit 5/h auf Restore + Import (CPU-Schutz, Achievement-Recheck nach Bulk)
- mode='replace' braucht confirm=DELETE_ALL_MY_DATA als Magic-String
- alle user_id-Felder im JSON werden ignoriert + ueberschrieben mit current_user
"""

from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session as OrmSession

from achievements.service import run_achievement_check
from auth.deps import get_current_user
from auth.rate_limit import limiter
from backup.service import (
    BackupServiceError,
    check_json_bomb,
    create_snapshot,
    delete_snapshot,
    export_user_data,
    get_snapshot_or_none,
    list_snapshots,
    restore_from_snapshot,
    restore_user_data,
)
from db.database import get_db
from db.models import User

router = APIRouter(prefix="/backup", tags=["backup"])

# 30 MB ~= 100k Solves (Schaetzung 300 Bytes/Solve im JSON, mit Sessions/HW etc.)
MAX_UPLOAD_BYTES = 30 * 1024 * 1024

# Magic-String fuer destruktive Replace-Operation. Frontend baut Confirm-
# Dialog mit Texteingabe ("Tippe DELETE_ALL_MY_DATA ein").
REPLACE_CONFIRM = "DELETE_ALL_MY_DATA"

# Rate-Limits — bewusst eng, da Bulk-Import/Restore CPU-teuer sind
# (Achievement-Recheck rechnet alle User-Solves durch).
RESTORE_LIMIT = "5/hour"
SNAPSHOT_LIMIT = "10/hour"


# ============================================================
# Voll-Export
# ============================================================


@router.get("/json")
def backup_json(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Voll-JSON-Export eigener Daten. Browser-Download via Frontend
    (Frontend setzt Filename mit Email + Datum)."""
    return export_user_data(db, current_user)


# ============================================================
# Restore aus Upload-JSON
# ============================================================


@router.post("/restore")
@limiter.limit(RESTORE_LIMIT)
async def restore_backup(
    request: Request,
    file: UploadFile = File(..., description="Voll-Backup-JSON (z.B. von /backup/json)"),
    mode: Literal["merge", "replace"] = Query(default="merge"),
    dry_run: bool = Query(default=False, description="Nur Stats, nichts schreiben"),
    confirm: str | None = Query(
        default=None, description=f"Pflicht wenn mode=replace: '{REPLACE_CONFIRM}'"
    ),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """JSON-Backup zurueckspielen — eigene Daten only.

    - mode=merge (Default): bestehende Daten bleiben, neue dazu, Dedup
    - mode=replace: ALLE eigenen Daten loeschen, dann importieren —
      braucht confirm=DELETE_ALL_MY_DATA + erzeugt Auto-Snapshot vorher
    - dry_run=true: nur Stats was passieren wuerde, kein Schreiben
    """
    if mode == "replace" and not dry_run and confirm != REPLACE_CONFIRM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"mode=replace ist destruktiv und braucht ?confirm={REPLACE_CONFIRM} "
                "(oder dry_run=true zum Testen)."
            ),
        )

    # Security-Fix W.5-finding-1: chunked read mit hard limit damit
    # nicht erst 500MB in den Worker-Memory geladen werden bevor wir 413
    # antworten. Wir lesen MAX_UPLOAD_BYTES+1, so erkennen wir Overflow
    # mit minimalem Memory-Hit ueber dem Limit.
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload zu gross (max {MAX_UPLOAD_BYTES} bytes).",
        )
    # Security-Fix K2: JSON-Bomb-Pre-Check vor json.loads()
    try:
        check_json_bomb(raw)
    except BackupServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e)
        ) from e
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei ist kein gueltiges UTF-8/JSON: {e}",
        ) from e
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backup-JSON-Root muss ein Object sein.",
        )

    try:
        result = restore_user_data(db, current_user, payload, mode=mode, dry_run=dry_run)
    except BackupServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    response: dict[str, Any] = result.to_dict()

    if not dry_run and (result.solves_imported or result.achievements_imported):
        # Achievement-Recheck nach Bulk-Import (kann neue ungelockte triggern,
        # falls Backup unvollstaendig oder aus aelterer Version)
        new_unlocks = run_achievement_check(db, current_user.id)
        if new_unlocks:
            response["newly_unlocked_achievements"] = new_unlocks

    return response


# ============================================================
# Snapshots
# ============================================================


def _snapshot_to_dict(snap) -> dict[str, Any]:
    return {
        "id": snap.id,
        "created_at": snap.created_at.isoformat() if snap.created_at else None,
        "reason": snap.reason,
        "counts": {
            "solves": snap.solve_count,
            "sessions": snap.session_count,
            "hardware": snap.hardware_count,
        },
    }


@router.get("/snapshots")
def get_snapshots(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liste eigener Snapshots (bis zu 2)."""
    snaps = list_snapshots(db, current_user)
    return {
        "snapshots": [_snapshot_to_dict(s) for s in snaps],
        "max_per_user": 2,
    }


@router.post("/snapshots", status_code=status.HTTP_201_CREATED)
@limiter.limit(SNAPSHOT_LIMIT)
def create_snapshot_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Manueller Snapshot eigener Daten. Aelteste wird ggf. verworfen."""
    try:
        snap = create_snapshot(db, current_user, reason="manual")
    except BackupServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    return _snapshot_to_dict(snap)


@router.post("/snapshots/{snapshot_id}/restore")
@limiter.limit(RESTORE_LIMIT)
def restore_snapshot_endpoint(
    request: Request,
    snapshot_id: int,
    dry_run: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Auf einen Snapshot zurueckspielen — replace-Mode (bit-genau).

    Implizit destruktiv, aber confirm-Flag NICHT noetig: User hat den
    Snapshot ja explizit gewaehlt + Snapshots sind ja deine eigenen.
    Frontend sollte trotzdem ein Confirm-Dialog vorschalten.
    """
    snap = get_snapshot_or_none(db, current_user, snapshot_id)
    if snap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Snapshot {snapshot_id} nicht gefunden.",
        )
    result = restore_from_snapshot(db, current_user, snap, dry_run=dry_run)
    return result.to_dict()


@router.delete("/snapshots/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(SNAPSHOT_LIMIT)  # 10/h, konsistent mit Snapshot-Erstellung
def delete_snapshot_endpoint(
    request: Request,
    snapshot_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """Eigenen Snapshot loeschen."""
    snap = get_snapshot_or_none(db, current_user, snapshot_id)
    if snap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Snapshot {snapshot_id} nicht gefunden.",
        )
    delete_snapshot(db, snap)

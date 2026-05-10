"""csTimer-Import-API (Phase W) — Multi-User-Variante.

POST /import/cstimer
- Multipart-File-Upload (.txt oder .json)
- ?dry_run=true: Stats was importiert wuerde, kein Schreiben
- File-Size-Limit + Rate-Limit gegen DoS
- Auto-Snapshot vor grossem Import (>100 neue Solves)
- Achievement-Recheck nach Bulk
"""

from __future__ import annotations

import json
from typing import Any

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
from backup.service import create_snapshot
from db.database import get_db
from db.models import User
from importers.cstimer import import_cstimer_json

router = APIRouter(prefix="/import", tags=["import"])

MAX_UPLOAD_BYTES = 30 * 1024 * 1024  # 30 MB ~= 100k Solves
SNAPSHOT_THRESHOLD = 100  # >= so viele neue Solves -> Auto-Snapshot vorher
IMPORT_LIMIT = "5/hour"


@router.post("/cstimer", status_code=status.HTTP_200_OK)
@limiter.limit(IMPORT_LIMIT)
async def import_cstimer(
    request: Request,
    file: UploadFile = File(..., description="csTimer-Export-Datei (.txt/.json)"),
    dry_run: bool = Query(default=False, description="Nur Stats, nichts schreiben"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """csTimer-Datei fuer aktuellen User importieren — Merge-by-Default,
    Dedup nach (timestamp, time_ms), kein Datenverlust.

    dry_run=true: liefert dieselben Stats wie ein echter Import, aber ohne
    DB-Aenderung. Empfehlung: erst ?dry_run=true ausfuehren, dann ohne.
    """
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload zu gross: {len(raw)} bytes (max {MAX_UPLOAD_BYTES}).",
        )
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei ist nicht UTF-8: {e}",
        ) from e

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei ist kein gueltiges JSON: {e}",
        ) from e

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JSON-Root muss ein Object sein (csTimer-Format).",
        )

    # 1. Dry-Run zuerst um zu wissen ob Auto-Snapshot lohnt
    preview = import_cstimer_json(payload, db, current_user.id, dry_run=True)
    response: dict[str, Any] = {
        "filename": file.filename or "unknown",
        "dry_run": dry_run,
        **preview.to_dict(),
    }

    if dry_run:
        return response

    # 2. Bei vielen neuen Solves: Auto-Snapshot vorher
    snapshot_id: int | None = None
    if preview.solves_created >= SNAPSHOT_THRESHOLD:
        snap = create_snapshot(db, current_user, reason="before_bulk_import")
        snapshot_id = snap.id

    # 3. Echter Import
    result = import_cstimer_json(payload, db, current_user.id, dry_run=False)
    response.update(result.to_dict())
    response["snapshot_created"] = snapshot_id

    # 4. Achievement-Recheck
    if result.solves_created > 0:
        new_unlocks = run_achievement_check(db, current_user.id)
        if new_unlocks:
            response["newly_unlocked_achievements"] = new_unlocks

    return response

"""csTimer-Import-API (Phase W) — Multi-User-Variante.

POST /import/cstimer
- Multipart-File-Upload (.txt oder .json)
- ?dry_run=true: Stats was importiert wuerde, kein Schreiben
- File-Size-Limit + Rate-Limit gegen DoS
- Auto-Snapshot + Achievement-Recheck nach grossem Import (>=100 Solves)
  laufen via BackgroundTask — Endpoint antwortet sofort nach DB-Commit,
  Snapshot/Recheck koennen 10-30s im Hintergrund laufen.

Performance-Fix 2026-05-12 (csTimer-Import "Network Error" bei 6000+
Solves): vorher serielle Doppel-Import (Dry-Run + Echt) + sync Snapshot
+ sync Achievement-Recheck = 35-45s Worker-Block, oft groesser als
Connection-Timeout. Jetzt: einmal echt importieren -> sofort 200 OK ->
Snapshot + Recheck im BackgroundTask.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
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
from backup.service import BackupServiceError, check_json_bomb, create_snapshot
from db.database import SessionLocal, get_db
from db.models import User
from importers.cstimer import import_cstimer_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])

MAX_UPLOAD_BYTES = 30 * 1024 * 1024  # 30 MB ~= 100k Solves
SNAPSHOT_THRESHOLD = 100  # >= so viele neue Solves -> Auto-Snapshot nachher
IMPORT_LIMIT = "5/hour"


def _post_import_background(user_id: int, did_import_solves: bool) -> None:
    """Background-Task nach erfolgreichem Bulk-Import:
    - Auto-Snapshot ("after_bulk_import"-Reason)
    - Achievement-Recheck

    Eigene DB-Session, da BackgroundTask die HTTP-Request-Session nicht
    mehr nutzen kann (die ist beim Response-Send schon geschlossen).

    Security-Fix K3: defensive Exception-Handling + User-Lookup-Check.
    Wenn User zwischenzeitlich geloescht wurde (CASCADE): silent return.
    Wenn beliebige Exception: rollback + log + continue (verhindert
    Worker-Crash bei BG-Task-Fail).
    """
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if user is None or not user.is_active:
            # User geloescht oder deaktiviert -> kein Snapshot/Recheck
            return
        if not did_import_solves:
            return
        try:
            create_snapshot(db, user, reason="after_bulk_import")
        except Exception as e:  # noqa: BLE001
            logger.error("background snapshot for user %s failed: %s", user_id, e)
            db.rollback()
        try:
            run_achievement_check(db, user_id)
        except Exception as e:  # noqa: BLE001
            logger.error(
                "background achievement-recheck for user %s failed: %s", user_id, e
            )
            db.rollback()
    except Exception as e:  # noqa: BLE001
        logger.error("background task for user %s crashed unexpectedly: %s", user_id, e)
        try:
            db.rollback()
        except Exception:  # noqa: BLE001
            pass
    finally:
        db.close()


@router.post("/cstimer", status_code=status.HTTP_200_OK)
@limiter.limit(IMPORT_LIMIT)
async def import_cstimer(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(..., description="csTimer-Export-Datei (.txt/.json)"),
    dry_run: bool = Query(default=False, description="Nur Stats, nichts schreiben"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """csTimer-Datei fuer aktuellen User importieren — Merge-by-Default,
    Dedup nach (timestamp, time_ms), kein Datenverlust.

    dry_run=true: liefert Stats was importiert wuerde, ohne DB-Aenderung.
    Empfehlung: erst Dry-Run, dann real.
    """
    # Chunked read damit grosse Uploads nicht voll in Memory landen
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

    # Auto-Detect: ist das vielleicht ein Cubetracker-Backup-JSON statt
    # csTimer-Format? Backup-JSONs haben Top-Level-Keys wie 'solves',
    # 'sessions', 'schema_version' — KEINE 'session<N>'-Keys.
    has_cstimer_sessions = any(k.startswith("session") for k in payload)
    looks_like_backup = (
        "schema_version" in payload or "solves" in payload or "exported_at" in payload
    )
    if looks_like_backup and not has_cstimer_sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Diese Datei sieht aus wie ein Cubetracker-Backup, "
                "nicht wie ein csTimer-Export. Bitte unter "
                "'Backup & Wiederherstellung' hochladen "
                "(Verwaltung -> Daten -> Backup-Card)."
            ),
        )
    if not has_cstimer_sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Datei enthaelt keine csTimer-Sessions (Top-Level-Keys "
                "wie 'session1', 'session2'...). Bitte pruefe ob du "
                "die richtige Datei hochgeladen hast."
            ),
        )

    # Dry-Run: rollback am Ende, kein commit (importer.dry_run=True)
    result = import_cstimer_json(payload, db, current_user.id, dry_run=dry_run)
    response: dict[str, Any] = {
        "filename": file.filename or "unknown",
        "dry_run": dry_run,
        **result.to_dict(),
    }

    if dry_run:
        return response

    # Bei echtem Import + nennenswertem Volumen: Snapshot + Recheck
    # im Hintergrund laufen lassen, damit der HTTP-Response sofort
    # zurueck geht (vorher: 35-45s Worker-Block -> Connection-Drops).
    if result.solves_created >= SNAPSHOT_THRESHOLD:
        background.add_task(
            _post_import_background, current_user.id, result.solves_created > 0
        )
        response["background_tasks"] = ["snapshot", "achievement_recheck"]
    elif result.solves_created > 0:
        # Wenig Solves -> Recheck synchron ist OK, gibt direkt Feedback
        new_unlocks = run_achievement_check(db, current_user.id)
        if new_unlocks:
            response["newly_unlocked_achievements"] = new_unlocks

    return response

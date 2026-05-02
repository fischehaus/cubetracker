"""csTimer-Import-API.

Endpoint:
- POST /import/cstimer  — Multipart-File-Upload (.txt oder .json) ODER JSON-Body
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from importers.cstimer import import_cstimer_json

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/cstimer", status_code=status.HTTP_200_OK)
async def import_cstimer(
    file: UploadFile = File(..., description="csTimer-Export-Datei (.txt oder .json)"),
    db: OrmSession = Depends(get_db),
) -> dict[str, int | str]:
    """csTimer-Export-Datei importieren.

    Liest die Datei (UTF-8), parst als JSON, importiert Sessions + Solves
    in einer Transaktion. Idempotent: Re-Import erkennt Duplikate.

    Liefert ein Dict mit Statistiken:
        {
            "sessions_created": int,
            "sessions_updated": int,
            "solves_created": int,
            "solves_skipped_duplicate": int,
            "solves_skipped_invalid": int
        }
    """
    raw = await file.read()
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
            detail="JSON-Root muss ein Object sein (csTimer-Format)",
        )

    result = import_cstimer_json(payload, db)
    return result.to_dict() | {"filename": file.filename or "unknown"}

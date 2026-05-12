"""csTimer-Export-API (Phase W) — Multi-User-Variante.

GET /export/cstimer
- Liefert eigene Daten als csTimer-JSON (importierbar in csTimer-App)
- Optionale Filter: ?session_ids=1,2 + ?cube_types=3x3,4x4
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from db.database import get_db
from db.models import User
from exporters.cstimer import export_to_cstimer

router = APIRouter(prefix="/export", tags=["export"])


# Security-Fix S6: Length-Limit auf CSV-Query-Strings.
# Verhindert Parser-DoS (~1MB von Komma-getrennten Werten).
_MAX_CSV_LENGTH = 4096


def _csv_to_int_list(s: str | None) -> list[int] | None:
    """'1,2,3' -> [1,2,3]. Leere/None -> None (kein Filter)."""
    if not s:
        return None
    if len(s) > _MAX_CSV_LENGTH:
        return None
    out: list[int] = []
    for part in s.split(","):
        try:
            out.append(int(part.strip()))
        except ValueError:
            continue
    return out or None


def _csv_to_str_list(s: str | None) -> list[str] | None:
    if not s:
        return None
    if len(s) > _MAX_CSV_LENGTH:
        return None
    out = [p.strip() for p in s.split(",") if p.strip()]
    return out or None


@router.get("/cstimer")
def export_cstimer(
    session_ids: str | None = Query(
        default=None, description="CSV von Session-IDs, z.B. '1,2'. Default: alle."
    ),
    cube_types: str | None = Query(
        default=None, description="CSV von Cube-Types, z.B. '3x3,4x4'. Default: alle."
    ),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """csTimer-JSON-Export der eigenen Daten."""
    return export_to_cstimer(
        db,
        current_user.id,
        session_ids=_csv_to_int_list(session_ids),
        cube_types=_csv_to_str_list(cube_types),
    )

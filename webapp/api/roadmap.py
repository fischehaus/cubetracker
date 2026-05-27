"""Roadmap-Endpoint (Phase W.roadmap-db, 2026-05-28).

GET /roadmap — Public-Endpoint, liefert die aktuelle Roadmap als
flache Item-Liste sortiert nach (phase_id, sort_order, id).

Sichtbarkeit:
- Non-Admin (auth-optional): filtert `internal=True`-Items raus.
- Admin: bekommt alle Items inkl. internal=True (Frontend zeigt
  amber „intern"-Badge).
- Status: aktuell wird `status=done` NICHT extra gefiltert — wenn
  der Admin ein Item als done markiert (z.B. „gerade fertig"-
  Markierung mit ✓), bleibt es 1-2 Wochen sichtbar als Erfolgs-
  Signal, danach kann der Admin es löschen.

Admin-CRUD (Create/Update/Delete) liegt in `api/admin.py` (zentrale
Stelle für alle admin-only Endpoints).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user_optional
from db.database import get_db
from db.models import RoadmapItem, User
from db.schemas import RoadmapItemRead

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.get("")
def list_roadmap(
    current_user: User | None = Depends(get_current_user_optional),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert alle Roadmap-Items, sortiert nach (phase_id, sort_order, id).

    Non-Admins bekommen `internal=True`-Items NICHT geliefert. Damit
    bleibt die User-Sicht aufgeräumt (keine Dev-/Tech-Schuld-Themen).
    """
    # Phase W.tester-role-db (2026-05-28): Tester werden für die internal-
    # Visibility wie Admins behandelt (sehen alle Items inkl. Tech-Schuld).
    # Reine UI-Filter-Frage, keine Auth-Bypass — Schreibrechte sind im
    # require_admin_or_tester-Dep geregelt.
    is_admin_or_tester = bool(
        current_user and (current_user.is_admin or current_user.is_tester)
    )
    stmt = select(RoadmapItem).order_by(
        RoadmapItem.phase_id, RoadmapItem.sort_order, RoadmapItem.id
    )
    if not is_admin_or_tester:
        stmt = stmt.where(RoadmapItem.internal.is_(False))
    rows = db.execute(stmt).scalars().all()
    return {
        "items": [RoadmapItemRead.model_validate(r).model_dump(mode="json") for r in rows],
        "count": len(rows),
        # Frontend nutzt das Flag um den intern-Toggle / Edit-Button im
        # User-Modal zu blenden. is_admin und is_tester separat ausgegeben
        # falls Frontend später differenzieren will.
        "is_admin": bool(current_user and current_user.is_admin),
        "is_tester": bool(current_user and current_user.is_tester),
    }

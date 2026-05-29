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

import os
import secrets
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user_optional
from db.database import get_db
from db.models import RoadmapItem, User
from db.schemas import RoadmapExportMarkDone, RoadmapItemRead

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


# =====================================================================
# Export-Endpoint mit festem Key (W.roadmap-export-key, 2026-05-29)
#
# Zweck: dauerhafter Lese-/done-Zugriff auf die volle Roadmap (inkl.
# internal-Items) für das Claude-Tooling (session-start + /roadmap +
# --mark-done), OHNE den kurzlebigen Admin-JWT (lief ~stündlich ab).
#
# Auth: fester Secret-Key aus ENV `ROADMAP_EXPORT_KEY`, im Header
# `X-Roadmap-Key`. Constant-time-Vergleich. Wenn die ENV-Var NICHT
# gesetzt ist, sind beide Endpoints DEAKTIVIERT (404) — safe-by-default
# bis der Betreiber den Key setzt. Mismatch -> ebenfalls 404 (versteckt
# die Existenz, analog require_admin).
#
# Blast-Radius bewusst klein: nur Roadmap-Items (keine User-Daten),
# Write kann ausschliesslich status="done" setzen (kein Delete/Edit).
# =====================================================================


def _require_export_key(provided: str | None) -> None:
    """Validiert den X-Roadmap-Key gegen ROADMAP_EXPORT_KEY (ENV).

    Kein Key konfiguriert ODER Mismatch -> 404 (Endpoint-Existenz
    verstecken, kein 401/403-Hinweis dass es ihn gibt).
    """
    configured = os.getenv("ROADMAP_EXPORT_KEY", "").strip()
    not_found = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Not found."
    )
    if not configured:
        raise not_found  # Endpoint deaktiviert solange kein Key gesetzt ist
    if not provided or not secrets.compare_digest(provided, configured):
        raise not_found


@router.get("/export")
def export_roadmap(
    x_roadmap_key: str | None = Header(default=None, alias="X-Roadmap-Key"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert ALLE Roadmap-Items (inkl. internal). Key-gated, kein JWT.

    Gleiche Sortierung wie der Public-Endpoint. `is_admin: True` im Body,
    damit das Tooling es als Voll-Sicht behandelt.
    """
    _require_export_key(x_roadmap_key)
    rows = (
        db.execute(
            select(RoadmapItem).order_by(
                RoadmapItem.phase_id, RoadmapItem.sort_order, RoadmapItem.id
            )
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            RoadmapItemRead.model_validate(r).model_dump(mode="json") for r in rows
        ],
        "count": len(rows),
        "is_admin": True,
        "export": True,
    }


@router.post("/export/done")
def export_mark_done(
    payload: RoadmapExportMarkDone,
    x_roadmap_key: str | None = Header(default=None, alias="X-Roadmap-Key"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Setzt die per title_de genannten Items auf status="done". Key-gated.

    Schmaler Write: nur status -> "done". Items, die nicht existieren oder
    schon done sind, werden gemeldet (not_found / already_done), nicht als
    Fehler. Atomar in einer Transaktion.
    """
    _require_export_key(x_roadmap_key)
    # QA-NICE: nur relevante Rows laden statt full-load.
    rows = (
        db.execute(
            select(RoadmapItem).where(RoadmapItem.title_de.in_(payload.titles))
        )
        .scalars()
        .all()
    )
    by_title = {it.title_de: it for it in rows}
    updated: list[str] = []
    already_done: list[str] = []
    for title in payload.titles:
        item = by_title.get(title)
        if item is None:
            continue  # nicht gefunden — wird unten errechnet
        if item.status == "done":
            already_done.append(title)
        else:
            item.status = "done"
            updated.append(title)
    not_found = [t for t in payload.titles if t not in by_title]
    if updated:
        # QA-SOLLTE: Rollback bei Commit-Fehler statt unhandled 500.
        try:
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="DB-Commit fehlgeschlagen.",
            )
    return {
        "updated": updated,
        "already_done": already_done,
        "not_found": not_found,
    }

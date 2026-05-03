"""Backup-API (Phase L+).

Zwei Strategien zum Daten-Mitnehmen auf einen anderen Rechner:

- GET /backup/sqlite → Liefert die komplette SQLite-Datei als Download.
  Vollstaendig, binaer, kompakt. Restore ist „File ersetzen + Backend
  neu starten" — bewusst NICHT als Upload-Endpoint, weil DB-Replace
  waehrend laufendem Server fragil ist (Lock-Errors).

- GET /backup/json → JSON-Voll-Export mit Schema-Version. Lesbar,
  versionsstabil, gut fuer Migration zwischen App-Versionen oder
  Datenuebergabe an Drittwerkzeuge.

Alle Endpoints sind read-only. Restore-Wege sind dokumentiert
(siehe NEXT_SESSION.md), nicht automatisiert.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Hardware, Solve
from db.models import Session as DbSession

router = APIRouter(prefix="/backup", tags=["backup"])

# Pfad zur SQLite-Datei. Per Konvention liegt sie unter backend/data/
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "solves.db"


@router.get("/sqlite")
def backup_sqlite() -> FileResponse:
    """Komplette SQLite-Datei als Download.

    Filename enthaelt Datum/Uhrzeit, damit User mehrere Backups
    nebeneinander ablegen kann.
    """
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DB-Datei nicht gefunden: {DB_PATH}",
        )
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    filename = f"cubetracker_backup_{timestamp}.db"
    return FileResponse(
        path=str(DB_PATH),
        media_type="application/x-sqlite3",
        filename=filename,
    )


@router.get("/json")
def backup_json(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Voll-Export aller Tabellen als JSON.

    Format:
        {
          schema_version: "0.7.0",       # entspricht aktueller App-Version
          exported_at: ISO-timestamp,
          solves: [...],                  # alle solves
          sessions: [...],                # alle sessions
          hardware: [...],                # alle hardware-eintraege
        }

    Idempotent re-importierbar (kommt spaeter — siehe phase 8). Die
    Schema-Version erlaubt zukuenftige Migration falls sich Felder
    aendern.
    """
    # Lazy-import um circular import zu vermeiden
    from main import __version__

    solves = db.scalars(select(Solve)).all()
    sessions = db.scalars(select(DbSession)).all()
    hardware = db.scalars(select(Hardware)).all()

    return {
        "schema_version": __version__,
        "exported_at": datetime.now(UTC).isoformat(),
        "counts": {
            "solves": len(solves),
            "sessions": len(sessions),
            "hardware": len(hardware),
        },
        "solves": [_solve_to_dict(s) for s in solves],
        "sessions": [_session_to_dict(s) for s in sessions],
        "hardware": [_hardware_to_dict(h) for h in hardware],
    }


# ============================================================
# Serializers — kleinere Helper, damit der Endpoint kompakt bleibt
# ============================================================


def _solve_to_dict(s: Solve) -> dict[str, Any]:
    return {
        "id": s.id,
        "time_ms": s.time_ms,
        "cube_type": s.cube_type,
        "scramble": s.scramble,
        "notes": s.notes,
        "timestamp": s.timestamp.isoformat() if s.timestamp else None,
        "plus_two": s.plus_two,
        "dnf": s.dnf,
        "session_id": s.session_id,
        "hardware_id": s.hardware_id,
    }


def _session_to_dict(s: DbSession) -> dict[str, Any]:
    return {
        "id": s.id,
        "name": s.name,
        "scramble_type": s.scramble_type,
        "cstimer_session_id": s.cstimer_session_id,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _hardware_to_dict(h: Hardware) -> dict[str, Any]:
    return {
        "id": h.id,
        "name": h.name,
        "primary_cube_type": h.primary_cube_type,
        "notes": h.notes,
        "is_active": h.is_active,
        "acquired_at": h.acquired_at.isoformat() if h.acquired_at else None,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }

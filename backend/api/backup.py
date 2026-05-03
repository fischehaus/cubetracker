"""Backup-API (Phase L+ / Phase 9).

Drei Strategien zum Daten-Mitnehmen + Wiederherstellen:

- GET /backup/sqlite → Liefert die komplette SQLite-Datei als Download.
  Vollstaendig, binaer, kompakt. Restore via SQLite-File ist nur per
  „File ersetzen + Backend neu starten" — wir bieten dafuer KEINEN
  Upload-Endpoint, weil DB-Replace im laufenden Server Lock-Errors gibt.

- GET /backup/json → JSON-Voll-Export mit Schema-Version. Lesbar,
  versionsstabil, gut fuer Migration zwischen App-Versionen oder
  Datenuebergabe an Drittwerkzeuge.

- POST /backup/restore (Phase 9) → JSON-Voll-Import mit Schema-Check.
  Erlaubt nach Reinstall die Daten zurueckzuspielen, ohne dass der
  User die SQLite-Datei manuell ersetzen muss. DESTRUKTIV: alle
  bisherigen Daten werden geloescht. Schema-Version muss exakt der
  Backend-Version entsprechen (Migration aus aelterer Version → spaeter).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Achievement, Challenge, Hardware, Solve
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
    achievements = db.scalars(select(Achievement)).all()
    challenges = db.scalars(select(Challenge)).all()

    return {
        "schema_version": __version__,
        "exported_at": datetime.now(UTC).isoformat(),
        "counts": {
            "solves": len(solves),
            "sessions": len(sessions),
            "hardware": len(hardware),
            "achievements": len(achievements),
            "challenges": len(challenges),
        },
        "solves": [_solve_to_dict(s) for s in solves],
        "sessions": [_session_to_dict(s) for s in sessions],
        "hardware": [_hardware_to_dict(h) for h in hardware],
        "achievements": [_achievement_to_dict(a) for a in achievements],
        "challenges": [_challenge_to_dict(c) for c in challenges],
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
        "alg_case": s.alg_case,
        "split_times_ms": s.split_times_ms,
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


def _achievement_to_dict(a: Achievement) -> dict[str, Any]:
    return {
        "id": a.id,
        "code": a.code,
        "unlocked_at": a.unlocked_at.isoformat() if a.unlocked_at else None,
    }


def _challenge_to_dict(c: Challenge) -> dict[str, Any]:
    return {
        "id": c.id,
        "kind": c.kind,
        "cube_type": c.cube_type,
        "params_json": c.params_json,
        "target_value": c.target_value,
        "progress": c.progress,
        "generated_for_date": c.generated_for_date.isoformat() if c.generated_for_date else None,
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        "dismissed": c.dismissed,
        "created_at": c.created_at.isoformat() if c.created_at else None,
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


# ============================================================
# Phase 9: Restore-Endpoint (POST /backup/restore)
# ============================================================


def _parse_iso_or_none(s: str | None) -> datetime | None:
    """ISO-String → datetime (mit timezone-stripping fuer SQLite)."""
    if not s:
        return None
    dt = datetime.fromisoformat(s)
    # SQLite speichert naive UTC — wir normalisieren
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC).replace(tzinfo=None)
    return dt


def _wipe_all(db: OrmSession) -> dict[str, int]:
    """Loescht alle Tabellen-Inhalte. Liefert pre-wipe-counts.
    REIHENFOLGE: erst die Tabellen mit FKs, dann die referenzierten.
    """
    pre_counts = {
        "solves": db.scalar(select(Solve).with_only_columns(Solve.id).order_by(None))
        is not None,  # placeholder
    }
    # Zaehlen via simple count (cleaner)
    from sqlalchemy import func

    pre_counts = {
        "solves": db.scalar(select(func.count(Solve.id))) or 0,
        "challenges": db.scalar(select(func.count(Challenge.id))) or 0,
        "achievements": db.scalar(select(func.count(Achievement.id))) or 0,
        "sessions": db.scalar(select(func.count(DbSession.id))) or 0,
        "hardware": db.scalar(select(func.count(Hardware.id))) or 0,
    }
    # Solves zuerst (FKs auf Session + Hardware)
    db.execute(delete(Solve))
    db.execute(delete(Challenge))
    db.execute(delete(Achievement))
    db.execute(delete(DbSession))
    db.execute(delete(Hardware))
    db.flush()
    return pre_counts


def _restore_from_payload(db: OrmSession, payload: dict[str, Any]) -> dict[str, int]:
    """Loescht alles + insert aus payload. Caller muss commit machen
    (oder rollback bei error). Liefert post-counts.
    """
    _wipe_all(db)

    # Sessions zuerst (Solves haengen via FK dran)
    sessions_data = payload.get("sessions", [])
    for s in sessions_data:
        db.add(
            DbSession(
                id=s["id"],
                name=s["name"],
                scramble_type=s.get("scramble_type"),
                cstimer_session_id=s.get("cstimer_session_id"),
                notes=s.get("notes"),
                created_at=_parse_iso_or_none(s.get("created_at"))
                or datetime.now(UTC).replace(tzinfo=None),
            )
        )

    # Hardware
    hardware_data = payload.get("hardware", [])
    for h in hardware_data:
        db.add(
            Hardware(
                id=h["id"],
                name=h["name"],
                primary_cube_type=h["primary_cube_type"],
                notes=h.get("notes"),
                is_active=h.get("is_active", True),
                acquired_at=_parse_iso_or_none(h.get("acquired_at")),
                created_at=_parse_iso_or_none(h.get("created_at"))
                or datetime.now(UTC).replace(tzinfo=None),
            )
        )

    db.flush()  # IDs verfuegbar machen fuer FK-Refs

    # Solves
    solves_data = payload.get("solves", [])
    for s in solves_data:
        db.add(
            Solve(
                id=s["id"],
                time_ms=s["time_ms"],
                cube_type=s["cube_type"],
                scramble=s.get("scramble"),
                notes=s.get("notes"),
                timestamp=_parse_iso_or_none(s.get("timestamp"))
                or datetime.now(UTC).replace(tzinfo=None),
                plus_two=s.get("plus_two", False),
                dnf=s.get("dnf", False),
                session_id=s.get("session_id"),
                hardware_id=s.get("hardware_id"),
                alg_case=s.get("alg_case"),
                split_times_ms=s.get("split_times_ms"),
            )
        )

    # Achievements
    achievements_data = payload.get("achievements", [])
    for a in achievements_data:
        db.add(
            Achievement(
                id=a["id"],
                code=a["code"],
                unlocked_at=_parse_iso_or_none(a.get("unlocked_at"))
                or datetime.now(UTC).replace(tzinfo=None),
            )
        )

    # Challenges
    challenges_data = payload.get("challenges", [])
    for c in challenges_data:
        db.add(
            Challenge(
                id=c["id"],
                kind=c["kind"],
                cube_type=c.get("cube_type"),
                params_json=c.get("params_json"),
                target_value=c["target_value"],
                progress=c.get("progress", 0),
                generated_for_date=_parse_iso_or_none(c.get("generated_for_date"))
                or datetime.now(UTC).replace(tzinfo=None),
                completed_at=_parse_iso_or_none(c.get("completed_at")),
                dismissed=c.get("dismissed", False),
                created_at=_parse_iso_or_none(c.get("created_at"))
                or datetime.now(UTC).replace(tzinfo=None),
            )
        )

    db.flush()
    return {
        "solves": len(solves_data),
        "sessions": len(sessions_data),
        "hardware": len(hardware_data),
        "achievements": len(achievements_data),
        "challenges": len(challenges_data),
    }


@router.post("/restore")
async def restore_json(
    file: UploadFile,
    confirm: bool = False,
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stellt die DB aus einem JSON-Backup wieder her.

    DESTRUKTIV: alle bisherigen Daten werden geloescht. Nur ausfuehren
    nach explizitem User-Confirm.

    Body: multipart/form-data mit `file` = JSON-Backup-Datei.
    Query: `confirm=true` erforderlich, sonst nur dry-run.

    Schema-Version muss exakt der aktuellen Backend-Version entsprechen
    (Migration zwischen Versionen → spaetere Phase falls noetig).
    """
    from main import __version__

    raw = await file.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei ist kein gueltiges JSON: {e}",
        ) from e

    # Schema-Version pruefen
    schema_version = payload.get("schema_version")
    if not schema_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein 'schema_version' im Backup — kein cubetracker-JSON-Backup?",
        )
    if schema_version != __version__:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Schema-Version mismatch: Backup={schema_version}, "
                f"App={__version__}. Migration zwischen Versionen aktuell "
                "nicht unterstuetzt."
            ),
        )

    # Counts aus dem payload (fuer dry-run-feedback)
    counts = payload.get("counts", {})

    if not confirm:
        # Dry-run: zeig was passieren wuerde, aber DB bleibt unveraendert
        return {
            "dry_run": True,
            "message": (
                "Confirm=false → kein Restore durchgefuehrt. "
                "Zum Wiederherstellen Endpoint mit ?confirm=true aufrufen."
            ),
            "would_restore": counts,
            "schema_version": schema_version,
        }

    try:
        post_counts = _restore_from_payload(db, payload)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restore fehlgeschlagen, alle Aenderungen zurueckgenommen: {e}",
        ) from e

    return {
        "dry_run": False,
        "message": "Restore erfolgreich.",
        "restored": post_counts,
        "schema_version": schema_version,
    }

"""csTimer-JSON-Import-Logik.

csTimer exportiert ein JSON dieser Struktur:

    {
      "session1": [
        [[penalty, time_ms], scramble, comment, timestamp_unix],
        ...
      ],
      "session2": [...],
      ...
      "properties": {
        "sessionData": "{\"1\":{\"name\":\"3x3\", \"opt\":{\"scrType\":\"\"}, ...}, ...}"
      }
    }

Penalty-Codes:
    0     = OK (kein Strafe)
    2000  = +2 (time_ms ist Roh-Zeit ohne Strafe)
    -1    = DNF

Cube-Type-Ableitung (in dieser Prioritaet):
    1. Wenn Session-Name in COMMON_CUBE_TYPES → nimm den Namen
    2. Sonst: scrType-Mapping (z.B. "444wca" → "4x4")
    3. Fallback: Session-Name as-is

Idempotenz: Sessions per `cstimer_session_id` upsert. Solves per
(session_id, timestamp, time_ms)-Triple werden NICHT erneut importiert.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.models import Session as DbSession
from db.models import Solve

# scrType (csTimer-WCA-Code) → unser cube_type
SCRTYPE_TO_CUBE = {
    "": "3x3",  # csTimer-Default ist 3x3
    "333wca": "3x3",
    "333oh": "OH",
    "333bld": "3BLD",
    "222so": "2x2",
    "444wca": "4x4",
    "444bld": "4BLD",
    "555wca": "5x5",
    "555bld": "5BLD",
    "666wca": "6x6",
    "777wca": "7x7",
    "pyrso": "Pyraminx",
    "skbso": "Skewb",
    "sqrs": "Square-1",
    "mgmp": "Megaminx",
    "clkwca": "Clock",
    "ivyso": "Ivy",
    "gearso": "Gear",
}

# Wenn der Session-Name eine dieser Strings ist, hat er Vorrang vor scrType-Mapping
COMMON_CUBE_NAMES = {
    "3x3",
    "2x2",
    "4x4",
    "5x5",
    "6x6",
    "7x7",
    "OH",
    "Pyraminx",
    "Skewb",
    "Square-1",
    "Megaminx",
    "Clock",
    "Ivy",
    "Gear",
    "3BLD",
    "4BLD",
    "5BLD",
}


def _to_aware_utc(ts: datetime) -> datetime:
    """Normalisiert datetime auf aware UTC für Postgres-Vergleiche.

    Phase W: Postgres (Render) hat aware datetimes. SQLite (lokal)
    hat naive zurueckgeliefert; wir machen beides aware-UTC konsistent.
    """
    if ts.tzinfo is None:
        return ts.replace(tzinfo=UTC)
    return ts.astimezone(UTC)


def derive_cube_type(session_name: str | int | None, scramble_type: str | None) -> str:
    """Cube-Type aus Session-Name + scrType ableiten.

    Defensiv gegen csTimer-Default-Namen die Integers sein können
    (Session ohne eigenen Namen heisst dann z.B. `1`, nicht `"1"`).
    """
    name = str(session_name).strip() if session_name is not None else ""
    # 1) Name match
    if name in COMMON_CUBE_NAMES:
        return name
    # 2) scrType-Mapping
    if scramble_type is not None and scramble_type in SCRTYPE_TO_CUBE:
        return SCRTYPE_TO_CUBE[scramble_type]
    # 3) Fallback: Name as-is (User-defined Session-Name)
    return name or "3x3"


def parse_solve_entry(entry: list[Any]) -> dict[str, Any] | None:
    """Ein csTimer-Solve-Array zu Solve-Feldern parsen.

    Format: [[penalty, time_ms], scramble, comment, timestamp_unix]
    """
    try:
        penalty_block = entry[0]
        scramble = entry[1] if len(entry) > 1 else None
        comment = entry[2] if len(entry) > 2 else None
        ts_unix = entry[3] if len(entry) > 3 else None

        penalty = int(penalty_block[0])
        time_ms = int(penalty_block[1])
    except (IndexError, TypeError, ValueError):
        return None

    plus_two = penalty == 2000
    dnf = penalty == -1

    if ts_unix is None or not isinstance(ts_unix, int | float):
        ts = datetime.now(UTC)
    else:
        ts = datetime.fromtimestamp(ts_unix, tz=UTC)

    return {
        "time_ms": time_ms,
        "scramble": scramble or None,
        "notes": comment or None,
        "timestamp": ts,
        "plus_two": plus_two,
        "dnf": dnf,
    }


def parse_session_data(properties: dict[str, Any]) -> dict[int, dict[str, Any]]:
    """Liest properties.sessionData (JSON-String) zu {session_id: {name, scrType, rank}}.

    Security-Fix W.5-finding-7: defensiv gegen manipulierte JSON. Akzeptiert
    nur dict-Strukturen, ignoriert alles andere (statt 500-Crash).
    """
    raw = properties.get("sessionData")
    if not raw:
        return {}
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        return {}

    if not isinstance(data, dict):
        return {}

    result: dict[int, dict[str, Any]] = {}
    for key, val in data.items():
        try:
            session_id = int(key)
        except (ValueError, TypeError):
            continue
        if not isinstance(val, dict):
            continue
        opt = val.get("opt", {})
        if not isinstance(opt, dict):
            opt = {}
        result[session_id] = {
            "name": val.get("name", f"Session {session_id}"),
            "scramble_type": opt.get("scrType", ""),
            "rank": val.get("rank", session_id),
        }
    return result


@dataclass
class ImportResult:
    sessions_created: int
    sessions_updated: int
    solves_created: int
    solves_skipped_duplicate: int
    solves_skipped_invalid: int

    def to_dict(self) -> dict[str, int]:
        return {
            "sessions_created": self.sessions_created,
            "sessions_updated": self.sessions_updated,
            "solves_created": self.solves_created,
            "solves_skipped_duplicate": self.solves_skipped_duplicate,
            "solves_skipped_invalid": self.solves_skipped_invalid,
        }


def import_cstimer_json(
    payload: dict[str, Any],
    db: OrmSession,
    user_id: int,
    dry_run: bool = False,
) -> ImportResult:
    """csTimer-JSON-Daten für einen User importieren.

    Multi-User-Sicherheit:
    - cstimer_session_id ist pro User unique (siehe models.py),
      Sessions verschiedener User mit gleicher cstimer_id kollidieren NICHT
    - Alle Sessions/Solves bekommen user_id zugewiesen
    - Cross-User-Lesen findet nicht statt

    Idempotent: bei Re-Import werden Sessions per (user_id, cstimer_session_id)
    wiedererkannt, Solves per (session_id, timestamp, time_ms)-Triple.

    dry_run=True: rollt am Ende zurück (alle Counts bleiben aussagekraeftig).
    """
    properties = payload.get("properties", {})
    session_meta = parse_session_data(properties)

    result = ImportResult(0, 0, 0, 0, 0)
    existing_solve_keys_per_session: dict[int, set[tuple[datetime, int]]] = {}

    for key, solve_entries in payload.items():
        if not key.startswith("session"):
            continue
        try:
            cstimer_sid = int(key.removeprefix("session"))
        except ValueError:
            continue

        if not solve_entries:
            continue

        meta = session_meta.get(cstimer_sid, {})
        # csTimer-Default: Session ohne User-Namen heisst Integer (1, 2, ...).
        # DB-Column `name` ist String(128) -> zwingend zu str konvertieren.
        raw_name = meta.get("name", f"Session {cstimer_sid}")
        session_name = str(raw_name) if raw_name is not None else f"Session {cstimer_sid}"
        scramble_type = meta.get("scramble_type", "")

        # Session per (user_id, cstimer_session_id) finden oder anlegen
        existing = db.scalar(
            select(DbSession)
            .where(DbSession.user_id == user_id)
            .where(DbSession.cstimer_session_id == cstimer_sid)
        )
        if existing is None:
            session = DbSession(
                user_id=user_id,
                name=session_name,
                scramble_type=scramble_type or None,
                cstimer_session_id=cstimer_sid,
            )
            db.add(session)
            db.flush()
            result.sessions_created += 1
        else:
            updated = False
            if existing.name != session_name:
                existing.name = session_name
                updated = True
            if existing.scramble_type != (scramble_type or None):
                existing.scramble_type = scramble_type or None
                updated = True
            if updated:
                result.sessions_updated += 1
            session = existing

        # Bestehende Solve-Keys einmal pro Session laden (Dedup-Check)
        if session.id not in existing_solve_keys_per_session:
            keys: set[tuple[datetime, int]] = {
                (_to_aware_utc(ts), tm)
                for ts, tm in db.execute(
                    select(Solve.timestamp, Solve.time_ms)
                    .where(Solve.user_id == user_id)
                    .where(Solve.session_id == session.id)
                ).all()
            }
            existing_solve_keys_per_session[session.id] = keys

        cube_type = derive_cube_type(session_name, scramble_type)
        existing_keys = existing_solve_keys_per_session[session.id]

        for entry in solve_entries:
            parsed = parse_solve_entry(entry)
            if parsed is None:
                result.solves_skipped_invalid += 1
                continue

            dedup_key = (_to_aware_utc(parsed["timestamp"]), parsed["time_ms"])
            if dedup_key in existing_keys:
                result.solves_skipped_duplicate += 1
                continue

            solve = Solve(
                user_id=user_id,
                cube_type=cube_type,
                session_id=session.id,
                **parsed,
            )
            db.add(solve)
            existing_keys.add(dedup_key)
            result.solves_created += 1

    if dry_run:
        db.rollback()
    else:
        db.commit()

    return result

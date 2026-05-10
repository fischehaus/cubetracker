"""csTimer-Export-Logik (Phase W) — Multi-User-Variante.

Erzeugt csTimer-JSON-Format aus Cubetracker-Daten. Spiegel zum Importer
(importers/cstimer.py). Round-Trip: cubetracker → csTimer → cubetracker
ist ueber den Dedup-Mechanismus idempotent.

Multi-User-Sicherheit: alle Queries scope-en auf user_id. Kein Daten-Leak
zwischen Usern moeglich.

Selektoren (W.5):
- session_ids: nur diese Sessions exportieren (None = alle)
- cube_types: nur Solves dieser Cube-Types (None = alle)
"""

from __future__ import annotations

import json
from datetime import UTC
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.models import Session as DbSession, Solve

# Reverse-Lookup vom Importer: cube_type -> scrType
CUBE_TO_SCRTYPE = {
    "3x3": "",
    "OH": "333oh",
    "3BLD": "333bld",
    "2x2": "222so",
    "4x4": "444wca",
    "4BLD": "444bld",
    "5x5": "555wca",
    "5BLD": "555bld",
    "6x6": "666wca",
    "7x7": "777wca",
    "Pyraminx": "pyrso",
    "Skewb": "skbso",
    "Square-1": "sqrs",
    "Megaminx": "mgmp",
    "Clock": "clkwca",
    "Ivy": "ivyso",
    "Gear": "gearso",
}


def _penalty_code(s: Solve) -> int:
    if s.dnf:
        return -1
    if s.plus_two:
        return 2000
    return 0


def _to_unix(ts) -> int:
    if ts is None:
        return 0
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    return int(ts.timestamp())


def export_to_cstimer(
    db: OrmSession,
    user_id: int,
    session_ids: list[int] | None = None,
    cube_types: list[str] | None = None,
) -> dict[str, Any]:
    """csTimer-Format-Export der eigenen Daten.

    Schritte:
    1. Sessions laden (gefiltert wenn session_ids gesetzt)
    2. csTimer-IDs vergeben (existierende cstimer_session_id behalten,
       sonst max+1)
    3. Solves laden (gefiltert), gruppieren
    4. Pseudo-Session "Ohne Session" fuer session_id=NULL-Solves
    5. properties.sessionData als JSON-String einbetten (csTimer-Format)
    """
    # Sessions
    sess_stmt = (
        select(DbSession)
        .where(DbSession.user_id == user_id)
        .order_by(DbSession.id.asc())
    )
    if session_ids is not None:
        sess_stmt = sess_stmt.where(DbSession.id.in_(session_ids))
    sessions = list(db.scalars(sess_stmt).all())

    # csTimer-ID-Vergabe
    used_ids: set[int] = {
        s.cstimer_session_id for s in sessions if s.cstimer_session_id is not None
    }
    next_free = 1

    def next_free_id() -> int:
        nonlocal next_free
        while next_free in used_ids:
            next_free += 1
        used_ids.add(next_free)
        return next_free

    session_id_map: dict[int, int] = {}
    session_meta: dict[str, Any] = {}
    rank = 1

    for s in sessions:
        cs_id = s.cstimer_session_id or next_free_id()
        session_id_map[s.id] = cs_id
        scr_type = s.scramble_type or CUBE_TO_SCRTYPE.get(
            s.scramble_type or "", ""
        )
        session_meta[str(cs_id)] = {
            "name": s.name,
            "rank": rank,
            "opt": {"scrType": scr_type},
            "stat": [0, 0, 0, 0, 0, 0, 0],
        }
        rank += 1

    # Solves laden (eigene + ggf. cube/session-Filter)
    solve_stmt = (
        select(Solve)
        .where(Solve.user_id == user_id)
        .order_by(Solve.timestamp.asc())
    )
    if cube_types is not None:
        solve_stmt = solve_stmt.where(Solve.cube_type.in_(cube_types))
    if session_ids is not None:
        # Nur Solves der gewaehlten Sessions (session-lose excluded)
        solve_stmt = solve_stmt.where(Solve.session_id.in_(session_ids))
    all_solves = list(db.scalars(solve_stmt).all())

    # Pseudo-Session "Ohne Session"
    orphan_solves = [s for s in all_solves if s.session_id is None]
    orphan_cs_id: int | None = None
    if orphan_solves:
        orphan_cs_id = next_free_id()
        session_meta[str(orphan_cs_id)] = {
            "name": "Ohne Session",
            "rank": rank,
            "opt": {"scrType": ""},
            "stat": [0, 0, 0, 0, 0, 0, 0],
        }

    # Result-Skeleton
    result: dict[str, Any] = {}
    for cs_id_str in session_meta:
        result[f"session{cs_id_str}"] = []

    for s in all_solves:
        cs_id = (
            orphan_cs_id
            if s.session_id is None
            else session_id_map.get(s.session_id)
        )
        if cs_id is None:
            continue
        result[f"session{cs_id}"].append(
            [
                [_penalty_code(s), s.time_ms],
                s.scramble or "",
                s.notes or "",
                _to_unix(s.timestamp),
            ]
        )

    result["properties"] = {
        "sessionData": json.dumps(session_meta, separators=(",", ":"))
    }
    return result

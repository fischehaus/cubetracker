"""csTimer-Export-API.

Exportiert die DB im csTimer-JSON-Format. Spiegel zum Importer
(importers/cstimer.py). Round-Trip: cubetracker-Daten exportieren →
in csTimer importieren ist moeglich.

Format-Details siehe importers/cstimer.py — wir folgen der dort
dokumentierten Struktur exakt.

Beachten:
- Solves OHNE session_id werden in eine Pseudo-Session „Ohne Session"
  gepackt, damit nichts verloren geht. csTimer braucht jeden Solve in
  einer Session.
- cubetracker-spezifische Daten (Hardware-Zuordnung, Achievements)
  werden NICHT exportiert — csTimer kennt sie nicht. Fuer Voll-Backup
  bitte /backup/sqlite oder /backup/json benutzen.
- Sessions ohne cstimer_session_id (manuell angelegte) bekommen eine
  neue ID (max + 1, fortlaufend), damit das Format gueltig ist.
"""

from __future__ import annotations

import json
from datetime import UTC
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Session as DbSession
from db.models import Solve

router = APIRouter(prefix="/export", tags=["export"])

# Reverse-Lookup vom Importer: cube_type → scrType, fuer Sessions ohne
# eigenes scramble_type
CUBE_TO_SCRTYPE = {
    "3x3": "",  # csTimer-Default
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
    """csTimer-Penalty-Convention: -1=DNF, 2000=+2, 0=ok."""
    if s.dnf:
        return -1
    if s.plus_two:
        return 2000
    return 0


def _to_unix(timestamp_naive_utc: Any) -> int:
    """Naive UTC datetime → unix-seconds (int)."""
    if timestamp_naive_utc is None:
        return 0
    return int(timestamp_naive_utc.replace(tzinfo=UTC).timestamp())


@router.get("/cstimer")
def export_cstimer(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Voll-Export im csTimer-Format.

    Rueckgabe: dict mit session<N>-Keys (jeweils eine Solve-Liste) +
    properties.sessionData (JSON-String mit Session-Meta).
    """
    sessions = list(db.scalars(select(DbSession).order_by(DbSession.id.asc())).all())

    # 1. csTimer-IDs vergeben:
    #    - Sessions mit cstimer_session_id behalten ihre ID
    #    - Sessions ohne bekommen freie IDs (max+1, max+2, …)
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

    # cubetracker.session.id → csTimer.session-id
    session_id_map: dict[int, int] = {}
    session_meta: dict[str, Any] = {}  # str(csTimer-id) → meta
    rank = 1

    for s in sessions:
        cs_id = s.cstimer_session_id or next_free_id()
        session_id_map[s.id] = cs_id
        # scrType ableiten: wenn die Session schon einen hat, nimm den.
        # Sonst: vom Cube-Type des ersten zugehoerigen Solves
        # (falls vorhanden), sonst leer.
        scr_type = s.scramble_type or ""
        session_meta[str(cs_id)] = {
            "name": s.name,
            "rank": rank,
            "opt": {"scrType": scr_type},
            "stat": [0, 0, 0, 0, 0, 0, 0],  # csTimer-internes Stats-Array
        }
        rank += 1

    # 2. Pseudo-Session „Ohne Session" fuer session-lose Solves
    orphan_solves = list(db.scalars(select(Solve).where(Solve.session_id.is_(None))).all())
    orphan_cs_id: int | None = None
    if orphan_solves:
        orphan_cs_id = next_free_id()
        session_meta[str(orphan_cs_id)] = {
            "name": "Ohne Session",
            "rank": rank,
            "opt": {"scrType": ""},
            "stat": [0, 0, 0, 0, 0, 0, 0],
        }

    # 3. Solves laden + gruppieren
    result: dict[str, Any] = {}
    for cs_id_str in session_meta:
        result[f"session{cs_id_str}"] = []

    all_solves = list(db.scalars(select(Solve).order_by(Solve.timestamp.asc())).all())
    for s in all_solves:
        cs_id = orphan_cs_id if s.session_id is None else session_id_map.get(s.session_id)
        if cs_id is None:
            continue  # sollte nicht passieren

        result[f"session{cs_id}"].append(
            [
                [_penalty_code(s), s.time_ms],
                s.scramble or "",
                s.notes or "",
                _to_unix(s.timestamp),
            ]
        )

    # 4. properties.sessionData ist ein JSON-string IM JSON
    result["properties"] = {"sessionData": json.dumps(session_meta, separators=(",", ":"))}

    return result

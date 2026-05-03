"""API-Tests fuer csTimer-Export (Phase L+ d)."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from db.models import Session as DbSession
from db.models import Solve


def test_export_empty(client):
    r = client.get("/export/cstimer")
    assert r.status_code == 200
    data = r.json()
    # Bei leerer DB: nur properties, keine session-keys
    assert "properties" in data
    assert "sessionData" in data["properties"]
    session_meta = json.loads(data["properties"]["sessionData"])
    assert session_meta == {}
    # Kein „session1" etc.
    session_keys = [k for k in data if k.startswith("session")]
    assert session_keys == []


def test_export_with_one_session(client, db):
    s = DbSession(
        name="3x3",
        scramble_type="",
        cstimer_session_id=1,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    db.add(
        Solve(
            time_ms=12340,
            cube_type="3x3",
            session_id=s.id,
            scramble="R U R'",
            notes="solid",
            timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC).replace(tzinfo=None),
        )
    )
    db.commit()

    data = client.get("/export/cstimer").json()

    # session1 vorhanden mit einem solve
    assert "session1" in data
    assert len(data["session1"]) == 1

    solve_entry = data["session1"][0]
    # Format: [[penalty, time_ms], scramble, comment, timestamp_unix]
    assert solve_entry[0] == [0, 12340]  # ok, no penalty
    assert solve_entry[1] == "R U R'"
    assert solve_entry[2] == "solid"
    assert isinstance(solve_entry[3], int)  # unix-seconds

    # session-meta korrekt
    meta = json.loads(data["properties"]["sessionData"])
    assert "1" in meta
    assert meta["1"]["name"] == "3x3"


def test_export_dnf_and_plus_two(client, db):
    s = DbSession(name="3x3", cstimer_session_id=1)
    db.add(s)
    db.commit()
    db.refresh(s)
    db.add(Solve(time_ms=12000, cube_type="3x3", session_id=s.id, plus_two=True))
    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=s.id, dnf=True))
    db.commit()

    solves = client.get("/export/cstimer").json()["session1"]
    penalties = [entry[0][0] for entry in solves]
    assert 2000 in penalties  # +2
    assert -1 in penalties  # DNF


def test_export_sessions_without_cstimer_id_get_new_ids(client, db):
    """Manuell angelegte Sessions (cstimer_session_id=None) bekommen neue IDs."""
    s1 = DbSession(name="A", cstimer_session_id=1)  # behaelt 1
    s2 = DbSession(name="B")  # bekommt neue id
    s3 = DbSession(name="C", cstimer_session_id=5)  # behaelt 5
    s4 = DbSession(name="D")  # bekommt neue id
    db.add_all([s1, s2, s3, s4])
    db.commit()

    data = client.get("/export/cstimer").json()
    session_keys = sorted(int(k.replace("session", "")) for k in data if k.startswith("session"))
    # 1 + 5 sind belegt; 2, 3, 4 sind frei → s2 + s4 bekommen 2 und 3
    assert session_keys == [1, 2, 3, 5]


def test_export_orphan_solves_in_pseudo_session(client, db):
    """Solves ohne session_id landen in 'Ohne Session'-Pseudo-Session."""
    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=None))
    db.add(Solve(time_ms=11000, cube_type="3x3", session_id=None))
    db.commit()

    data = client.get("/export/cstimer").json()
    # Es sollte mind. eine session-key geben (die pseudo-session)
    session_keys = [k for k in data if k.startswith("session")]
    assert len(session_keys) == 1

    meta = json.loads(data["properties"]["sessionData"])
    # Eine meta-eintrag mit name "Ohne Session"
    names = [m["name"] for m in meta.values()]
    assert "Ohne Session" in names

    # Beide solves im pseudo
    assert len(data[session_keys[0]]) == 2


def test_export_round_trip_safe_via_importer(client, db):
    """End-to-end: export → re-import. Mit seconds-genauen timestamps
    sollte vollstaendige Idempotenz erreicht werden — csTimer-Format
    speichert nur unix-seconds (kein microsecond-precision).
    """
    s = DbSession(name="X", cstimer_session_id=1)
    db.add(s)
    db.commit()
    db.refresh(s)
    # WICHTIG: timestamps ohne microseconds, sonst geht round-trip-
    # idempotenz verloren (export trunkiert auf sekunden)
    base = datetime(2026, 5, 1, 12, 0, 0)  # naive, no microseconds
    from datetime import timedelta

    for i, t in enumerate([10000, 11000, 12000]):
        db.add(
            Solve(
                time_ms=t,
                cube_type="3x3",
                session_id=s.id,
                timestamp=base + timedelta(seconds=i),
            )
        )
    db.commit()

    # Export
    exported = client.get("/export/cstimer").json()

    # Re-import (ueber multipart)
    import io

    json_bytes = json.dumps(exported).encode()
    r = client.post(
        "/import/cstimer",
        files={"file": ("export.json", io.BytesIO(json_bytes), "application/json")},
    )
    assert r.status_code == 200
    result = r.json()
    # Idempotenz: 0 neue, 3 als duplikat erkannt
    assert result["solves_created"] == 0, f"Erwartet 0 neue, war {result}"
    assert result["solves_skipped_duplicate"] == 3

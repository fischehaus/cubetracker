"""API-Tests fuer Solves-CRUD (F2)."""

from __future__ import annotations

from db.models import Session as DbSession
from db.models import Solve


def test_list_solves_empty(client):
    r = client.get("/solves")
    assert r.status_code == 200
    assert r.json() == []


def test_create_solve(client):
    payload = {"time_ms": 12340, "cube_type": "3x3"}
    r = client.post("/solves", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["id"] is not None
    assert data["time_ms"] == 12340
    assert data["cube_type"] == "3x3"
    assert data["plus_two"] is False
    assert data["dnf"] is False
    assert data["effective_time_ms"] == 12340
    assert data["timestamp"] is not None


def test_create_solve_with_optional_fields(client):
    payload = {
        "time_ms": 9870,
        "cube_type": "4x4",
        "scramble": "U R U' R' …",
        "notes": "easy lucky case",
        "plus_two": True,
    }
    r = client.post("/solves", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["scramble"] == "U R U' R' …"
    assert data["notes"] == "easy lucky case"
    assert data["plus_two"] is True
    assert data["effective_time_ms"] == 9870 + 2000  # +2 Strafe


def test_create_solve_invalid_negative_time(client):
    r = client.post("/solves", json={"time_ms": -1, "cube_type": "3x3"})
    assert r.status_code == 422  # Pydantic-Validation


def test_create_solve_invalid_missing_cube_type(client):
    r = client.post("/solves", json={"time_ms": 12340})
    assert r.status_code == 422


def test_get_solve_by_id(client, db):
    solve = Solve(time_ms=11000, cube_type="3x3")
    db.add(solve)
    db.commit()
    db.refresh(solve)

    r = client.get(f"/solves/{solve.id}")
    assert r.status_code == 200
    assert r.json()["id"] == solve.id


def test_get_solve_404(client):
    r = client.get("/solves/9999")
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_list_solves_returns_newest_first(client, db):
    from datetime import UTC, datetime, timedelta

    base = datetime(2026, 1, 1, tzinfo=UTC)
    db.add_all(
        [
            Solve(time_ms=10000, cube_type="3x3", timestamp=base),
            Solve(time_ms=11000, cube_type="3x3", timestamp=base + timedelta(days=1)),
            Solve(time_ms=12000, cube_type="3x3", timestamp=base + timedelta(days=2)),
        ]
    )
    db.commit()

    r = client.get("/solves")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    assert data[0]["time_ms"] == 12000  # neueste zuerst
    assert data[2]["time_ms"] == 10000


def test_list_solves_filter_cube_type(client, db):
    db.add_all(
        [
            Solve(time_ms=10000, cube_type="3x3"),
            Solve(time_ms=20000, cube_type="4x4"),
            Solve(time_ms=11000, cube_type="3x3"),
        ]
    )
    db.commit()

    r = client.get("/solves?cube_type=3x3")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert all(s["cube_type"] == "3x3" for s in data)


def test_list_solves_filter_session_id(client, db):
    session = DbSession(name="Test", scramble_type="")
    db.add(session)
    db.commit()
    db.refresh(session)

    db.add_all(
        [
            Solve(time_ms=10000, cube_type="3x3", session_id=session.id),
            Solve(time_ms=20000, cube_type="3x3"),  # ohne Session
        ]
    )
    db.commit()

    r = client.get(f"/solves?session_id={session.id}")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["session_id"] == session.id


def test_list_solves_pagination(client, db):
    for i in range(15):
        db.add(Solve(time_ms=10000 + i, cube_type="3x3"))
    db.commit()

    r = client.get("/solves?limit=5&offset=0")
    assert r.status_code == 200
    assert len(r.json()) == 5

    r2 = client.get("/solves?limit=5&offset=10")
    assert r2.status_code == 200
    assert len(r2.json()) == 5


def test_patch_solve_toggle_plus_two(client, db):
    solve = Solve(time_ms=12340, cube_type="3x3")
    db.add(solve)
    db.commit()
    db.refresh(solve)

    r = client.patch(f"/solves/{solve.id}", json={"plus_two": True})
    assert r.status_code == 200
    data = r.json()
    assert data["plus_two"] is True
    assert data["effective_time_ms"] == 12340 + 2000


def test_patch_solve_404(client):
    r = client.patch("/solves/9999", json={"plus_two": True})
    assert r.status_code == 404


def test_patch_solve_partial_only_changes_given_fields(client, db):
    solve = Solve(time_ms=12340, cube_type="3x3", notes="original")
    db.add(solve)
    db.commit()
    db.refresh(solve)

    r = client.patch(f"/solves/{solve.id}", json={"plus_two": True})
    assert r.status_code == 200
    data = r.json()
    assert data["plus_two"] is True
    assert data["notes"] == "original"  # nicht geaendert


def test_delete_solve(client, db):
    solve = Solve(time_ms=12340, cube_type="3x3")
    db.add(solve)
    db.commit()
    db.refresh(solve)
    sid = solve.id

    r = client.delete(f"/solves/{sid}")
    assert r.status_code == 204

    r2 = client.get(f"/solves/{sid}")
    assert r2.status_code == 404


def test_delete_solve_404(client):
    r = client.delete("/solves/9999")
    assert r.status_code == 404


# ============================================================
# Phase 8: alg_case (Algorithm-Trainer-Tag)
# ============================================================


def test_create_solve_with_alg_case(client):
    """alg_case kann beim POST mitgegeben werden und kommt im read zurueck."""
    r = client.post(
        "/solves",
        json={
            "time_ms": 12340,
            "cube_type": "3x3",
            "scramble": "R U R U",
            "alg_case": "PLL-Tperm",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["alg_case"] == "PLL-Tperm"
    assert data["scramble"] == "R U R U"


def test_create_solve_without_alg_case_defaults_null(client):
    r = client.post("/solves", json={"time_ms": 10000, "cube_type": "3x3"})
    assert r.status_code == 201
    assert r.json()["alg_case"] is None


def test_patch_solve_alg_case(client, db):
    """PATCH kann alg_case nachtraeglich setzen oder loeschen."""
    solve = Solve(time_ms=12340, cube_type="3x3")
    db.add(solve)
    db.commit()
    db.refresh(solve)

    r = client.patch(f"/solves/{solve.id}", json={"alg_case": "OLL-21"})
    assert r.status_code == 200
    assert r.json()["alg_case"] == "OLL-21"

    r2 = client.patch(f"/solves/{solve.id}", json={"alg_case": None})
    assert r2.status_code == 200
    assert r2.json()["alg_case"] is None


def test_list_solves_filtered_by_alg_case(client, db):
    """Phase 8.1: GET /solves?alg_case=X liefert nur Solves dieses Cases."""
    db.add(Solve(time_ms=12000, cube_type="3x3", alg_case="PLL-Tperm"))
    db.add(Solve(time_ms=13000, cube_type="3x3", alg_case="PLL-Tperm"))
    db.add(Solve(time_ms=10000, cube_type="3x3", alg_case="PLL-Y"))
    db.add(Solve(time_ms=8000, cube_type="3x3", alg_case=None))
    db.commit()

    r = client.get("/solves?alg_case=PLL-Tperm")
    data = r.json()
    assert len(data) == 2
    assert all(s["alg_case"] == "PLL-Tperm" for s in data)


def test_list_solves_filter_alg_case_combinable_with_cube_type(client, db):
    """alg_case-Filter kann mit cube_type kombiniert werden."""
    db.add(Solve(time_ms=12000, cube_type="3x3", alg_case="PLL-Tperm"))
    db.add(Solve(time_ms=60000, cube_type="4x4", alg_case="PLL-Tperm"))  # nonsens, aber ok
    db.commit()

    r = client.get("/solves?alg_case=PLL-Tperm&cube_type=3x3")
    data = r.json()
    assert len(data) == 1
    assert data[0]["cube_type"] == "3x3"


def test_create_solve_with_split_times_ms(client):
    """Phase 8.2: split_times_ms wird als JSON-string persistiert."""
    r = client.post(
        "/solves",
        json={
            "time_ms": 9000,
            "cube_type": "3x3",
            "split_times_ms": "[1500,5000,1500,1000]",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["split_times_ms"] == "[1500,5000,1500,1000]"


def test_solve_default_split_times_null(client):
    r = client.post("/solves", json={"time_ms": 10000, "cube_type": "3x3"})
    assert r.status_code == 201
    assert r.json()["split_times_ms"] is None


def test_cstimer_import_keeps_split_times_null(client, db):
    """Phase 8.2 Compat: csTimer kennt split_times nicht.
    Re-Import eines Solves mit existing split_times darf den Wert
    nicht ueberschreiben — Importer findet duplicate via dedup-key
    (timestamp+time_ms+session) und macht KEIN update auf split_times.
    """
    from datetime import UTC, datetime

    from db.models import Session as DbSession

    # Session mit cstimer_session_id=1 vorab anlegen, damit der Importer
    # dieselbe Session matcht — sonst landet der Import in einer neuen
    # Session und der Original-Solve waere nicht in der dedup-Set.
    sess = DbSession(name="3x3", cstimer_session_id=1)
    db.add(sess)
    db.commit()
    db.refresh(sess)

    s = Solve(
        time_ms=10000,
        cube_type="3x3",
        session_id=sess.id,
        timestamp=datetime(2026, 5, 1, 12, 0, 0),
        split_times_ms="[2500,5000,1500,1000]",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    sid = s.id

    # csTimer-style import-payload mit demselben dedup-key
    import io
    import json

    # WICHTIG: timestamp explizit als UTC ausdruecken, sonst interpretiert
    # datetime.timestamp() naive als lokale TZ → dedup-key matched nicht.
    unix_ts = int(datetime(2026, 5, 1, 12, 0, 0, tzinfo=UTC).timestamp())
    payload = {
        # csTimer-format: [[penalty, time_ms], scramble, comment, unix_ts]
        "session1": [[[0, 10000], "R U", "", unix_ts]],
        "properties": {"sessionData": '{"1":{"name":"3x3","opt":{"scrType":"333"},"rank":1}}'},
    }
    r = client.post(
        "/import/cstimer",
        files={"file": ("x.json", io.BytesIO(json.dumps(payload).encode()), "application/json")},
    )
    assert r.status_code == 200
    # Solve sollte als duplicate erkannt sein
    assert r.json()["solves_skipped_duplicate"] == 1

    # split_times_ms muss erhalten geblieben sein
    db.expire_all()
    refetched = db.get(Solve, sid)
    assert refetched is not None
    assert refetched.split_times_ms == "[2500,5000,1500,1000]"


# ============================================================
# Phase 8.3: PB-Detection (X-PB-Achieved Header)
# ============================================================


def test_first_solve_no_pb_header(client):
    """Erster Solve liefert KEINEN PB-header — eine einzelne Zeit ist
    automatisch der best, aber wir wollen Confetti nur bei Verbesserungen.
    Ausnahme: per Definition ist der erste Single auch der erste PB.
    """
    r = client.post("/solves", json={"time_ms": 12000, "cube_type": "3x3"})
    assert r.status_code == 201
    # Erster Solve = Single-PB (es gab vorher keinen)
    header = r.headers.get("X-PB-Achieved", "")
    assert "single" in header.split(",")


def test_slower_solve_no_pb(client, db):
    db.add(Solve(time_ms=10000, cube_type="3x3"))
    db.commit()
    r = client.post("/solves", json={"time_ms": 12000, "cube_type": "3x3"})
    assert r.headers.get("X-PB-Achieved", "") == ""


def test_faster_solve_triggers_single_pb(client, db):
    db.add(Solve(time_ms=12000, cube_type="3x3"))
    db.commit()
    r = client.post("/solves", json={"time_ms": 10000, "cube_type": "3x3"})
    pbs = r.headers.get("X-PB-Achieved", "").split(",")
    assert "single" in pbs


def test_dnf_no_single_pb(client):
    r = client.post("/solves", json={"time_ms": 0, "cube_type": "3x3", "dnf": True})
    pbs = r.headers.get("X-PB-Achieved", "").split(",")
    assert "single" not in pbs


def test_ao5_pb_when_5th_solve_improves_avg(client, db):
    """5 Solves: erste 4 haben keine ao5; der 5. setzt erstmal ao5 ein
    Single-PB-Header ist da, ao5-Header auch (erstmals gesetzt)."""
    for t in [10000, 11000, 12000, 13000]:
        db.add(Solve(time_ms=t, cube_type="3x3"))
    db.commit()
    r = client.post("/solves", json={"time_ms": 9000, "cube_type": "3x3"})
    pbs = r.headers.get("X-PB-Achieved", "").split(",")
    assert "single" in pbs
    assert "ao5" in pbs

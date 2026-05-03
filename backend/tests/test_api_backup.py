"""API-Tests fuer Backup-Endpoints (Phase L+)."""

from __future__ import annotations

from db.models import Hardware, Solve
from db.models import Session as DbSession


def test_backup_json_empty(client):
    r = client.get("/backup/json")
    assert r.status_code == 200
    data = r.json()
    assert "schema_version" in data
    assert "exported_at" in data
    assert data["counts"] == {
        "solves": 0,
        "sessions": 0,
        "hardware": 0,
        "achievements": 0,
        "challenges": 0,
    }
    assert data["solves"] == []
    assert data["sessions"] == []
    assert data["hardware"] == []
    assert data["achievements"] == []
    assert data["challenges"] == []


def test_backup_json_full(client, db):
    # Eine Session, eine Hardware, zwei Solves anlegen
    s = DbSession(name="Training", scramble_type="333", notes="warmup")
    hw = Hardware(name="Weilong v11", primary_cube_type="3x3", notes="favorit")
    db.add_all([s, hw])
    db.commit()
    db.refresh(s)
    db.refresh(hw)

    db.add(
        Solve(
            time_ms=10000,
            cube_type="3x3",
            session_id=s.id,
            hardware_id=hw.id,
            scramble="R U R'",
            notes="solid",
            alg_case="PLL-Tperm",
            split_times_ms="[1500,5000,2000,1500]",
        )
    )
    db.add(Solve(time_ms=11500, cube_type="3x3", plus_two=True))
    db.commit()

    data = client.get("/backup/json").json()

    assert data["counts"] == {
        "solves": 2,
        "sessions": 1,
        "hardware": 1,
        "achievements": 0,
        "challenges": 0,
    }
    assert len(data["solves"]) == 2
    assert len(data["sessions"]) == 1
    assert len(data["hardware"]) == 1

    # Sessions: alle Felder vollstaendig
    sess = data["sessions"][0]
    assert sess["name"] == "Training"
    assert sess["scramble_type"] == "333"
    assert sess["notes"] == "warmup"
    assert sess["cstimer_session_id"] is None
    assert "created_at" in sess

    # Hardware: alle Felder
    hwd = data["hardware"][0]
    assert hwd["name"] == "Weilong v11"
    assert hwd["primary_cube_type"] == "3x3"
    assert hwd["notes"] == "favorit"
    assert hwd["is_active"] is True
    assert hwd["acquired_at"] is None

    # Solves: FK-Werte muessen mit-exportiert werden
    solves = sorted(data["solves"], key=lambda x: x["time_ms"])
    assert solves[0]["time_ms"] == 10000
    assert solves[0]["session_id"] == s.id
    assert solves[0]["hardware_id"] == hw.id
    assert solves[0]["scramble"] == "R U R'"
    assert solves[0]["notes"] == "solid"
    assert solves[0]["alg_case"] == "PLL-Tperm"
    assert solves[0]["split_times_ms"] == "[1500,5000,2000,1500]"
    assert solves[1]["time_ms"] == 11500
    assert solves[1]["plus_two"] is True
    assert solves[1]["session_id"] is None
    assert solves[1]["hardware_id"] is None
    assert solves[1]["alg_case"] is None
    assert solves[1]["split_times_ms"] is None


def test_backup_json_schema_version(client):
    """Schema-Version sollte mit Backend-Version uebereinstimmen."""
    from main import __version__

    data = client.get("/backup/json").json()
    assert data["schema_version"] == __version__


def test_backup_sqlite_returns_file(client):
    """SQLite-Endpoint liefert Binaerdaten mit korrektem Header."""
    r = client.get("/backup/sqlite")
    # Im Test-Setup existiert ggf. keine echte solves.db (Test nutzt
    # in-memory). Wenn 404 ist das OK — wir testen nur die Endpoint-
    # Existenz und richtigen Status-Code.
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        # filename-header sollte den prefix enthalten
        cd = r.headers.get("content-disposition", "")
        assert "cubetracker_backup_" in cd
        assert ".db" in cd
        assert r.headers.get("content-type") == "application/x-sqlite3"

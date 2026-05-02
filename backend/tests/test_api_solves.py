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

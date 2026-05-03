"""API-Tests fuer Achievements (Phase 7a)."""

from __future__ import annotations

from db.models import Hardware, Solve


def test_list_achievements_empty(client):
    """Bei leerer DB: alle Definitionen, keine unlocked."""
    r = client.get("/achievements")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0  # mind. eine definition
    for a in data:
        assert "code" in a
        assert "name" in a
        assert "description" in a
        assert "category" in a
        assert "icon" in a
        assert a["unlocked_at"] is None


def test_recheck_unlocks_volume_100(client, db):
    # 100 valide Solves anlegen
    for _ in range(100):
        db.add(Solve(time_ms=10000, cube_type="3x3"))
    db.commit()

    r = client.post("/achievements/recheck")
    data = r.json()
    assert "volume_100" in data["newly_unlocked"]
    assert data["newly_unlocked_count"] >= 1
    assert data["total_unlocked"] >= 1


def test_recheck_idempotent(client, db):
    """Zweiter recheck ohne Datenaenderung: 0 neue."""
    for _ in range(100):
        db.add(Solve(time_ms=10000, cube_type="3x3"))
    db.commit()

    client.post("/achievements/recheck")
    r2 = client.post("/achievements/recheck")
    assert r2.json()["newly_unlocked_count"] == 0


def test_create_solve_triggers_achievement_via_header(client, db):
    """POST /solves liefert X-Achievements-Unlocked Header bei neu unlocked."""
    # 99 Solves im DB
    for _ in range(99):
        db.add(Solve(time_ms=10000, cube_type="3x3"))
    db.commit()

    # Der 100. Solve via API → soll volume_100 unlocken
    r = client.post(
        "/solves",
        json={"time_ms": 10500, "cube_type": "3x3"},
    )
    assert r.status_code == 201
    header = r.headers.get("X-Achievements-Unlocked", "")
    assert "volume_100" in header.split(",")


def test_create_solve_no_unlock_no_header(client, db):
    """Wenn nichts neu unlocked: kein Header gesetzt."""
    r = client.post("/solves", json={"time_ms": 30000, "cube_type": "3x3"})
    assert r.status_code == 201
    # Header darf fehlen oder leer sein
    assert r.headers.get("X-Achievements-Unlocked", "") == ""


def test_list_after_unlock_shows_unlocked_at(client, db):
    """GET /achievements liefert unlocked_at-timestamp nach unlock."""
    db.add(Hardware(name="W11", primary_cube_type="3x3"))
    db.commit()
    client.post("/achievements/recheck")

    items = client.get("/achievements").json()
    hw_first = next(a for a in items if a["code"] == "hardware_first")
    assert hw_first["unlocked_at"] is not None


def test_hardware_create_triggers_unlock_via_header(client):
    r = client.post(
        "/hardware",
        json={"name": "W11", "primary_cube_type": "3x3"},
    )
    assert r.status_code == 201
    header = r.headers.get("X-Achievements-Unlocked", "")
    assert "hardware_first" in header.split(",")


def test_seed_includes_newly_unlocked_in_body(client):
    r = client.post("/hardware/seed")
    data = r.json()
    # Seed laedt 35+ hardware → unlockt hardware_first + hardware_5
    assert "newly_unlocked_achievements" in data
    assert "hardware_first" in data["newly_unlocked_achievements"]
    assert "hardware_5" in data["newly_unlocked_achievements"]

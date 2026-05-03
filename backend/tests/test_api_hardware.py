"""API-Tests fuer Hardware-CRUD + Seed-Endpoint (Phase 5 / F16)."""

from __future__ import annotations

from db.models import Hardware


def test_list_empty(client):
    r = client.get("/hardware")
    assert r.status_code == 200
    assert r.json() == []


def test_create_minimal(client):
    r = client.post(
        "/hardware",
        json={"name": "Weilong v11", "primary_cube_type": "3x3"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Weilong v11"
    assert data["primary_cube_type"] == "3x3"
    assert data["is_active"] is True
    assert data["notes"] is None
    assert data["acquired_at"] is None
    assert "id" in data
    assert "created_at" in data


def test_create_full(client):
    r = client.post(
        "/hardware",
        json={
            "name": "Gan 15",
            "primary_cube_type": "3x3",
            "notes": "Lieblings-Cube",
            "is_active": True,
            "acquired_at": "2025-12-01T00:00:00Z",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["notes"] == "Lieblings-Cube"


def test_list_sorted_active_first(client, db):
    # 1 inaktiv, 2 aktiv (mit verschiedenen Namen)
    db.add(Hardware(name="Old Cube", primary_cube_type="3x3", is_active=False))
    db.add(Hardware(name="Zebra", primary_cube_type="3x3", is_active=True))
    db.add(Hardware(name="Alpha", primary_cube_type="3x3", is_active=True))
    db.commit()

    items = client.get("/hardware").json()
    # Aktive zuerst, alphabetisch
    assert [h["name"] for h in items] == ["Alpha", "Zebra", "Old Cube"]


def test_list_filter_cube_type(client, db):
    db.add(Hardware(name="X", primary_cube_type="3x3"))
    db.add(Hardware(name="Y", primary_cube_type="2x2"))
    db.commit()
    items = client.get("/hardware?cube_type=3x3").json()
    assert len(items) == 1
    assert items[0]["name"] == "X"


def test_list_active_only(client, db):
    db.add(Hardware(name="A", primary_cube_type="3x3", is_active=True))
    db.add(Hardware(name="B", primary_cube_type="3x3", is_active=False))
    db.commit()
    items = client.get("/hardware?active_only=true").json()
    assert len(items) == 1
    assert items[0]["name"] == "A"


def test_get_404(client):
    r = client.get("/hardware/9999")
    assert r.status_code == 404


def test_patch_partial(client):
    create = client.post("/hardware", json={"name": "X", "primary_cube_type": "3x3"}).json()
    r = client.patch(f"/hardware/{create['id']}", json={"notes": "neue notiz"})
    assert r.status_code == 200
    data = r.json()
    assert data["notes"] == "neue notiz"
    assert data["name"] == "X"  # unveraendert


def test_patch_set_inactive(client):
    create = client.post("/hardware", json={"name": "X", "primary_cube_type": "3x3"}).json()
    r = client.patch(f"/hardware/{create['id']}", json={"is_active": False})
    assert r.json()["is_active"] is False


def test_delete(client):
    create = client.post("/hardware", json={"name": "X", "primary_cube_type": "3x3"}).json()
    r = client.delete(f"/hardware/{create['id']}")
    assert r.status_code == 204
    assert client.get(f"/hardware/{create['id']}").status_code == 404


def test_delete_does_not_break_solves(client, db):
    """Wenn Hardware geloescht wird, sollen Solves bleiben (FK SET NULL)."""
    from db.models import Solve

    hw = Hardware(name="Test", primary_cube_type="3x3")
    db.add(hw)
    db.commit()
    db.refresh(hw)
    db.add(Solve(time_ms=10000, cube_type="3x3", hardware_id=hw.id))
    db.commit()

    client.delete(f"/hardware/{hw.id}")
    # Solve sollte noch existieren, hardware_id NULL
    solves = client.get("/solves").json()
    assert len(solves) == 1
    assert solves[0]["hardware_id"] is None


# ============================================================
# Seed-Endpoint
# ============================================================


def test_seed_loads_when_empty(client):
    r = client.post("/hardware/seed")
    assert r.status_code == 200
    data = r.json()
    assert data["loaded"] > 0
    assert data["skipped_because_not_empty"] is False
    # Eintraege sind tatsaechlich da
    items = client.get("/hardware").json()
    assert len(items) == data["loaded"]


def test_seed_skips_if_not_empty(client):
    # Erst seed, dann nochmal
    client.post("/hardware/seed")
    r = client.post("/hardware/seed")
    data = r.json()
    assert data["loaded"] == 0
    assert data["skipped_because_not_empty"] is True


def test_seed_force_inserts_anyway(client):
    client.post("/hardware/seed")
    first_count = len(client.get("/hardware").json())
    r = client.post("/hardware/seed?force=true")
    assert r.json()["loaded"] > 0
    second_count = len(client.get("/hardware").json())
    assert second_count == 2 * first_count


# ============================================================
# Suggest-Endpoint (Phase 5b-4)
# ============================================================


def test_suggest_empty_no_hardware(client):
    r = client.get("/hardware/suggest?cube_type=3x3")
    data = r.json()
    assert data["hardware_id"] is None
    assert data["reason"] == "none"


def test_suggest_first_active_when_no_solves_yet(client, db):
    """Wenn Hardware existiert, aber keine Solves: erste aktive vorschlagen."""
    db.add(Hardware(name="Default 3x3", primary_cube_type="3x3"))
    db.add(Hardware(name="Andere", primary_cube_type="3x3"))
    db.commit()
    r = client.get("/hardware/suggest?cube_type=3x3")
    data = r.json()
    assert data["hardware_id"] is not None
    assert data["reason"] == "first_active"


def test_suggest_picks_most_used(client, db):
    from db.models import Solve

    hw1 = Hardware(name="Selten", primary_cube_type="3x3")
    hw2 = Hardware(name="Oft", primary_cube_type="3x3")
    db.add_all([hw1, hw2])
    db.commit()
    db.refresh(hw1)
    db.refresh(hw2)

    db.add(Solve(time_ms=10000, cube_type="3x3", hardware_id=hw1.id))
    for _ in range(5):
        db.add(Solve(time_ms=11000, cube_type="3x3", hardware_id=hw2.id))
    db.commit()

    r = client.get("/hardware/suggest?cube_type=3x3")
    data = r.json()
    assert data["hardware_id"] == hw2.id
    assert data["count"] == 5
    assert data["reason"] == "most_used"


def test_suggest_inactive_skipped_in_fallback(client, db):
    """Inaktive werden im fallback (first_active) ignoriert."""
    db.add(Hardware(name="Inaktiv", primary_cube_type="3x3", is_active=False))
    db.commit()
    r = client.get("/hardware/suggest?cube_type=3x3")
    assert r.json()["hardware_id"] is None
    assert r.json()["reason"] == "none"

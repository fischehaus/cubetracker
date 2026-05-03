"""API-Tests fuer Daily Challenges (Phase 7b)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from db.models import Solve


def _add_solves(db, count: int, cube_type: str = "3x3", days_offset: int = 0):
    """Hilfsfunktion: N solves mit timestamp = now-days_offset anlegen."""
    base = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days_offset)
    for i in range(count):
        db.add(
            Solve(
                time_ms=10000 + i * 100,
                cube_type=cube_type,
                timestamp=base + timedelta(seconds=i),
            )
        )
    db.commit()


def test_today_returns_empty_when_no_data(client):
    """Frische DB: generator generiert nur volume-challenge (target=10).
    Speed/Comeback brauchen historische Daten.
    """
    r = client.get("/challenges/today")
    assert r.status_code == 200
    data = r.json()
    assert "date" in data
    assert "challenges" in data
    # Mind. 1 challenge (volume mit fallback target=10)
    assert len(data["challenges"]) >= 1
    kinds = [c["kind"] for c in data["challenges"]]
    assert "volume" in kinds


def test_today_idempotent_within_same_day(client, db):
    _add_solves(db, 5)
    r1 = client.get("/challenges/today").json()
    r2 = client.get("/challenges/today").json()
    # Gleiche IDs → keine doppelte generierung
    assert [c["id"] for c in r1["challenges"]] == [c["id"] for c in r2["challenges"]]


def test_regenerate_replaces_today(client, db):
    """Nach Regenerate sind die alten Records geloescht — nur die neuen
    sind aktiv. SQLite reused IDs, daher pruefen wir das ueber
    progress/created_at: bei einem fresh-generierten challenge ist
    progress=0, ein bereits genutzter haette ggf. progress > 0.
    """
    _add_solves(db, 5)
    # Erst challenges generieren + einen solve machen damit progress steigt
    client.get("/challenges/today")
    client.post("/solves", json={"time_ms": 12000, "cube_type": "3x3"})
    r1 = client.get("/challenges/today").json()
    vol1 = next(c for c in r1["challenges"] if c["kind"] == "volume")
    assert vol1["progress"] >= 1  # progress wurde getrackt

    # Regenerate sollte progress zuruecksetzen (alte challenges weg, neue mit 0)
    r2 = client.post("/challenges/today/regenerate").json()
    vol2 = next(c for c in r2["challenges"] if c["kind"] == "volume")
    assert vol2["progress"] == 0  # frisch generiert


def test_dismiss_marks_challenge(client, db):
    _add_solves(db, 5)
    challenges = client.get("/challenges/today").json()["challenges"]
    cid = challenges[0]["id"]
    r = client.post(f"/challenges/{cid}/dismiss")
    assert r.status_code == 200
    assert r.json()["dismissed"] is True


def test_dismiss_unknown_404(client):
    r = client.post("/challenges/9999/dismiss")
    assert r.status_code == 404


def test_solve_create_increments_volume_progress(client):
    """Volume-challenge progress muss bei jedem solve hochzaehlen."""
    # Sicherstellen dass es heutige challenges gibt
    client.get("/challenges/today")

    # Solve erstellen
    r = client.post("/solves", json={"time_ms": 12000, "cube_type": "3x3"})
    assert r.status_code == 201

    # Heutige challenges nochmal holen
    challenges = client.get("/challenges/today").json()["challenges"]
    vol = next(c for c in challenges if c["kind"] == "volume")
    assert vol["progress"] >= 1


def test_dnf_does_not_count_for_volume(client):
    client.get("/challenges/today")
    client.post(
        "/solves",
        json={"time_ms": 0, "cube_type": "3x3", "dnf": True},
    )
    challenges = client.get("/challenges/today").json()["challenges"]
    vol = next(c for c in challenges if c["kind"] == "volume")
    assert vol["progress"] == 0


def test_completion_sets_header(client):
    """Wenn ein solve eine challenge erfuellt, kommt header X-Challenges-Completed."""
    client.get("/challenges/today")
    challenges = client.get("/challenges/today").json()["challenges"]
    vol = next(c for c in challenges if c["kind"] == "volume")
    target = vol["target_value"]

    # genug solves um zu erfuellen — letzter sollte den header setzen
    last_response = None
    for i in range(target):
        last_response = client.post("/solves", json={"time_ms": 10000 + i * 10, "cube_type": "3x3"})
    # Der letzte solve sollte completion getriggert haben
    assert last_response is not None
    header = last_response.headers.get("X-Challenges-Completed", "")
    assert header  # nicht leer
    assert str(vol["id"]) in header.split(",")


def test_history_returns_entries(client, db):
    _add_solves(db, 5)
    client.get("/challenges/today")  # generiert challenges
    r = client.get("/challenges/history?days=30")
    data = r.json()
    assert "challenges" in data
    assert len(data["challenges"]) >= 1

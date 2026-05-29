"""Smoke: Roadmap-Export-Endpoint (key-gated, W.roadmap-export-key).

Testet:
 - kein ENV-Key gesetzt -> 404 (Endpoint deaktiviert)
 - falscher / fehlender Key -> 404 (versteckt Existenz)
 - richtiger Key -> volle Items inkl. internal
 - POST /export/done setzt status, ist idempotent (already_done bei Re-Run)
 - leere Titel-Liste -> 422 (min_length=1)
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from db.models import RoadmapItem

EXPORT = "/api/roadmap/export"
EXPORT_DONE = "/api/roadmap/export/done"
TEST_KEY = "test_export_key_1234567890abcdef"


def _seed_items(db) -> None:
    """3 Items: 1 public, 2 internal."""
    db.add_all(
        [
            RoadmapItem(
                phase_id="P1",
                sort_order=10,
                title_de="Public Item",
                title_en="Public Item",
                status="active",
                internal=False,
            ),
            RoadmapItem(
                phase_id="P1",
                sort_order=20,
                title_de="Intern Item A",
                title_en="Intern Item A",
                status="active",
                internal=True,
            ),
            RoadmapItem(
                phase_id="P6",
                sort_order=10,
                title_de="Intern Item B",
                title_en="Intern Item B",
                status="active",
                internal=True,
            ),
        ]
    )
    db.commit()


def test_export_disabled_when_no_env_key(client: TestClient, monkeypatch) -> None:
    monkeypatch.delenv("ROADMAP_EXPORT_KEY", raising=False)
    r = client.get(EXPORT, headers={"X-Roadmap-Key": "anything"})
    assert r.status_code == 404, r.text


def test_export_wrong_key_returns_404(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    r = client.get(EXPORT, headers={"X-Roadmap-Key": "definitely-wrong"})
    assert r.status_code == 404, r.text


def test_export_missing_header_returns_404(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    r = client.get(EXPORT)  # kein X-Roadmap-Key
    assert r.status_code == 404, r.text


def test_export_correct_key_returns_all_items_incl_internal(
    client: TestClient, monkeypatch, db_session
) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    _seed_items(db_session)
    r = client.get(EXPORT, headers={"X-Roadmap-Key": TEST_KEY})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] == 3
    assert body["is_admin"] is True
    assert body["export"] is True
    titles = {it["title_de"] for it in body["items"]}
    assert titles == {"Public Item", "Intern Item A", "Intern Item B"}
    internals = [it for it in body["items"] if it["internal"]]
    assert len(internals) == 2  # internal-Items werden mit-geliefert


def test_export_done_marks_items_and_is_idempotent(
    client: TestClient, monkeypatch, db_session
) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    _seed_items(db_session)
    r = client.post(
        EXPORT_DONE,
        json={"titles": ["Public Item", "Intern Item A", "Nicht existent"]},
        headers={"X-Roadmap-Key": TEST_KEY},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body["updated"]) == {"Public Item", "Intern Item A"}
    assert body["already_done"] == []
    assert body["not_found"] == ["Nicht existent"]

    # Idempotenz: zweiter Lauf -> already_done
    r2 = client.post(
        EXPORT_DONE,
        json={"titles": ["Public Item"]},
        headers={"X-Roadmap-Key": TEST_KEY},
    )
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["already_done"] == ["Public Item"]
    assert body2["updated"] == []


def test_export_done_without_key_is_404(
    client: TestClient, monkeypatch, db_session
) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    _seed_items(db_session)
    r = client.post(EXPORT_DONE, json={"titles": ["Public Item"]})  # kein Header
    assert r.status_code == 404, r.text


def test_export_done_empty_titles_is_422(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ROADMAP_EXPORT_KEY", TEST_KEY)
    r = client.post(
        EXPORT_DONE, json={"titles": []}, headers={"X-Roadmap-Key": TEST_KEY}
    )
    assert r.status_code == 422, r.text  # min_length=1

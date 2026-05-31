"""Smoke: Feedback -> Roadmap-Pipeline (W.feedback-roadmap-pipeline, 2026-05-31).

Deckt ab: Happy-Path (Item angelegt + source_feedback_id + Feedback-Status +
Antwort), 404 bei unbekanntem Feedback, Admin-Guard fuer Non-Admins.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _make_feedback(db_session, *, message: str = "Bitte Dark-Mode", user_id=None):
    from db.models import FeedbackMessage

    fb = FeedbackMessage(
        user_id=user_id, category="feature", message=message, status="new"
    )
    db_session.add(fb)
    db_session.commit()
    db_session.refresh(fb)
    return fb


def test_feedback_to_roadmap_creates_item(client: TestClient, make_user, db_session) -> None:
    user, _ = make_user()
    _, admin_headers = make_user(is_admin=True)
    fb = _make_feedback(db_session, message="Bitte Dark-Mode-Toggle", user_id=user.id)

    r = client.post(
        f"/api/admin/feedback/{fb.id}/to-roadmap",
        headers=admin_headers,
        json={
            "phase_id": "P1",
            "title_de": "Dark-Mode-Toggle",
            "title_en": "Dark mode toggle",
            "note_de": "Aus User-Feedback.",
            "internal": True,
            "feedback_status": "in_progress",
            "admin_response": "Danke, steht auf der Roadmap!",
        },
    )
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["phase_id"] == "P1"
    assert item["title_de"] == "Dark-Mode-Toggle"
    assert item["status"] == "active"
    assert item["internal"] is True
    assert item["source_feedback_id"] == fb.id

    # Feedback wurde in derselben Transaktion aktualisiert.
    from db.models import FeedbackMessage

    db_session.expire_all()
    updated = db_session.get(FeedbackMessage, fb.id)
    assert updated is not None
    assert updated.status == "in_progress"
    assert updated.admin_response == "Danke, steht auf der Roadmap!"
    assert updated.admin_response_by_user_id is not None

    # Das Item taucht in der Admin-Roadmap auf.
    rr = client.get("/api/roadmap", headers=admin_headers)
    assert rr.status_code == 200
    titles = [it["title_de"] for it in rr.json()["items"]]
    assert "Dark-Mode-Toggle" in titles


def test_feedback_to_roadmap_missing_feedback_404(client: TestClient, make_user) -> None:
    _, admin_headers = make_user(is_admin=True)
    r = client.post(
        "/api/admin/feedback/999999/to-roadmap",
        headers=admin_headers,
        json={"phase_id": "P1", "title_de": "X", "title_en": "X"},
    )
    assert r.status_code == 404, r.text


def test_feedback_to_roadmap_requires_admin(client: TestClient, make_user, db_session) -> None:
    user, user_headers = make_user()  # Non-Admin
    fb = _make_feedback(db_session, user_id=user.id)
    r = client.post(
        f"/api/admin/feedback/{fb.id}/to-roadmap",
        headers=user_headers,
        json={"phase_id": "P1", "title_de": "X", "title_en": "X"},
    )
    # require_admin versteckt Admin-Endpoints vor Non-Admins (404 statt 403).
    assert r.status_code in (403, 404), r.text


def test_feedback_to_roadmap_tester_forbidden(client: TestClient, make_user, db_session) -> None:
    """Auch ein Tester (is_tester, NICHT is_admin) darf nicht konvertieren —
    die Feedback-Inbox ist admin-only."""
    user, headers = make_user(is_tester=True)
    fb = _make_feedback(db_session, user_id=user.id)
    r = client.post(
        f"/api/admin/feedback/{fb.id}/to-roadmap",
        headers=headers,
        json={"phase_id": "P1", "title_de": "X", "title_en": "X"},
    )
    assert r.status_code in (403, 404), r.text

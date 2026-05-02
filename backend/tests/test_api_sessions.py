"""API-Tests fuer Sessions-Endpoint (F2, minimal)."""

from __future__ import annotations

from db.models import Session as DbSession


def test_list_sessions_empty(client):
    r = client.get("/sessions")
    assert r.status_code == 200
    assert r.json() == []


def test_list_sessions_alphabetical(client, db):
    db.add_all(
        [
            DbSession(name="3x3", scramble_type="", cstimer_session_id=1),
            DbSession(name="OH", scramble_type=""),
            DbSession(name="2x2", scramble_type="222so", cstimer_session_id=2),
        ]
    )
    db.commit()

    r = client.get("/sessions")
    assert r.status_code == 200
    data = r.json()
    assert [s["name"] for s in data] == ["2x2", "3x3", "OH"]


def test_get_session_by_id(client, db):
    session = DbSession(name="Megaminx", scramble_type="mgmp")
    db.add(session)
    db.commit()
    db.refresh(session)

    r = client.get(f"/sessions/{session.id}")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Megaminx"
    assert data["scramble_type"] == "mgmp"


def test_get_session_404(client):
    r = client.get("/sessions/9999")
    assert r.status_code == 404

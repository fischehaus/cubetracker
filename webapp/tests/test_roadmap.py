"""Smoke: Roadmap-Endpoint — Public-Sicht + Admin-Sicht-Flag."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_roadmap_public_anon(client: TestClient) -> None:
    r = client.get("/api/roadmap")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body["items"], list)
    assert body["is_admin"] is False


def test_roadmap_admin_flag(client: TestClient, make_user) -> None:
    _, headers = make_user(is_admin=True)
    r = client.get("/api/roadmap", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["is_admin"] is True

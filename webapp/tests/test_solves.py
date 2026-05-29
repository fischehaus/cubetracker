"""Smoke: Solves-Cluster — Create + List (authed) + Auth-Guard."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_and_list_solve(client: TestClient, make_user) -> None:
    _, headers = make_user()

    r = client.post(
        "/api/solves",
        json={"time_ms": 12340, "cube_type": "3x3"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["time_ms"] == 12340
    assert created["cube_type"] == "3x3"

    r2 = client.get("/api/solves", headers=headers)
    assert r2.status_code == 200, r2.text
    solves = r2.json()
    assert isinstance(solves, list)
    assert any(s["time_ms"] == 12340 for s in solves)


def test_solves_require_auth(client: TestClient) -> None:
    assert client.get("/api/solves").status_code == 401
    assert (
        client.post("/api/solves", json={"time_ms": 1000, "cube_type": "3x3"}).status_code
        == 401
    )


def test_solve_isolated_per_user(client: TestClient, make_user) -> None:
    # User A legt einen Solve an, User B sieht ihn NICHT (Cross-User-Filter).
    _, headers_a = make_user()
    _, headers_b = make_user()
    client.post(
        "/api/solves", json={"time_ms": 9999, "cube_type": "2x2"}, headers=headers_a
    )
    r_b = client.get("/api/solves", headers=headers_b)
    assert r_b.status_code == 200
    assert all(s["time_ms"] != 9999 for s in r_b.json())

"""Smoke: Auth-Cluster — Register -> Login -> Me + Negativ-Faelle.

Nutzt EINEN register+login-Roundtrip (unter dem 5/min-Rate-Limit). Andere
Tests minten Token direkt via make_user (kein Login-Call).
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_register_login_me_roundtrip(client: TestClient) -> None:
    email = "roundtrip@test.example"
    pw = "pw12345678"

    r = client.post("/api/auth/register", json={"email": email, "password": pw})
    assert r.status_code == 201, r.text

    r2 = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r2.status_code == 200, r2.text
    token = r2.json()["access_token"]
    assert token

    r3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200, r3.text
    assert r3.json()["email"] == email


def test_login_wrong_password_is_401(client: TestClient) -> None:
    email = "wrongpw@test.example"
    client.post("/api/auth/register", json={"email": email, "password": "pw12345678"})
    r = client.post("/api/auth/login", json={"email": email, "password": "totallywrong"})
    assert r.status_code == 401, r.text


def test_me_without_token_is_401(client: TestClient) -> None:
    r = client.get("/api/auth/me")
    assert r.status_code == 401, r.text


def test_register_duplicate_email_is_409(client: TestClient) -> None:
    email = "dupe@test.example"
    client.post("/api/auth/register", json={"email": email, "password": "pw12345678"})
    r = client.post("/api/auth/register", json={"email": email, "password": "pw12345678"})
    assert r.status_code == 409, r.text

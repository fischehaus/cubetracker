"""Smoke: Auth-Cluster — Register -> Login -> Me + Negativ-Faelle.

Nutzt EINEN register+login-Roundtrip (unter dem 5/min-Rate-Limit). Andere
Tests minten Token direkt via make_user (kein Login-Call).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from auth.config import REFRESH_COOKIE_NAME


def _refresh_set_cookie(response) -> str:
    """Liefert den rohen Set-Cookie-Header des Refresh-Cookies (oder '')."""
    for key, value in response.headers.multi_items():
        if key.lower() == "set-cookie" and value.startswith(
            f"{REFRESH_COOKIE_NAME}="
        ):
            return value
    return ""


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


# --- W.remember-me: Refresh-Cookie-Persistenz ------------------------------
# User via make_user (Direkt-Insert, KEIN /register-Call) anlegen, damit das
# REGISTER_LIMIT nicht durch die Cookie-Tests aufgebraucht wird. Login geht
# ueber den echten Endpoint (wir wollen den Set-Cookie-Header pruefen).


def test_login_remember_me_persistent_cookie(client: TestClient, make_user) -> None:
    """remember_me=True → Refresh-Cookie mit Max-Age (ueberlebt Browser-Neustart)."""
    user, _ = make_user(password="pw12345678")
    r = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "pw12345678", "remember_me": True},
    )
    assert r.status_code == 200, r.text
    cookie = _refresh_set_cookie(r)
    assert cookie, "Refresh-Cookie fehlt im Set-Cookie-Header"
    assert "max-age=" in cookie.lower()


def test_login_without_remember_me_session_cookie(
    client: TestClient, make_user
) -> None:
    """remember_me=False → Session-Cookie (kein Max-Age, kein Expires)."""
    user, _ = make_user(password="pw12345678")
    r = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "pw12345678", "remember_me": False},
    )
    assert r.status_code == 200, r.text
    cookie = _refresh_set_cookie(r)
    assert cookie, "Refresh-Cookie fehlt im Set-Cookie-Header"
    assert "max-age=" not in cookie.lower()
    assert "expires=" not in cookie.lower()

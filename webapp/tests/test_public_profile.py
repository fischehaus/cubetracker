"""Tests für die öffentliche Solving-Card (W.public-profile, 2026-06-06).

Deckt ab:
- Opt-in: Default aus → 404 (kein Existence-Leak).
- Unbekannter Slug → 404.
- Aktiviert → 200 mit Aggregaten (Single-PB pro Cube etc.).
- Privacy: kein Email-/PLZ-/user_id-Leak; Land ist bewusst auf der Card.
- Slug wird aus dem display_name generiert + bleibt nach Namens-Änderung stabil.
"""

from __future__ import annotations

from db.models import Solve


def _enable_public(client, headers) -> str:
    """Aktiviert das öffentliche Profil + liefert den generierten Slug."""
    r = client.patch(
        "/api/auth/me", json={"public_profile_enabled": True}, headers=headers
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["public_profile_enabled"] is True
    assert body["public_slug"]
    return body["public_slug"]


def test_disabled_profile_returns_404(client, make_user) -> None:
    _user, headers = make_user()
    client.patch(
        "/api/auth/me", json={"display_name": "Max Mustermann"}, headers=headers
    )
    # Default public_profile_enabled=False → nicht abrufbar.
    assert client.get("/api/public/profile/max-mustermann").status_code == 404


def test_unknown_slug_returns_404(client) -> None:
    assert client.get("/api/public/profile/does-not-exist").status_code == 404


def test_enabled_profile_returns_card_with_aggregates(
    client, make_user, db_session
) -> None:
    user, headers = make_user()
    client.patch("/api/auth/me", json={"display_name": "Speedy Sam"}, headers=headers)
    for ms in (15000, 12000, 18000, 11000):
        db_session.add(Solve(user_id=user.id, time_ms=ms, cube_type="3x3"))
    db_session.commit()

    slug = _enable_public(client, headers)
    assert slug == "speedy-sam"

    r = client.get(f"/api/public/profile/{slug}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["slug"] == "speedy-sam"
    assert data["display_name"] == "Speedy Sam"
    assert data["total_solves"] == 4
    cubes = {c["cube_type"]: c for c in data["cubes"]}
    assert "3x3" in cubes
    assert cubes["3x3"]["best_ms"] == 11000
    assert cubes["3x3"]["count"] == 4


def test_public_card_does_not_leak_private_fields(
    client, make_user, db_session
) -> None:
    user, headers = make_user()
    client.patch(
        "/api/auth/me",
        json={
            "display_name": "Priv Cuber",
            "postal_code": "12345",
            "country_iso2": "DE",
        },
        headers=headers,
    )
    db_session.add(Solve(user_id=user.id, time_ms=9000, cube_type="2x2"))
    db_session.commit()
    slug = _enable_public(client, headers)

    data = client.get(f"/api/public/profile/{slug}").json()
    # Land ist bewusst öffentlich; Email/PLZ/user_id NIEMALS.
    assert data["country_iso2"] == "DE"
    assert "email" not in data
    assert "postal_code" not in data
    assert "user_id" not in data


def test_slug_is_stable_after_name_change(client, make_user) -> None:
    _user, headers = make_user()
    client.patch("/api/auth/me", json={"display_name": "First Name"}, headers=headers)
    slug = _enable_public(client, headers)
    assert slug == "first-name"

    r = client.patch(
        "/api/auth/me", json={"display_name": "Totally Different"}, headers=headers
    )
    # Slug bleibt stabil → geteilte Links bleiben gültig.
    assert r.json()["public_slug"] == slug
    assert client.get(f"/api/public/profile/{slug}").status_code == 200


def test_inactive_user_profile_returns_404(client, make_user, db_session) -> None:
    user, headers = make_user()
    client.patch("/api/auth/me", json={"display_name": "Will Vanish"}, headers=headers)
    slug = _enable_public(client, headers)
    assert client.get(f"/api/public/profile/{slug}").status_code == 200
    # User deaktiviert → Card sofort 404 (gleicher generischer Fehler).
    user.is_active = False
    db_session.add(user)
    db_session.commit()
    assert client.get(f"/api/public/profile/{slug}").status_code == 404


def test_slug_fallback_for_no_display_name(client, make_user) -> None:
    # Kein display_name gesetzt → Basis-Slug „cuber".
    _user, headers = make_user()
    slug = _enable_public(client, headers)
    assert slug == "cuber"


def test_slug_transliterates_umlauts(client, make_user) -> None:
    _user, headers = make_user()
    client.patch("/api/auth/me", json={"display_name": "Über-Cuber"}, headers=headers)
    slug = _enable_public(client, headers)
    assert slug == "ueber-cuber"


# ---------------------------------------------------------------------------
# Friend-Profil-Endpoint (GET /api/friends/{user_id}/profile) — W.friend-profile
# Accepted Friend sieht die Card OHNE öffentliches Opt-in.
# ---------------------------------------------------------------------------


def _befriend(client, headers_a, headers_b, b_id: int) -> None:
    r = client.post(
        "/api/friends/request", json={"target_user_id": b_id}, headers=headers_a
    )
    assert r.status_code == 201, r.text
    fid = r.json()["id"]
    assert client.post(f"/api/friends/{fid}/accept", headers=headers_b).status_code == 200


def test_friend_can_view_profile_without_public_optin(
    client, make_user, db_session
) -> None:
    a, ha = make_user()
    b, hb = make_user()
    client.patch("/api/auth/me", json={"display_name": "Friend B"}, headers=hb)
    db_session.add(Solve(user_id=b.id, time_ms=8000, cube_type="3x3"))
    db_session.commit()
    # B aktiviert KEIN öffentliches Profil — der anonyme Pfad bliebe 404.
    _befriend(client, ha, hb, b.id)
    r = client.get(f"/api/friends/{b.id}/profile", headers=ha)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["display_name"] == "Friend B"
    assert data["total_solves"] == 1
    assert "email" not in data
    assert "postal_code" not in data


def test_friend_profile_works_reverse_direction(client, make_user, db_session) -> None:
    # B schickt die Anfrage, A akzeptiert → A liest B's Profil. Deckt den
    # target→requester-Arm der or_-Query ab (Gegenrichtung zum Test oben).
    a, ha = make_user()
    b, hb = make_user()
    client.patch("/api/auth/me", json={"display_name": "Reverse B"}, headers=hb)
    db_session.add(Solve(user_id=b.id, time_ms=9500, cube_type="3x3"))
    db_session.commit()
    _befriend(client, hb, ha, a.id)  # B -> A Anfrage, A akzeptiert
    r = client.get(f"/api/friends/{b.id}/profile", headers=ha)
    assert r.status_code == 200, r.text
    assert r.json()["display_name"] == "Reverse B"


def test_non_friend_cannot_view_profile(client, make_user) -> None:
    _a, ha = make_user()
    b, _hb = make_user()
    assert client.get(f"/api/friends/{b.id}/profile", headers=ha).status_code == 404


def test_pending_friendship_cannot_view_profile(client, make_user) -> None:
    _a, ha = make_user()
    b, _hb = make_user()
    r = client.post(
        "/api/friends/request", json={"target_user_id": b.id}, headers=ha
    )
    assert r.status_code == 201
    # Pending != accepted → kein Zugriff.
    assert client.get(f"/api/friends/{b.id}/profile", headers=ha).status_code == 404


def test_self_can_view_own_profile_via_friend_endpoint(
    client, make_user, db_session
) -> None:
    a, ha = make_user()
    client.patch("/api/auth/me", json={"display_name": "Me Myself"}, headers=ha)
    db_session.add(Solve(user_id=a.id, time_ms=7000, cube_type="2x2"))
    db_session.commit()
    r = client.get(f"/api/friends/{a.id}/profile", headers=ha)
    assert r.status_code == 200, r.text
    assert r.json()["display_name"] == "Me Myself"


def test_friend_profile_requires_auth(client, make_user) -> None:
    a, _ha = make_user()
    assert client.get(f"/api/friends/{a.id}/profile").status_code == 401

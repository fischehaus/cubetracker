"""Ownership-Invarianten: Solves sind strikt user-scoped (W.core-tests).

Die wichtigste Privacy-Invariante der Multi-User-App: User B darf Solves
von User A weder lesen noch ändern noch löschen — und zwar mit 404
(NICHT 403), damit fremde Solve-IDs nicht per Probing enumerierbar sind
(siehe webapp/api/solves.py:_get_solve_or_404).

Cross-Ref-Schutz: session_id/hardware_id fremder User werden bei Create
UND Update mit 400 abgelehnt (_verify_session_ownership /
_verify_hardware_ownership).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from db.models import Hardware, Session as DbSession


def _create_solve(
    client: TestClient, headers: dict[str, str], **overrides: object
) -> dict:
    """Hilfsfunktion: Solve via API anlegen, JSON-Body zurückgeben."""
    payload: dict[str, object] = {"time_ms": 12340, "cube_type": "3x3"}
    payload.update(overrides)
    r = client.post("/api/solves", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _make_session_for(db_session, user_id: int, name: str = "Main") -> DbSession:
    """Session direkt in der DB anlegen (kein API-Roundtrip nötig)."""
    session = DbSession(user_id=user_id, name=name)
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def _make_hardware_for(db_session, user_id: int, name: str = "GAN 356") -> Hardware:
    """Hardware direkt in der DB anlegen."""
    hw = Hardware(user_id=user_id, name=name, primary_cube_type="3x3")
    db_session.add(hw)
    db_session.commit()
    db_session.refresh(hw)
    return hw


# --- Fremde Solves: GET/PATCH/DELETE → 404 (nicht 403!) ---------------------


def test_foreign_solve_get_is_404(client: TestClient, make_user) -> None:
    _, headers_a = make_user()
    _, headers_b = make_user()
    solve = _create_solve(client, headers_a)

    # User B darf den Solve von User A nicht mal sehen → 404 (kein 403,
    # sonst wäre die Existenz fremder IDs per Probing ablesbar).
    r = client.get(f"/api/solves/{solve['id']}", headers=headers_b)
    assert r.status_code == 404, r.text

    # Gegenprobe: User A selbst bekommt ihn natürlich.
    r_own = client.get(f"/api/solves/{solve['id']}", headers=headers_a)
    assert r_own.status_code == 200, r_own.text
    assert r_own.json()["id"] == solve["id"]


def test_foreign_solve_patch_is_404_and_unchanged(
    client: TestClient, make_user
) -> None:
    _, headers_a = make_user()
    _, headers_b = make_user()
    solve = _create_solve(client, headers_a)

    r = client.patch(
        f"/api/solves/{solve['id']}",
        json={"notes": "hijacked", "dnf": True},
        headers=headers_b,
    )
    assert r.status_code == 404, r.text

    # Der Solve von User A ist unverändert geblieben.
    r_check = client.get(f"/api/solves/{solve['id']}", headers=headers_a)
    assert r_check.status_code == 200
    assert r_check.json()["notes"] is None
    assert r_check.json()["dnf"] is False


def test_foreign_solve_delete_is_404_and_survives(
    client: TestClient, make_user
) -> None:
    _, headers_a = make_user()
    _, headers_b = make_user()
    solve = _create_solve(client, headers_a)

    r = client.delete(f"/api/solves/{solve['id']}", headers=headers_b)
    assert r.status_code == 404, r.text

    # Solve existiert für User A weiterhin.
    r_check = client.get(f"/api/solves/{solve['id']}", headers=headers_a)
    assert r_check.status_code == 200, r_check.text


# --- Fremde Cross-Refs: session_id / hardware_id ----------------------------


def test_create_solve_with_foreign_session_is_400(
    client: TestClient, make_user, db_session
) -> None:
    user_a, _ = make_user()
    _, headers_b = make_user()
    session_a = _make_session_for(db_session, user_a.id)

    # User B versucht, seinen Solve in die Session von User A einzuhängen.
    r = client.post(
        "/api/solves",
        json={"time_ms": 9000, "cube_type": "3x3", "session_id": session_a.id},
        headers=headers_b,
    )
    assert r.status_code == 400, r.text


def test_create_solve_with_foreign_hardware_is_400(
    client: TestClient, make_user, db_session
) -> None:
    user_a, _ = make_user()
    _, headers_b = make_user()
    hw_a = _make_hardware_for(db_session, user_a.id)

    r = client.post(
        "/api/solves",
        json={"time_ms": 9000, "cube_type": "3x3", "hardware_id": hw_a.id},
        headers=headers_b,
    )
    assert r.status_code == 400, r.text


def test_patch_solve_to_foreign_session_or_hardware_is_400(
    client: TestClient, make_user, db_session
) -> None:
    user_a, _ = make_user()
    _, headers_b = make_user()
    session_a = _make_session_for(db_session, user_a.id)
    hw_a = _make_hardware_for(db_session, user_a.id)

    # User B patcht seinen EIGENEN Solve — aber mit fremden Cross-Refs.
    solve_b = _create_solve(client, headers_b)

    r_sess = client.patch(
        f"/api/solves/{solve_b['id']}",
        json={"session_id": session_a.id},
        headers=headers_b,
    )
    assert r_sess.status_code == 400, r_sess.text

    r_hw = client.patch(
        f"/api/solves/{solve_b['id']}",
        json={"hardware_id": hw_a.id},
        headers=headers_b,
    )
    assert r_hw.status_code == 400, r_hw.text

    # Solve hat danach weiterhin KEINE Cross-Refs.
    r_check = client.get(f"/api/solves/{solve_b['id']}", headers=headers_b)
    assert r_check.json()["session_id"] is None
    assert r_check.json()["hardware_id"] is None


def test_patch_solve_to_own_session_works(
    client: TestClient, make_user, db_session
) -> None:
    # Positivfall als Gegenprobe: EIGENE Session zuweisen ist erlaubt.
    user, headers = make_user()
    session = _make_session_for(db_session, user.id)
    solve = _create_solve(client, headers)

    r = client.patch(
        f"/api/solves/{solve['id']}",
        json={"session_id": session.id},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["session_id"] == session.id


# --- Eigene Solves: PATCH + DELETE funktionieren -----------------------------


def test_patch_own_solve_flags_and_notes(client: TestClient, make_user) -> None:
    _, headers = make_user()
    solve = _create_solve(client, headers, time_ms=10000)

    # +2-Flag setzen: time_ms bleibt roh, effective_time_ms = +2000.
    r_plus2 = client.patch(
        f"/api/solves/{solve['id']}",
        json={"plus_two": True, "notes": "lockup am Ende"},
        headers=headers,
    )
    assert r_plus2.status_code == 200, r_plus2.text
    body = r_plus2.json()
    assert body["plus_two"] is True
    assert body["time_ms"] == 10000
    assert body["effective_time_ms"] == 12000  # 10000 + 2000 Strafe
    assert body["notes"] == "lockup am Ende"

    # DNF-Flag setzen: effective_time_ms wird None.
    r_dnf = client.patch(
        f"/api/solves/{solve['id']}", json={"dnf": True}, headers=headers
    )
    assert r_dnf.status_code == 200, r_dnf.text
    assert r_dnf.json()["dnf"] is True
    assert r_dnf.json()["effective_time_ms"] is None

    # Flags wieder zurücknehmen (Toggle-Roundtrip wie im Frontend).
    r_clear = client.patch(
        f"/api/solves/{solve['id']}",
        json={"plus_two": False, "dnf": False},
        headers=headers,
    )
    assert r_clear.status_code == 200, r_clear.text
    assert r_clear.json()["effective_time_ms"] == 10000


def test_delete_own_solve_then_404(client: TestClient, make_user) -> None:
    _, headers = make_user()
    solve = _create_solve(client, headers)

    r = client.delete(f"/api/solves/{solve['id']}", headers=headers)
    assert r.status_code == 204, r.text

    # Danach ist der Solve weg — auch für den Owner 404.
    r_get = client.get(f"/api/solves/{solve['id']}", headers=headers)
    assert r_get.status_code == 404, r_get.text

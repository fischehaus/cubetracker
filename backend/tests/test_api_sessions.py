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


# ============================================================
# POST/PATCH/DELETE (Phase 5b-1)
# ============================================================


def test_create_session_minimal(client):
    r = client.post("/sessions", json={"name": "MeineSession"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "MeineSession"
    assert data["scramble_type"] is None
    assert data["notes"] is None
    assert data["cstimer_session_id"] is None
    assert "id" in data


def test_create_session_with_notes(client):
    r = client.post(
        "/sessions",
        json={"name": "OH-Training", "scramble_type": "333", "notes": "Sub-20-Push"},
    )
    assert r.status_code == 201
    assert r.json()["notes"] == "Sub-20-Push"


def test_patch_session_rename(client):
    s = client.post("/sessions", json={"name": "Alt"}).json()
    r = client.patch(f"/sessions/{s['id']}", json={"name": "Neu"})
    assert r.status_code == 200
    assert r.json()["name"] == "Neu"


def test_patch_session_notes(client):
    s = client.post("/sessions", json={"name": "X"}).json()
    r = client.patch(f"/sessions/{s['id']}", json={"notes": "spaeter ergaenzt"})
    assert r.json()["notes"] == "spaeter ergaenzt"


def test_delete_session_keeps_solves(client, db):
    """Loeschen setzt session_id auf NULL, Solves bleiben bestehen."""
    from db.models import Solve

    s = DbSession(name="ToDelete")
    db.add(s)
    db.commit()
    db.refresh(s)
    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=s.id))
    db.commit()

    client.delete(f"/sessions/{s.id}")
    solves = client.get("/solves").json()
    assert len(solves) == 1
    assert solves[0]["session_id"] is None


# ============================================================
# Suggest-Endpoint (Phase 5b-1)
# ============================================================


def test_suggest_empty_no_solves(client):
    r = client.get("/sessions/suggest?cube_type=3x3")
    data = r.json()
    assert data["session_id"] is None
    assert data["count"] == 0
    assert data["cube_type"] == "3x3"


def test_suggest_picks_session_with_most_solves(client, db):
    from db.models import Solve

    s1 = DbSession(name="A")
    s2 = DbSession(name="B")
    db.add_all([s1, s2])
    db.commit()
    db.refresh(s1)
    db.refresh(s2)

    # 2 Solves in s1, 5 in s2 (alle 3x3)
    for _ in range(2):
        db.add(Solve(time_ms=10000, cube_type="3x3", session_id=s1.id))
    for _ in range(5):
        db.add(Solve(time_ms=11000, cube_type="3x3", session_id=s2.id))
    db.commit()

    r = client.get("/sessions/suggest?cube_type=3x3")
    data = r.json()
    assert data["session_id"] == s2.id
    assert data["count"] == 5


def test_suggest_ignores_other_cube_types(client, db):
    from db.models import Solve

    s1 = DbSession(name="A")
    s2 = DbSession(name="B")
    db.add_all([s1, s2])
    db.commit()
    db.refresh(s1)
    db.refresh(s2)

    # s1 hat viele 4x4-Solves, s2 hat 2 3x3-Solves
    for _ in range(10):
        db.add(Solve(time_ms=60000, cube_type="4x4", session_id=s1.id))
    for _ in range(2):
        db.add(Solve(time_ms=10000, cube_type="3x3", session_id=s2.id))
    db.commit()

    r = client.get("/sessions/suggest?cube_type=3x3")
    assert r.json()["session_id"] == s2.id


def test_suggest_ignores_session_less_solves(client, db):
    """Solves ohne session_id sollen nicht zaehlen."""
    from db.models import Solve

    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=None))
    db.commit()

    r = client.get("/sessions/suggest?cube_type=3x3")
    assert r.json()["session_id"] is None


# ============================================================
# DELETE mit move_solves_to + MERGE (Phase 5c)
# ============================================================


def test_delete_with_move_solves_to(client, db):
    """Solves wandern zur Ziel-Session statt verwaisen zu lassen."""
    from db.models import Solve

    src = DbSession(name="Quelle")
    dst = DbSession(name="Ziel")
    db.add_all([src, dst])
    db.commit()
    db.refresh(src)
    db.refresh(dst)
    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=src.id))
    db.add(Solve(time_ms=11000, cube_type="3x3", session_id=src.id))
    db.commit()

    r = client.delete(f"/sessions/{src.id}?move_solves_to={dst.id}")
    assert r.status_code == 204
    # source weg
    assert client.get(f"/sessions/{src.id}").status_code == 404
    # solves jetzt bei target
    solves = client.get(f"/solves?session_id={dst.id}").json()
    assert len(solves) == 2


def test_delete_move_to_self_forbidden(client, db):
    s = DbSession(name="X")
    db.add(s)
    db.commit()
    db.refresh(s)
    r = client.delete(f"/sessions/{s.id}?move_solves_to={s.id}")
    assert r.status_code == 400


def test_delete_move_to_unknown_target_404(client, db):
    s = DbSession(name="X")
    db.add(s)
    db.commit()
    db.refresh(s)
    r = client.delete(f"/sessions/{s.id}?move_solves_to=9999")
    assert r.status_code == 404


def test_merge_basic(client, db):
    from db.models import Solve

    src = DbSession(name="Quelle")
    dst = DbSession(name="Ziel")
    db.add_all([src, dst])
    db.commit()
    db.refresh(src)
    db.refresh(dst)
    db.add(Solve(time_ms=10000, cube_type="3x3", session_id=src.id))
    db.add(Solve(time_ms=11000, cube_type="3x3", session_id=dst.id))
    db.commit()

    r = client.post(f"/sessions/{src.id}/merge?target_id={dst.id}")
    assert r.status_code == 200
    # source weg, target enthaelt jetzt 2 solves
    assert client.get(f"/sessions/{src.id}").status_code == 404
    solves = client.get(f"/solves?session_id={dst.id}").json()
    assert len(solves) == 2


def test_merge_appends_notes(client, db):
    src = DbSession(name="A", notes="alte notiz")
    dst = DbSession(name="B", notes="ziel notiz")
    db.add_all([src, dst])
    db.commit()
    db.refresh(src)
    db.refresh(dst)

    client.post(f"/sessions/{src.id}/merge?target_id={dst.id}")
    target = client.get(f"/sessions/{dst.id}").json()
    assert "ziel notiz" in target["notes"]
    assert "alte notiz" in target["notes"]
    assert "[merged from" in target["notes"]


def test_merge_target_without_notes(client, db):
    src = DbSession(name="A", notes="info")
    dst = DbSession(name="B")  # ohne notes
    db.add_all([src, dst])
    db.commit()
    db.refresh(src)
    db.refresh(dst)

    client.post(f"/sessions/{src.id}/merge?target_id={dst.id}")
    target = client.get(f"/sessions/{dst.id}").json()
    assert target["notes"] is not None
    assert "info" in target["notes"]


def test_merge_self_forbidden(client, db):
    s = DbSession(name="X")
    db.add(s)
    db.commit()
    db.refresh(s)
    r = client.post(f"/sessions/{s.id}/merge?target_id={s.id}")
    assert r.status_code == 400


def test_merge_unknown_source_404(client, db):
    s = DbSession(name="dst")
    db.add(s)
    db.commit()
    db.refresh(s)
    r = client.post(f"/sessions/9999/merge?target_id={s.id}")
    assert r.status_code == 404


def test_merge_unknown_target_404(client, db):
    s = DbSession(name="src")
    db.add(s)
    db.commit()
    db.refresh(s)
    r = client.post(f"/sessions/{s.id}/merge?target_id=9999")
    assert r.status_code == 404

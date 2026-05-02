"""API-Tests fuer csTimer-Import-Endpoint (F4)."""

from __future__ import annotations

import io
import json


def _sample_payload() -> dict:
    return {
        "session1": [
            [[0, 12000], "R U R'", "", 1771875979],
            [[2000, 13000], "F R", "", 1771876000],
        ],
        "properties": {"sessionData": '{"1":{"name":"3x3","opt":{"scrType":""},"rank":1}}'},
    }


def test_import_endpoint_success(client):
    payload = _sample_payload()
    file_data = json.dumps(payload).encode("utf-8")
    files = {"file": ("export.txt", io.BytesIO(file_data), "text/plain")}
    r = client.post("/import/cstimer", files=files)
    assert r.status_code == 200
    data = r.json()
    assert data["sessions_created"] == 1
    assert data["solves_created"] == 2
    assert data["filename"] == "export.txt"


def test_import_endpoint_invalid_json(client):
    files = {"file": ("bad.txt", io.BytesIO(b"not json"), "text/plain")}
    r = client.post("/import/cstimer", files=files)
    assert r.status_code == 400
    assert "JSON" in r.json()["detail"]


def test_import_endpoint_invalid_utf8(client):
    files = {"file": ("bad.txt", io.BytesIO(b"\xff\xfe\xfd"), "text/plain")}
    r = client.post("/import/cstimer", files=files)
    assert r.status_code == 400


def test_import_endpoint_root_must_be_object(client):
    files = {"file": ("bad.txt", io.BytesIO(b"[1,2,3]"), "text/plain")}
    r = client.post("/import/cstimer", files=files)
    assert r.status_code == 400
    assert "Object" in r.json()["detail"]


def test_import_endpoint_creates_solves_visible_via_solves_api(client):
    payload = _sample_payload()
    file_data = json.dumps(payload).encode("utf-8")
    files = {"file": ("export.txt", io.BytesIO(file_data), "text/plain")}
    client.post("/import/cstimer", files=files)

    # Solves-API zeigt die importierten Solves
    r = client.get("/solves")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["cube_type"] == "3x3"
    assert data[0]["session_id"] is not None

    # Sessions-API zeigt die importierte Session
    r2 = client.get("/sessions")
    assert r2.status_code == 200
    sessions = r2.json()
    assert len(sessions) == 1
    assert sessions[0]["name"] == "3x3"
    assert sessions[0]["cstimer_session_id"] == 1

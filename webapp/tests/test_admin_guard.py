"""Smoke: Admin-Permission-Boundary am Reorder-Endpoint (require_admin).

Sichert zu, dass ein authentifizierter Nicht-Admin den Admin-Endpoint NICHT
treffen kann (Defense-in-Depth zum Frontend-Gating).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

REORDER = "/api/admin/roadmap/reorder"
PAYLOAD = {"phase_id": "P1", "ordered_ids": [999999]}  # unbekannte ID -> wird übersprungen


def test_reorder_blocks_anon(client: TestClient) -> None:
    assert client.post(REORDER, json=PAYLOAD).status_code == 401


def test_reorder_blocks_non_admin(client: TestClient, make_user) -> None:
    # require_admin gibt fuer authentifizierte Nicht-Admins bewusst 404
    # ("Not found") zurueck statt 403 — versteckt die Existenz der Admin-
    # Endpoints (security-by-obscurity). Staerker als ein 403.
    _, headers = make_user(is_admin=False)
    r = client.post(REORDER, json=PAYLOAD, headers=headers)
    assert r.status_code == 404, r.text


def test_reorder_allows_admin(client: TestClient, make_user) -> None:
    _, headers = make_user(is_admin=True)
    r = client.post(REORDER, json=PAYLOAD, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["phase_id"] == "P1"

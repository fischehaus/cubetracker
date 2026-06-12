"""csTimer-Import über den echten Upload-Endpoint (W.core-tests).

Getestet wird POST /api/import/cstimer (webapp/api/import_cstimer.py) mit
der Import-Logik aus webapp/importers/cstimer.py — wie ein echter
Multipart-Upload.

Festgepinnte IST-Konventionen (am Importer-Code verifiziert):
- Penalty 2000 (+2): `time_ms` bleibt die ROH-Zeit, die Strafe wird NICHT
  in time_ms eingerechnet — nur `plus_two=True` als Flag. Die +2000 fließen
  erst in `effective_time_ms` (Solve-Property) bzw. `effective_ms`
  (stats/calc.SolvePoint) ein.
- Penalty -1: `dnf=True`, time_ms bleibt erhalten, effective_time_ms=None.
- Idempotenz: Sessions per (user_id, cstimer_session_id) upsert, Solves per
  (session_id, timestamp, time_ms)-Triple dedupliziert.

csTimer-Solve-Format: [[penalty, time_ms], scramble, comment, timestamp_unix]
"""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from auth.rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """Import-Endpoint hat 5/hour-Rate-Limit (per-IP, In-Memory-Store).

    Der Store überlebt Tests innerhalb eines pytest-Prozesses — ohne Reset
    würden die Tests dieser Datei sich gegenseitig ins 429 laufen.
    """
    limiter.reset()
    yield


def _upload(
    client: TestClient, headers: dict[str, str], payload: Any, **params: Any
):
    """csTimer-Payload als Multipart-Datei hochladen (wie der Browser)."""
    raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
    return client.post(
        "/api/import/cstimer",
        files={"file": ("cstimer_export.txt", raw, "text/plain")},
        headers=headers,
        params=params,
    )


def _cstimer_payload() -> dict[str, Any]:
    """Minimaler csTimer-Export: 2 Sessions, 4 Solves, alle Penalty-Codes.

    session1 (Name=Integer 1, kein scrType → 3x3-Default):
      - penalty 0    → sauber
      - penalty 2000 → +2
      - penalty -1   → DNF
    session2 (scrType 444wca → 4x4): 1 sauberer Solve.
    """
    return {
        "session1": [
            [[0, 12340], "R U R' U'", "", 1700000000],
            [[2000, 11000], "F R U R' U' F'", "", 1700000060],
            [[-1, 9990], "L D L' D'", "", 1700000120],
        ],
        "session2": [
            [[0, 45670], "Rw U2 x Rw U2", "", 1700000300],
        ],
        "properties": {
            "sessionData": json.dumps(
                {
                    # csTimer-Default: unbenannte Session heisst Integer
                    "1": {"name": 1, "opt": {}, "rank": 1},
                    "2": {"name": 2, "opt": {"scrType": "444wca"}, "rank": 2},
                }
            )
        },
    }


# --- Penalty-Mapping ---------------------------------------------------------


def test_penalty_mapping_clean_plus2_dnf(client: TestClient, make_user) -> None:
    _, headers = make_user()
    r = _upload(client, headers, _cstimer_payload())
    assert r.status_code == 200, r.text
    assert r.json()["solves_created"] == 4

    solves = client.get("/api/solves", headers=headers).json()
    by_time = {s["time_ms"]: s for s in solves}

    # Penalty 0 → sauber, keine Flags.
    clean = by_time[12340]
    assert clean["plus_two"] is False
    assert clean["dnf"] is False
    assert clean["effective_time_ms"] == 12340
    assert clean["scramble"] == "R U R' U'"

    # Penalty 2000 → plus_two=True. IST-Verhalten (Importer-Konvention):
    # time_ms bleibt die ROH-Zeit (11000), die +2000 werden NICHT in
    # time_ms eingerechnet, sondern erst in effective_time_ms (13000).
    plus2 = by_time[11000]
    assert plus2["plus_two"] is True
    assert plus2["dnf"] is False
    assert plus2["time_ms"] == 11000
    assert plus2["effective_time_ms"] == 13000

    # Penalty -1 → dnf=True, Roh-Zeit bleibt gespeichert, effektiv None.
    dnf = by_time[9990]
    assert dnf["dnf"] is True
    assert dnf["plus_two"] is False
    assert dnf["effective_time_ms"] is None


# --- scrType → cube_type ------------------------------------------------------


def test_cube_type_derivation(client: TestClient, make_user) -> None:
    _, headers = make_user()
    payload = _cstimer_payload()
    # Dritte Session: Name "OH" hat Vorrang vor scrType-Mapping (333wca→3x3).
    payload["session3"] = [[[0, 20000], "R U", "", 1700000500]]
    session_data = json.loads(payload["properties"]["sessionData"])
    session_data["3"] = {"name": "OH", "opt": {"scrType": "333wca"}, "rank": 3}
    payload["properties"]["sessionData"] = json.dumps(session_data)

    r = _upload(client, headers, payload)
    assert r.status_code == 200, r.text

    solves = client.get("/api/solves", headers=headers).json()
    by_time = {s["time_ms"]: s for s in solves}

    # session1: Name "1" (kein Cube-Name), scrType "" → 3x3-Default.
    assert by_time[12340]["cube_type"] == "3x3"
    # session2: scrType 444wca → 4x4.
    assert by_time[45670]["cube_type"] == "4x4"
    # session3: Session-NAME "OH" gewinnt gegen scrType 333wca.
    assert by_time[20000]["cube_type"] == "OH"


# --- Idempotenz ---------------------------------------------------------------


def test_reimport_is_idempotent(client: TestClient, make_user) -> None:
    _, headers = make_user()
    payload = _cstimer_payload()

    r1 = _upload(client, headers, payload)
    assert r1.status_code == 200, r1.text
    assert r1.json()["solves_created"] == 4
    assert r1.json()["sessions_created"] == 2

    count_after_first = len(client.get("/api/solves", headers=headers).json())
    assert count_after_first == 4

    # Denselben Export NOCHMAL hochladen → alles Duplikate, nichts Neues.
    r2 = _upload(client, headers, payload)
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["solves_created"] == 0
    assert body2["solves_skipped_duplicate"] == 4
    assert body2["sessions_created"] == 0

    count_after_second = len(client.get("/api/solves", headers=headers).json())
    assert count_after_second == count_after_first  # keine Duplikate in der DB


# --- Fehlerfälle: sauberer 4xx, kein 500 ---------------------------------------


def test_broken_or_wrong_format_is_4xx(client: TestClient, make_user) -> None:
    _, headers = make_user()

    # 1) Kaputtes JSON → 400 (kein 500).
    r_broken = _upload(client, headers, b"das ist {{{ kein json")
    assert r_broken.status_code == 400, r_broken.text

    # 2) Valides JSON, aber Root ist kein Object → 400.
    r_list = _upload(client, headers, [1, 2, 3])
    assert r_list.status_code == 400, r_list.text

    # 3) Object ohne 'session<N>'-Keys → 400 mit Hinweis.
    r_nosession = _upload(client, headers, {"foo": "bar"})
    assert r_nosession.status_code == 400, r_nosession.text

    # 4) Sieht aus wie ein Cubetracker-Backup → 400 mit Umleitungs-Hinweis.
    r_backup = _upload(
        client, headers, {"schema_version": 1, "solves": [], "exported_at": "x"}
    )
    assert r_backup.status_code == 400, r_backup.text
    assert "Backup" in r_backup.json()["detail"]

    # Nichts davon hat Solves angelegt.
    assert client.get("/api/solves", headers=headers).json() == []

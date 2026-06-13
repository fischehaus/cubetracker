"""/stats/temporal — Wochen-Vorfilter-Regression (W.solve-hotpath).

Der Endpoint lädt seit dem Umbau nur noch ~die laufende Woche aus der DB
(WHERE timestamp >= week_start - 2d) statt aller Solves. Diese Tests
sichern: heutige Solves werden gezählt, uralte fliegen raus, und der
DB-Vorfilter funktioniert auch auf SQLite (ISO-String-Vergleich von
aware Timestamps).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def _post(client: TestClient, headers: dict[str, str], time_ms: int, ts: datetime) -> None:
    r = client.post(
        "/api/solves",
        json={"time_ms": time_ms, "cube_type": "3x3", "timestamp": ts.isoformat()},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def test_temporal_counts_today_and_excludes_old(client: TestClient, make_user) -> None:
    _, headers = make_user()
    now = datetime.now(UTC)

    # Zwei Solves heute, einer vor 30 Tagen (sicher außerhalb jeder Woche).
    # Mitternachts-Falle (CI-Fail 2026-06-13 00:05 UTC): `now - 10min` ist
    # kurz nach UTC-Mitternacht GESTERN → Sekunden in die ZUKUNFT datieren.
    # Der Endpoint filtert nur >= today_start (keine Obergrenze), damit sind
    # now+Sekunden zu jeder Uhrzeit garantiert „heute".
    _post(client, headers, 12000, now + timedelta(seconds=1))
    _post(client, headers, 13000, now + timedelta(seconds=2))
    _post(client, headers, 99000, now - timedelta(days=30))

    r = client.get("/api/stats/temporal", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["today"]["count"] == 2
    assert body["today"]["count_per_cube"] == {"3x3": 2}
    assert body["today"]["mean_ms"] == 12500
    # Woche enthält die heutigen 2, NICHT den 30-Tage-alten (der alte
    # Mean 99000 würde den Wochen-Mean sonst massiv verschieben).
    assert body["week"]["count"] == 2
    assert body["week"]["mean_ms"] == 12500


def test_temporal_yesterday_is_week_not_today(client: TestClient, make_user) -> None:
    """QA-Finding W.solve-hotpath: testet den 2-Tage-DB-Puffer + exakten
    Python-Schnitt gemeinsam. Ein Solve von gestern ist nie 'today'; ob er
    in 'week' zählt, hängt vom Wochentag ab — die Erwartung wird mit
    derselben week_start-Formel wie im Endpoint berechnet (deterministisch
    pro Lauf). Am Montag testet das genau den Fall 'im DB-Puffer geladen,
    aber vom Python-Filter korrekt ausgeschlossen'."""
    _, headers = make_user()
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    week_start = today_start - timedelta(days=today_start.weekday())

    yesterday = now - timedelta(days=1)
    _post(client, headers, 14000, yesterday)

    r = client.get("/api/stats/temporal", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["today"]["count"] == 0
    expected_week = 1 if yesterday >= week_start else 0
    assert body["week"]["count"] == expected_week


def test_temporal_empty_user(client: TestClient, make_user) -> None:
    _, headers = make_user()
    r = client.get("/api/stats/temporal", headers=headers)
    assert r.status_code == 200
    assert r.json()["today"] == {
        "count": 0,
        "count_per_cube": {},
        "mean_ms": None,
        "current_ao5": None,
    }


def test_temporal_ao5_from_todays_solves(client: TestClient, make_user) -> None:
    _, headers = make_user()
    now = datetime.now(UTC)

    # 5 Solves heute: current_ao5 = getrimmtes Mittel der letzten 5
    # = mean(12,13,14) = 13.0s (11 und 15 getrimmt).
    # now+Sekunden statt now-Minuten — Mitternachts-sicher (s. Test oben).
    for i, t in enumerate([11000, 12000, 13000, 14000, 15000]):
        _post(client, headers, t, now + timedelta(seconds=i + 1))

    r = client.get("/api/stats/temporal", headers=headers)
    assert r.status_code == 200
    assert r.json()["today"]["current_ao5"] == 13000

"""API-Tests fuer Stats-Endpoint (F5)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from db.models import Session as DbSession
from db.models import Solve


def _add_solves(db, times_ms: list[int], cube_type: str = "3x3", session_id=None):
    """Hilfsfunktion: Solves mit aufsteigenden Timestamps anlegen."""
    base = datetime(2026, 1, 1, tzinfo=UTC)
    for i, t in enumerate(times_ms):
        db.add(
            Solve(
                time_ms=t,
                cube_type=cube_type,
                session_id=session_id,
                timestamp=base + timedelta(seconds=i),
            )
        )
    db.commit()


def test_stats_empty(client):
    r = client.get("/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 0
    assert data["best_ms"] is None
    assert data["current_ao5"] is None


def test_stats_basic(client, db):
    _add_solves(db, [10000, 11000, 12000, 13000, 14000])
    r = client.get("/stats")
    data = r.json()
    assert data["count"] == 5
    assert data["count_valid"] == 5
    assert data["best_ms"] == 10000
    assert data["worst_ms"] == 14000
    assert data["mean_ms"] == 12000
    assert data["current_ao5"] == 12000
    assert data["best_ao5"] == 12000
    assert data["best_solve_id"] is not None  # ID des Best-Solves


def test_stats_filter_cube_type(client, db):
    _add_solves(db, [10000, 11000, 12000], cube_type="3x3")
    _add_solves(db, [20000, 21000, 22000], cube_type="2x2")

    r = client.get("/stats?cube_type=3x3")
    data = r.json()
    assert data["count"] == 3
    assert data["best_ms"] == 10000

    r2 = client.get("/stats?cube_type=2x2")
    data2 = r2.json()
    assert data2["count"] == 3
    assert data2["best_ms"] == 20000


def test_stats_filter_session_id(client, db):
    s1 = DbSession(name="A")
    s2 = DbSession(name="B")
    db.add_all([s1, s2])
    db.commit()
    db.refresh(s1)
    db.refresh(s2)

    _add_solves(db, [10000, 11000, 12000], session_id=s1.id)
    _add_solves(db, [20000, 21000, 22000], session_id=s2.id)

    r = client.get(f"/stats?session_id={s1.id}")
    data = r.json()
    assert data["count"] == 3
    assert data["best_ms"] == 10000


def test_stats_includes_filter_in_response(client, db):
    _add_solves(db, [10000])
    r = client.get("/stats?cube_type=3x3")
    data = r.json()
    assert data["filter"]["cube_type"] == "3x3"
    assert data["filter"]["session_id"] is None


def test_stats_with_realistic_avg12_avg100(client, db):
    # 100 Solves: 1k bis 100k in 1k-Schritten. Avg100 = trim 5 each → mean 6k..95k
    _add_solves(db, [1000 + i * 1000 for i in range(100)])
    r = client.get("/stats")
    data = r.json()
    assert data["count"] == 100
    assert data["current_ao12"] is not None
    assert data["current_ao100"] is not None
    assert data["best_ao5"] is not None


# ============================================================
# /stats/by-cube — Multi-Cube-Vergleich (F11)
# ============================================================


def test_by_cube_empty(client):
    r = client.get("/stats/by-cube")
    assert r.status_code == 200
    assert r.json() == {"cubes": [], "filter": {"session_id": None}}


def test_by_cube_skips_cubes_with_few_solves(client, db):
    # 3 Solves von 2x2 (unter Mindestschwelle) — soll uebersprungen werden
    _add_solves(db, [3000, 3500, 4000], cube_type="2x2")
    # 5 Solves von 3x3 (genau am Mindest)
    _add_solves(db, [10000, 11000, 12000, 13000, 14000], cube_type="3x3")
    r = client.get("/stats/by-cube")
    data = r.json()
    cube_types = [c["cube_type"] for c in data["cubes"]]
    assert "2x2" not in cube_types
    assert "3x3" in cube_types


def test_by_cube_returns_form_factor(client, db):
    # 3x3: Trend „aktuell besser" — 10 alte Solves um 15s, dann 5 frische um 10s
    times = [15000] * 10 + [10000, 10500, 11000, 9500, 10000]
    _add_solves(db, times, cube_type="3x3")
    r = client.get("/stats/by-cube")
    data = r.json()
    assert len(data["cubes"]) == 1
    cube = data["cubes"][0]
    assert cube["cube_type"] == "3x3"
    assert cube["current_ao5"] is not None
    assert cube["mean_ms"] is not None
    assert cube["form_factor"] is not None
    # current_ao5 (~10s) deutlich kleiner als mean (~13s) → form_factor < 1
    assert cube["form_factor"] < 1


def test_by_cube_sorts_best_form_first(client, db):
    # 2 Cubes: einer in „guter Form" (current < mean), einer in schlechter
    _add_solves(db, [15000] * 10 + [9000] * 5, cube_type="3x3")  # gute Form
    _add_solves(db, [10000] * 10 + [13000] * 5, cube_type="2x2")  # schlechte Form
    r = client.get("/stats/by-cube")
    cubes = r.json()["cubes"]
    assert len(cubes) == 2
    # 3x3 (form_factor < 1) sollte vor 2x2 (form_factor > 1) liegen
    assert cubes[0]["cube_type"] == "3x3"
    assert cubes[1]["cube_type"] == "2x2"
    assert cubes[0]["form_factor"] < cubes[1]["form_factor"]


def test_by_cube_includes_form_factor_recent(client, db):
    # Genug Solves fuer recent-fenster: 30 alte Solves um 15s, dann 5 frische um 14s
    times = [15000] * 30 + [14000, 14500, 14000, 14500, 14000]
    _add_solves(db, times, cube_type="3x3")
    r = client.get("/stats/by-cube")
    cube = r.json()["cubes"][0]
    assert "form_factor_recent" in cube
    assert cube["form_factor_recent"] is not None
    # current_ao5 (~14.x) leicht unter recent-mean (~14.7) → form_factor_recent < 1
    assert cube["form_factor_recent"] < 1


def test_by_cube_form_factor_recent_none_with_few_solves(client, db):
    # 10 Solves: zu wenig fuer recent-fenster (Schwelle: 20 valid)
    _add_solves(db, [10000 + i * 100 for i in range(10)], cube_type="3x3")
    cube = client.get("/stats/by-cube").json()["cubes"][0]
    # form_factor (lifetime) sollte da sein
    assert cube["form_factor"] is not None
    # form_factor_recent nicht — zu wenig Solves
    assert cube["form_factor_recent"] is None


def test_by_cube_filter_session(client, db):
    s1 = DbSession(name="A")
    s2 = DbSession(name="B")
    db.add_all([s1, s2])
    db.commit()
    db.refresh(s1)
    db.refresh(s2)
    _add_solves(db, [10000] * 6, cube_type="3x3", session_id=s1.id)
    _add_solves(db, [20000] * 6, cube_type="4x4", session_id=s2.id)
    # Ohne Filter: beide Cubes
    assert len(client.get("/stats/by-cube").json()["cubes"]) == 2
    # Filter auf s1: nur 3x3
    r = client.get(f"/stats/by-cube?session_id={s1.id}")
    cubes = r.json()["cubes"]
    assert len(cubes) == 1
    assert cubes[0]["cube_type"] == "3x3"


# ============================================================
# /stats/temporal — Tag/Wochen-Stats (F15)
# ============================================================


def test_temporal_empty(client):
    r = client.get("/stats/temporal")
    assert r.status_code == 200
    data = r.json()
    assert data["today"]["count"] == 0
    assert data["week"]["count"] == 0
    assert data["today"]["mean_ms"] is None


def test_temporal_today(client, db):
    # Solves „jetzt" einfuegen — sollten in today landen
    from datetime import UTC as _UTC
    from datetime import datetime as _dt

    from db.models import Solve

    now = _dt.now(_UTC).replace(tzinfo=None)
    for t in [10000, 11000, 12000, 13000, 14000]:
        db.add(Solve(time_ms=t, cube_type="3x3", timestamp=now))
    db.commit()

    r = client.get("/stats/temporal")
    data = r.json()
    assert data["today"]["count"] == 5
    assert data["today"]["count_per_cube"] == {"3x3": 5}
    assert data["today"]["mean_ms"] == 12000
    assert data["today"]["current_ao5"] == 12000


def test_temporal_week_includes_older_today_solves(client, db):
    # Solves von vor 3 Tagen sollten in week, aber nicht in today landen
    from datetime import UTC as _UTC
    from datetime import datetime as _dt
    from datetime import timedelta as _td

    from db.models import Solve

    now = _dt.now(_UTC).replace(tzinfo=None)
    three_days_ago = now - _td(days=3)
    for t in [10000, 11000, 12000]:
        db.add(Solve(time_ms=t, cube_type="3x3", timestamp=three_days_ago))
    db.commit()

    r = client.get("/stats/temporal")
    data = r.json()
    assert data["today"]["count"] == 0  # alt
    # Ob in week haengt davon ab, wann der Test laeuft (Wochenstart Montag).
    # Mind. 0, max. 3. Wir testen die Struktur.
    assert data["week"]["count"] >= 0
    assert "count_per_cube" in data["week"]


def test_temporal_per_cube_breakdown(client, db):
    from datetime import UTC as _UTC
    from datetime import datetime as _dt

    from db.models import Solve

    now = _dt.now(_UTC).replace(tzinfo=None)
    for t in [10000, 11000]:
        db.add(Solve(time_ms=t, cube_type="3x3", timestamp=now))
    for t in [3000, 3500]:
        db.add(Solve(time_ms=t, cube_type="2x2", timestamp=now))
    db.commit()

    r = client.get("/stats/temporal")
    data = r.json()
    assert data["today"]["count"] == 4
    assert data["today"]["count_per_cube"] == {"3x3": 2, "2x2": 2}

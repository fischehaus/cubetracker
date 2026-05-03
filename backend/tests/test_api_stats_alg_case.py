"""API-Tests fuer /stats/by-alg-case (Phase 8b — Algorithm-Trainer)."""

from __future__ import annotations

from db.models import Solve


def _add(db, time_ms: int, alg_case: str | None, cube_type: str = "3x3"):
    db.add(Solve(time_ms=time_ms, cube_type=cube_type, alg_case=alg_case))


def test_by_alg_case_empty(client):
    """Frische DB → leere cases-Liste."""
    r = client.get("/stats/by-alg-case?subset=PLL")
    assert r.status_code == 200
    data = r.json()
    assert data["filter"]["subset"] == "PLL"
    assert data["cases"] == []


def test_by_alg_case_filters_to_subset(client, db):
    """Nur Solves mit passendem prefix landen drin; OLL-Solves bei
    PLL-Subset werden ignoriert."""
    _add(db, 12000, "PLL-Tperm")
    _add(db, 13000, "PLL-Tperm")
    _add(db, 9000, "OLL-21")
    _add(db, 11000, None)  # untagged → ignoriert
    db.commit()

    data = client.get("/stats/by-alg-case?subset=PLL").json()
    case_ids = [c["alg_case"] for c in data["cases"]]
    assert "PLL-Tperm" in case_ids
    assert "OLL-21" not in case_ids
    assert len(case_ids) == 1


def test_by_alg_case_groups_per_case(client, db):
    """Mehrere Cases werden separat gruppiert."""
    _add(db, 12000, "PLL-Tperm")
    _add(db, 13000, "PLL-Tperm")
    _add(db, 9000, "PLL-Y")
    db.commit()

    data = client.get("/stats/by-alg-case?subset=PLL").json()
    by_case = {c["alg_case"]: c for c in data["cases"]}
    assert by_case["PLL-Tperm"]["count"] == 2
    assert by_case["PLL-Y"]["count"] == 1
    assert by_case["PLL-Tperm"]["best_ms"] == 12000
    assert by_case["PLL-Y"]["best_ms"] == 9000


def test_by_alg_case_includes_dnf_in_count_but_not_in_best(client, db):
    _add(db, 0, "PLL-Tperm")  # DNF wird unten gesetzt
    db.commit()
    last = db.query(Solve).order_by(Solve.id.desc()).first()
    last.dnf = True
    db.commit()
    _add(db, 12000, "PLL-Tperm")
    db.commit()

    data = client.get("/stats/by-alg-case?subset=PLL").json()
    tperm = next(c for c in data["cases"] if c["alg_case"] == "PLL-Tperm")
    assert tperm["count"] == 2
    assert tperm["count_valid"] == 1
    assert tperm["best_ms"] == 12000

"""Unit-Tests fuer csTimer-Import-Logik (F4)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from db.models import Session as DbSession
from db.models import Solve
from importers.cstimer import (
    derive_cube_type,
    import_cstimer_json,
    parse_session_data,
    parse_solve_entry,
)

# ============================================================
# derive_cube_type
# ============================================================


def test_derive_cube_type_session_name_match():
    assert derive_cube_type("3x3", "") == "3x3"
    assert derive_cube_type("OH", "") == "OH"
    assert derive_cube_type("Megaminx", "mgmp") == "Megaminx"  # name match wins


def test_derive_cube_type_scrtype_fallback():
    # Custom Session-Name, aber bekannter scrType
    assert derive_cube_type("L4E ", "pyrso") == "Pyraminx"
    assert derive_cube_type("mini Guilford", "sqrs") == "Square-1"


def test_derive_cube_type_default_3x3_for_empty_scrtype():
    # csTimer-Default: scrType "" → 3x3 (auch bei custom Session-Namen wie
    # "3x3 test", "alles basically", "L4E"). User-Trainings-Sessions sind
    # alle 3x3, nur unter verschiedenen Namen — fuer Stats wird auf
    # cube_type aggregiert, fuer Session-Filter auf session_id.
    assert derive_cube_type("3x3 test", "") == "3x3"
    assert derive_cube_type("alles basically", "") == "3x3"


def test_derive_cube_type_pure_fallback():
    # Weder Name noch scrType bekannt → Name as-is
    assert derive_cube_type("Custom Stuff", "unknownXX") == "Custom Stuff"


# ============================================================
# parse_solve_entry
# ============================================================


def test_parse_solve_entry_basic():
    entry = [[0, 13370], "R' B2 R'", "", 1771875979]
    parsed = parse_solve_entry(entry)
    assert parsed is not None
    assert parsed["time_ms"] == 13370
    assert parsed["scramble"] == "R' B2 R'"
    assert parsed["notes"] is None  # leerer comment → None
    assert parsed["plus_two"] is False
    assert parsed["dnf"] is False


def test_parse_solve_entry_plus_two():
    entry = [[2000, 13370], "R'", "comment", 1771875979]
    parsed = parse_solve_entry(entry)
    assert parsed["plus_two"] is True
    assert parsed["notes"] == "comment"


def test_parse_solve_entry_dnf():
    entry = [[-1, 13370], "R'", "", 1771875979]
    parsed = parse_solve_entry(entry)
    assert parsed["dnf"] is True


def test_parse_solve_entry_timestamp_conversion():
    # 1771875979 = 2026-02-23 ungefaehr (Unix → UTC)
    entry = [[0, 12000], "R", "", 1771875979]
    parsed = parse_solve_entry(entry)
    assert parsed["timestamp"].year == 2026
    assert parsed["timestamp"].tzinfo is not None


def test_parse_solve_entry_missing_timestamp_uses_now():
    entry = [[0, 12000], "R", ""]  # nur 3 Felder
    parsed = parse_solve_entry(entry)
    assert parsed["timestamp"] is not None


def test_parse_solve_entry_invalid_returns_none():
    assert parse_solve_entry([]) is None
    assert parse_solve_entry([["bad", "data"]]) is None


# ============================================================
# parse_session_data
# ============================================================


def test_parse_session_data_basic():
    properties = {
        "sessionData": '{"1":{"name":"3x3","opt":{"scrType":""},"rank":1},"2":{"name":"4x4","opt":{"scrType":"444wca"},"rank":2}}'
    }
    result = parse_session_data(properties)
    assert 1 in result
    assert result[1]["name"] == "3x3"
    assert result[1]["scramble_type"] == ""
    assert result[2]["scramble_type"] == "444wca"


def test_parse_session_data_missing_returns_empty():
    assert parse_session_data({}) == {}


def test_parse_session_data_invalid_json_returns_empty():
    assert parse_session_data({"sessionData": "not json"}) == {}


# ============================================================
# import_cstimer_json — Integration
# ============================================================


@pytest.fixture
def in_memory_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from db.database import Base

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)  # noqa: N806
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
        engine.dispose()


def _sample_payload() -> dict:
    return {
        "session1": [
            [[0, 13370], "R' B2", "", 1771875979],
            [[0, 11000], "B L2", "", 1771877013],
            [[2000, 14000], "U R", "lucky", 1771877100],
        ],
        "session2": [
            [[0, 5230], "R U R'", "", 1771878000],
            [[-1, 6000], "R", "lost track", 1771878100],
        ],
        "properties": {
            "sessionData": '{"1":{"name":"3x3","opt":{"scrType":""},"rank":1},"2":{"name":"2x2","opt":{"scrType":"222so"},"rank":2}}'
        },
    }


def test_import_creates_sessions_and_solves(in_memory_db):
    payload = _sample_payload()
    result = import_cstimer_json(payload, in_memory_db)

    assert result.sessions_created == 2
    assert result.solves_created == 5
    assert result.solves_skipped_duplicate == 0
    assert result.solves_skipped_invalid == 0

    sessions = in_memory_db.query(DbSession).all()
    assert len(sessions) == 2
    s_3x3 = next(s for s in sessions if s.name == "3x3")
    assert s_3x3.cstimer_session_id == 1

    solves = in_memory_db.query(Solve).all()
    assert len(solves) == 5
    assert all(s.session_id is not None for s in solves)

    plus_two_solve = next(s for s in solves if s.plus_two)
    assert plus_two_solve.time_ms == 14000

    dnf_solve = next(s for s in solves if s.dnf)
    assert dnf_solve.cube_type == "2x2"


def test_import_is_idempotent(in_memory_db):
    payload = _sample_payload()
    result1 = import_cstimer_json(payload, in_memory_db)
    assert result1.solves_created == 5

    # Re-Import: alles soll als duplicate erkannt werden
    result2 = import_cstimer_json(payload, in_memory_db)
    assert result2.sessions_created == 0
    assert result2.solves_created == 0
    assert result2.solves_skipped_duplicate == 5


def test_import_session_name_change_updates(in_memory_db):
    payload = _sample_payload()
    import_cstimer_json(payload, in_memory_db)

    # Session-Name geaendert beim Re-Export
    payload["properties"][
        "sessionData"
    ] = '{"1":{"name":"3x3 (renamed)","opt":{"scrType":""},"rank":1},"2":{"name":"2x2","opt":{"scrType":"222so"},"rank":2}}'

    result = import_cstimer_json(payload, in_memory_db)
    assert result.sessions_updated == 1

    s_3x3 = in_memory_db.query(DbSession).filter_by(cstimer_session_id=1).one()
    assert s_3x3.name == "3x3 (renamed)"


def test_import_skips_empty_sessions(in_memory_db):
    payload = {
        "session1": [],
        "session2": [[[0, 12000], "R", "", 1771878000]],
        "properties": {
            "sessionData": '{"1":{"name":"empty","opt":{"scrType":""},"rank":1},"2":{"name":"2x2","opt":{"scrType":"222so"},"rank":2}}'
        },
    }
    result = import_cstimer_json(payload, in_memory_db)
    assert result.sessions_created == 1  # Nur Session 2
    assert result.solves_created == 1


def test_import_cube_type_mapping_via_scrtype(in_memory_db):
    payload = {
        "session1": [[[0, 12000], "R", "", 1771878000]],
        "properties": {
            "sessionData": '{"1":{"name":"L4E training","opt":{"scrType":"pyrso"},"rank":1}}'
        },
    }
    result = import_cstimer_json(payload, in_memory_db)
    assert result.solves_created == 1

    solve = in_memory_db.query(Solve).first()
    assert solve.cube_type == "Pyraminx"  # via scrType-Mapping


def test_import_timestamps_preserved(in_memory_db):
    payload = _sample_payload()
    import_cstimer_json(payload, in_memory_db)

    solves = in_memory_db.query(Solve).filter(Solve.time_ms == 13370).all()
    assert len(solves) == 1
    # SQLite gibt naive datetime zurueck — wir vergleichen die UTC-Werte
    expected_utc = datetime.fromtimestamp(1771875979, tz=UTC).replace(tzinfo=None)
    assert solves[0].timestamp == expected_utc

"""Unit-Tests fuer cubetracker-Models und Schemas (F1).

Nutzt eine in-memory SQLite-DB (via DATABASE_URL-Env-Override),
damit Tests die Produktiv-DB nicht beruehren.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

import pytest

# Vor dem Import von db.* die URL auf in-memory umstellen
os.environ["CUBETRACKER_DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from db.database import Base  # noqa: E402
from db.models import Session as DbSession  # noqa: E402
from db.models import Solve  # noqa: E402
from db.schemas import SolveCreate, SolveRead  # noqa: E402


@pytest.fixture
def db():
    """Frische in-memory DB pro Test."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)  # noqa: N806 — Konvention bei sessionmaker
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_create_solve_basic(db):
    """Ein simpler Solve laesst sich anlegen + lesen."""
    solve = Solve(time_ms=12340, cube_type="3x3")
    db.add(solve)
    db.commit()
    db.refresh(solve)

    assert solve.id is not None
    assert solve.time_ms == 12340
    assert solve.cube_type == "3x3"
    assert solve.plus_two is False
    assert solve.dnf is False
    assert solve.session_id is None
    assert solve.timestamp is not None


def test_effective_time_ms_normal(db):
    """Ohne Strafen: effective_time = time_ms."""
    solve = Solve(time_ms=12340, cube_type="3x3")
    assert solve.effective_time_ms == 12340


def test_effective_time_ms_plus_two(db):
    """Mit +2: effective_time = time_ms + 2000."""
    solve = Solve(time_ms=12340, cube_type="3x3", plus_two=True)
    assert solve.effective_time_ms == 14340


def test_effective_time_ms_dnf(db):
    """DNF: effective_time = None."""
    solve = Solve(time_ms=12340, cube_type="3x3", dnf=True)
    assert solve.effective_time_ms is None


def test_session_with_solves(db):
    """Session + zwei Solves, Relationship funktioniert."""
    session = DbSession(name="3x3 Training", scramble_type="", cstimer_session_id=1)
    s1 = Solve(time_ms=12340, cube_type="3x3", session=session)
    s2 = Solve(time_ms=13500, cube_type="3x3", session=session)
    db.add(session)
    db.add_all([s1, s2])
    db.commit()
    db.refresh(session)

    assert len(session.solves) == 2
    assert s1.session_id == session.id
    assert s2.session_id == session.id


def test_session_unique_cstimer_id(db):
    """Zwei Sessions mit gleicher cstimer_session_id schlagen fehl."""
    s1 = DbSession(name="A", cstimer_session_id=42)
    s2 = DbSession(name="B", cstimer_session_id=42)
    db.add_all([s1, s2])
    with pytest.raises(Exception):  # noqa: B017 — IntegrityError
        db.commit()


def test_solve_create_schema_validation():
    """Pydantic-Schema validiert positive Zeiten + cube_type-Pflicht."""
    valid = SolveCreate(time_ms=12340, cube_type="3x3")
    assert valid.time_ms == 12340

    with pytest.raises(ValueError):  # negative time_ms
        SolveCreate(time_ms=-1, cube_type="3x3")


def test_solve_read_from_orm(db):
    """SolveRead.model_validate(solve) funktioniert (from_attributes)."""
    solve = Solve(
        time_ms=12340,
        cube_type="3x3",
        timestamp=datetime(2026, 5, 2, 12, 0, tzinfo=UTC),
    )
    db.add(solve)
    db.commit()
    db.refresh(solve)

    read = SolveRead.model_validate(solve)
    assert read.id == solve.id
    assert read.cube_type == "3x3"
    assert read.effective_time_ms == 12340

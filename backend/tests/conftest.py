"""Gemeinsame pytest-Fixtures fuer cubetracker-Tests.

Stellt eine in-memory SQLite-DB bereit + ueberschreibt FastAPI's
get_db-Dependency, sodass Tests gegen eine isolierte DB laufen.
"""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as OrmSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db.database import Base, get_db
from main import app


@pytest.fixture
def db() -> Generator[OrmSession, None, None]:
    """Frische in-memory DB pro Test, mit allen Tabellen."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # gleiche Connection ueber Session-Wechsel
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(  # noqa: N806 — Konvention bei sessionmaker
        bind=engine, autoflush=False, autocommit=False
    )
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db: OrmSession) -> Generator[TestClient, None, None]:
    """TestClient mit ueberschriebener DB-Dependency."""

    def _override_get_db() -> Generator[OrmSession, None, None]:
        try:
            yield db
        finally:
            pass  # session.close() macht die db-Fixture selbst

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

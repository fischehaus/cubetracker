"""Postgres-Engine + Session-Factory für cubetracker-webapp (Phase W).

Unterschied zum Desktop-Backend:
- Postgres statt SQLite (multi-user concurrent writes)
- DB-URL kommt aus DATABASE_URL-Env (Render setzt das automatisch)
- Lokales Test-Setup: kann SQLite via DATABASE_URL=sqlite:///./test.db
"""

from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Default-DB für lokale Entwicklung: SQLite-File neben dem Code.
# In Production: Render setzt DATABASE_URL auf Postgres.
DEFAULT_LOCAL_DB = Path(__file__).resolve().parent.parent / "local-dev.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_LOCAL_DB}")

# Render liefert Postgres-URLs als "postgres://..." (alt), SQLAlchemy 2.0
# erwartet "postgresql://" — ggf. patchen.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Gemeinsame Base-Klasse für alle ORM-Models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI-Dependency für DB-Sessions.

    Liefert eine Session, schliesst sie nach Request-Ende automatisch.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

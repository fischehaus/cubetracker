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


def normalize_database_url(url: str) -> str:
    """Postgres-URL auf den installierten Treiber psycopg2 festnageln.

    - "postgres://" (Render-Altformat) → SQLAlchemy kennt nur "postgresql".
    - Hotfix 2026-09-25: SQLAlchemy 2.1 nimmt für "postgresql://" psycopg (v3)
      statt psycopg2 → Backend-Crash beim Start ("No module named 'psycopg'").
      Installiert ist nur psycopg2-binary, daher Treiber explizit setzen.
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = normalize_database_url(DATABASE_URL)

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

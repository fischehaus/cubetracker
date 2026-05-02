"""SQLAlchemy-Engine, Session-Factory und Base-Klasse fuer cubetracker.

SQLite-Datei liegt unter backend/data/solves.db. In Tests wird via
DATABASE_URL-Env-Var auf eine andere DB umgeschaltet (z.B. in-memory).
"""

import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "solves.db"
DATABASE_URL = os.getenv("CUBETRACKER_DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# SQLite-spezifische Connect-Args (FK-Support + Single-Thread-Check disablen)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Gemeinsame Base-Klasse fuer alle ORM-Models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI-Dependency fuer DB-Sessions.

    Liefert eine Session, schliesst sie nach Request-Ende automatisch.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

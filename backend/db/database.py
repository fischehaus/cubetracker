"""SQLAlchemy-Engine, Session-Factory und Base-Klasse fuer cubetracker.

DB-Pfad-Aufloesung (Phase 9 Distribution-Support):
1. `CUBETRACKER_DATABASE_URL` — voller URL, hoechste Prioritaet
   (z.B. fuer Tests: `sqlite:///:memory:`)
2. `CUBETRACKER_DB_PATH` — File-Pfad, wird zu sqlite:/// gewrapped
3. `CUBETRACKER_PROD=1` (PyInstaller-Launcher setzt das) → Default
   `%LOCALAPPDATA%\\cubetracker\\solves.db` (Windows) bzw.
   `~/.local/share/cubetracker/solves.db` (Unix)
4. Fallback (Dev): `backend/data/solves.db`

Damit laufen Dev und ausgerollte App auf demselben Rechner OHNE Konflikt
(separate DB-Dateien). User-Festlegung 2026-05-03.
"""

import os
import sys
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def _resolve_default_db_path() -> Path:
    """Berechnet den Default-DB-Pfad nach den 4 Aufloesungs-Regeln."""
    # Stufe 2: explizit gesetzter File-Pfad
    explicit_path = os.getenv("CUBETRACKER_DB_PATH")
    if explicit_path:
        return Path(explicit_path)

    # Stufe 3: Production-Mode (Installer-Launcher setzt das)
    is_prod = os.getenv("CUBETRACKER_PROD") == "1" or getattr(sys, "frozen", False)
    if is_prod:
        if sys.platform == "win32":
            base = Path(os.getenv("LOCALAPPDATA", os.path.expanduser("~"))) / "cubetracker"
        else:
            base = Path(os.path.expanduser("~/.local/share/cubetracker"))
        base.mkdir(parents=True, exist_ok=True)
        return base / "solves.db"

    # Stufe 4: Dev-Default
    dev_path = Path(__file__).resolve().parent.parent / "data" / "solves.db"
    dev_path.parent.mkdir(parents=True, exist_ok=True)
    return dev_path


DEFAULT_DB_PATH = _resolve_default_db_path()
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

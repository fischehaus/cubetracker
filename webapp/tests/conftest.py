"""Pytest-Fixtures für die Backend-Smoke-Tests (W.backend-test-suite, 2026-05-29).

Test-DB: SQLite-Temp-File. WICHTIG: DATABASE_URL muss VOR dem App-Import
gesetzt werden, weil `db.database` die Engine beim Modul-Import aus der Env
baut. Schema wird pro Test frisch erzeugt (create_all/drop_all) für Isolation.

Email-Versand ist ohne RESEND_API_KEY ein No-op (siehe emailing/service.py:
_send → "no_api_key"), daher keine Netzwerk-Calls / Flakiness in Tests.
"""

from __future__ import annotations

import os
import pathlib
import tempfile

# --- Env VOR allen App-Imports setzen ---------------------------------------
os.environ.setdefault("JWT_SECRET", "t" * 40)
os.environ.pop("RESEND_API_KEY", None)  # Email-Versand -> No-op
os.environ.setdefault("CUBETRACKER_ALLOW_LOCAL_DEV", "1")
_TEST_DB = pathlib.Path(tempfile.gettempdir()) / "cubetracker_pytest.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from auth.jwt import create_token  # noqa: E402
from auth.password import hash_password  # noqa: E402
from db.database import Base, SessionLocal, engine  # noqa: E402
from db.models import User  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_schema():
    """Frisches Schema pro Test — Isolation zwischen Tests."""
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client() -> TestClient:
    # Ohne `with`-Block -> der Lifespan (Postgres-only ALTER-Migrationen +
    # Seed-Bootstrap) wird NICHT getriggert. Das Schema kommt aus
    # _fresh_schema, alles andere ist für Smoke-Tests nicht nötig.
    return TestClient(app)


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user(db_session):
    """Factory: legt einen User direkt in der DB an, liefert (user, headers).

    Der Access-Token wird direkt geminted (kein /login-Call → umgeht das
    5/min-Rate-Limit). Email ist eindeutig pro Aufruf.
    """
    counter = {"n": 0}

    def _make(
        *, is_admin: bool = False, is_tester: bool = False, password: str = "pw12345678"
    ) -> tuple[User, dict[str, str]]:
        counter["n"] += 1
        user = User(
            email=f"user{counter['n']}@test.example",
            hashed_password=hash_password(password),
            email_verified=True,
            is_admin=is_admin,
            is_tester=is_tester,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        token = create_token(user.id, "access", token_version=user.token_version)
        return user, {"Authorization": f"Bearer {token}"}

    return _make

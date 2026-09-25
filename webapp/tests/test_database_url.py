"""DB-URL-Normalisierung (Hotfix 2026-09-25: SQLAlchemy 2.1 → psycopg v3)."""

from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from db.database import normalize_database_url


@pytest.mark.parametrize(
    "raw",
    ["postgres://u:p@h:5432/db", "postgresql://u:p@h:5432/db"],
)
def test_postgres_urls_pin_psycopg2(raw: str) -> None:
    url = normalize_database_url(raw)
    assert url == "postgresql+psycopg2://u:p@h:5432/db"
    assert make_url(url).get_dialect().driver == "psycopg2"


@pytest.mark.parametrize(
    "raw",
    [
        "postgresql+psycopg2://u:p@h/db",
        "postgresql+asyncpg://u:p@h/db",
        "postgresql+psycopg://u:p@h/db",
        "sqlite:///x.db",
        "sqlite://",
    ],
)
def test_other_urls_unchanged(raw: str) -> None:
    assert normalize_database_url(raw) == raw


def test_query_params_survive() -> None:
    assert (
        normalize_database_url("postgres://u:p@h/db?sslmode=require")
        == "postgresql+psycopg2://u:p@h/db?sslmode=require"
    )

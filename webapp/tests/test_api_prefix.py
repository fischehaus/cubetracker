"""Test fuer den globalen /api-Prefix (W.api-prefix, Hetzner-Migration).

Sichert zu, dass alle API-Routen unter /api liegen (nicht mehr auf Root) —
Voraussetzung fuer das Eine-Domain-Setup (cubetracker.de/ = Frontend,
cubetracker.de/api/* = Backend).

Basis: das OpenAPI-Schema (`app.openapi()["paths"]`) statt `app.routes`.
Grund (W.stackmat-CI-Fix 2026-06-19): FastAPI 0.137 legt mit
`include_router` keine flachen APIRoute-Objekte mehr in `app.routes`, sondern
einen `_IncludedRouter`-Wrapper ohne `.path` — der fruehere flache Scan sah
die Sub-Routen dann nicht mehr (Laufzeit-Routing blieb korrekt, nur die
Test-Annahme war zu FastAPI-intern). Das OpenAPI-`paths`-Dict ist der stabile,
oeffentliche Vertrag und versions-robust.
"""

from __future__ import annotations

from main import app

# Dokumentierte Pfade laut OpenAPI-Schema (alle in-schema Routen).
API_PATHS = set(app.openapi().get("paths", {}).keys())


def test_api_routes_under_prefix() -> None:
    # Stichproben aus verschiedenen Routern — alle unter /api.
    assert any(p.startswith("/api/stats") for p in API_PATHS)
    assert any(p.startswith("/api/solves") for p in API_PATHS)
    assert any(p.startswith("/api/auth") for p in API_PATHS)


def test_health_is_api_health() -> None:
    assert "/api/health" in API_PATHS


def test_no_root_level_api_routes() -> None:
    # Frueher lagen /stats, /solves, /auth, /sessions auf Root — jetzt NICHT mehr.
    assert not any(
        p.startswith(("/stats", "/solves", "/auth", "/sessions"))
        for p in API_PATHS
    )


def test_changelog_single_api_prefix() -> None:
    # Regression (W.api-prefix): changelog-Router hatte selbst prefix="/api",
    # main.py wrappt nochmal /api -> Route lag faelschlich auf /api/api/changelog.
    assert "/api/changelog" in API_PATHS
    assert "/api/api/changelog" not in API_PATHS

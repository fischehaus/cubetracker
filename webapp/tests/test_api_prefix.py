"""Test fuer den globalen /api-Prefix (W.api-prefix, Hetzner-Migration).

Sichert zu, dass alle API-Routen unter /api liegen (nicht mehr auf Root) —
Voraussetzung fuer das Eine-Domain-Setup (cubetracker.de/ = Frontend,
cubetracker.de/api/* = Backend).
"""

from __future__ import annotations

from main import app

ROUTE_PATHS = {getattr(r, "path", "") for r in app.routes}


def test_api_routes_under_prefix() -> None:
    # Stichproben aus verschiedenen Routern — alle unter /api.
    assert any(p.startswith("/api/stats") for p in ROUTE_PATHS)
    assert any(p.startswith("/api/solves") for p in ROUTE_PATHS)
    assert any(p.startswith("/api/auth") for p in ROUTE_PATHS)


def test_health_is_api_health() -> None:
    assert "/api/health" in ROUTE_PATHS


def test_no_root_level_api_routes() -> None:
    # Frueher lagen /stats, /solves, /auth, /sessions auf Root — jetzt NICHT mehr.
    assert not any(
        p.startswith(("/stats", "/solves", "/auth", "/sessions"))
        for p in ROUTE_PATHS
    )

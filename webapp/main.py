"""cubetracker-webapp — Multi-User-Variante (Phase W).

Entry-Point fuer uvicorn. In Production via Render.com gestartet.

Aktuell minimal: nur Auth + Health. Solve/Session/etc-Endpoints
kommen in Sub-Phasen W.3+.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api import achievements as achievements_api
from api import auth as auth_api
from api import backup as backup_api
from api import challenges as challenges_api
from api import export_cstimer as export_api
from api import hardware as hardware_api
from api import import_cstimer as import_api
from api import sessions as sessions_api
from api import solves as solves_api
from api import stats as stats_api
from auth.config import IS_PROD, require_strong_secret
from auth.rate_limit import limiter

__version__ = "2.0.0a0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup-Hook: secret-check + DB-Schema-Init.

    Aktuell nutzen wir `Base.metadata.create_all(engine)` als pragmatischen
    Initial-Setup — legt fehlende Tabellen an, laesst existierende in Ruhe.

    Sobald das erste Schema-Aenderung auf bestehende Live-Daten kommt,
    wird auf Alembic umgestellt (Phase W.7+):
        from alembic import command
        from alembic.config import Config
        command.upgrade(Config("alembic.ini"), "head")
    """
    require_strong_secret()
    if IS_PROD:
        try:
            # Local-import damit Tests die DB nicht beim main-Import anfassen
            from db.database import Base, engine
            import db.models  # noqa: F401  - Models registrieren bei Base
            from sqlalchemy import text

            Base.metadata.create_all(engine)

            # Mini-Migration W.8: create_all fuegt nur fehlende Tabellen an,
            # aber keine neuen Spalten zu existierenden Tabellen. Postgres
            # unterstuetzt `ADD COLUMN IF NOT EXISTS` -> idempotent + safe.
            # SQLite (lokal) braucht das nicht weil DB beim Dev-Reset eh neu.
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64)",
            ]
            with engine.begin() as conn:
                for sql in migrations:
                    try:
                        conn.execute(text(sql))
                    except Exception as me:  # noqa: BLE001
                        print(f"WARN: migration failed ({sql[:60]}...): {me}")
        except Exception as e:  # noqa: BLE001
            print(f"WARN: DB schema-init failed: {e}")
    yield


app = FastAPI(
    title="cubetracker-webapp",
    version=__version__,
    description="Multi-User-Speedcubing-Tracking — Web-Variante",
    lifespan=lifespan,
)

# Rate-Limiter (slowapi) — Brute-Force-Schutz fuer /login + /register.
# Limiter selbst kommt aus auth.rate_limit, hier nur die App-Verdrahtung.
app.state.limiter = limiter
# Default-Handler liefert 429 + Retry-After-Header.
from slowapi import _rate_limit_exceeded_handler  # noqa: E402

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS-Setup
# - Prod: WEBAPP_FRONTEND_ORIGIN comma-separated, z.B.
#   "https://cubetracker-frontend.onrender.com,https://cubetracker.iiiiii.org"
# - Dev: localhost:5173 + 127.0.0.1:5173 (Vite-Default)
# allow_credentials=True ist Pflicht damit der HttpOnly-Refresh-Cookie
# ueberhaupt mit cross-origin Requests gesendet wird.
if IS_PROD:
    raw = os.getenv("WEBAPP_FRONTEND_ORIGIN", "")
    allowed_origins = [o.strip() for o in raw.split(",") if o.strip()]
else:
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # W.4: damit Frontend die X-Achievement-/Challenge-/PB-Header lesen kann.
    # CORS blockt sonst Custom-Headers selbst bei korrektem allow_origin.
    expose_headers=[
        "X-Achievements-Unlocked",
        "X-Challenges-Completed",
        "X-PB-Achieved",
    ],
)

# Router
app.include_router(auth_api.router)
app.include_router(solves_api.router)
app.include_router(sessions_api.router)
app.include_router(hardware_api.router)
app.include_router(stats_api.router)
app.include_router(achievements_api.router)
app.include_router(challenges_api.router)
app.include_router(backup_api.router)
app.include_router(import_api.router)
app.include_router(export_api.router)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    """Health + Version + Mode."""
    return {
        "app": "cubetracker-webapp",
        "version": __version__,
        "status": "ok",
        "mode": "prod" if IS_PROD else "dev",
    }

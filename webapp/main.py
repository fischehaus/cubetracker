"""cubetracker-webapp — Multi-User-Variante (Phase W).

Entry-Point fuer uvicorn. In Production via Render.com gestartet.

Aktuell minimal: nur Auth + Health. Solve/Session/etc-Endpoints
kommen in Sub-Phasen W.3+.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth as auth_api
from auth.config import IS_PROD, require_strong_secret

__version__ = "2.0.0a0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup-Hook: secret-check + alembic-upgrade."""
    require_strong_secret()
    if IS_PROD:
        try:
            from pathlib import Path

            from alembic import command
            from alembic.config import Config

            alembic_cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
            command.upgrade(alembic_cfg, "head")
        except Exception as e:  # noqa: BLE001
            print(f"WARN: alembic upgrade failed: {e}")
    yield


app = FastAPI(
    title="cubetracker-webapp",
    version=__version__,
    description="Multi-User-Speedcubing-Tracking — Web-Variante",
    lifespan=lifespan,
)

# CORS: Production = nur eigene Subdomain (per Env), Dev = alles
import os  # noqa: E402

allowed_origins = (
    [os.getenv("WEBAPP_FRONTEND_ORIGIN", "")]
    if IS_PROD
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
app.include_router(auth_api.router)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    """Health + Version + Mode."""
    return {
        "app": "cubetracker-webapp",
        "version": __version__,
        "status": "ok",
        "mode": "prod" if IS_PROD else "dev",
    }

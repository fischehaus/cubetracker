"""cubetracker — FastAPI-Backend.

Entry-Point fuer den uvicorn-Server. Startet die FastAPI-App und
registriert die API-Router.

Phase 9 (Distribution-Support):
- Mode-Detection (dev vs prod) via CUBETRACKER_PROD oder sys.frozen.
- StaticFiles-Mount fuer das gebundle Frontend (production-Modus serviert
  /assets/* + index.html aus dem mit-gebundleten dist-Ordner).
- Health-Endpoint liefert Mode mit, damit Frontend-Badge unterscheidet.
"""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import (
    achievements,
    backup,
    challenges,
    export_cstimer,
    hardware,
    import_cstimer,
    sessions,
    solves,
    stats,
)

# Zentrale Version — wird beim setzen eines neuen tags hier gebumpt.
# Wird sowohl von FastAPI(version=) als auch vom /-health-endpoint genutzt,
# damit der Frontend-Badge den korrekten Tag spiegelt.
__version__ = "1.0.0"


# ============================================================
# Mode-Detection
# ============================================================
# Phase 9: ausgerollte App (PyInstaller-Bundle) setzt CUBETRACKER_PROD=1
# oder sys.frozen=True. Dev-Mode = nichts davon.
IS_PROD = os.getenv("CUBETRACKER_PROD") == "1" or getattr(sys, "frozen", False)


def _find_dist_dir() -> Path | None:
    """Sucht den frontend/dist-Ordner. Im PyInstaller-Bundle liegt er
    via spec-File neben der EXE. Im Dev-Mode unter ../frontend/dist.
    """
    # PyInstaller: sys._MEIPASS ist tmp-extract-Pfad
    if getattr(sys, "frozen", False):
        bundle_dir = Path(getattr(sys, "_MEIPASS", "."))
        candidate = bundle_dir / "frontend_dist"
        if candidate.exists():
            return candidate
    # Dev/source-Mode
    candidate = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    if candidate.exists():
        return candidate
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup-Hook: in Production-Mode bei leerer DB Alembic-Schema
    initialisieren. Dev-Mode macht das via `alembic upgrade head`-CLI.
    """
    if IS_PROD:
        try:
            from alembic import command
            from alembic.config import Config

            alembic_cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
            command.upgrade(alembic_cfg, "head")
        except Exception as e:  # noqa: BLE001
            # Migration-Fehler beim ersten Start: loggen, App startet trotzdem
            print(f"WARN: alembic upgrade failed: {e}")
    yield


app = FastAPI(
    title="cubetracker",
    version=__version__,
    description="Speedcubing-Solve-Tracking-API",
    lifespan=lifespan,
)

# CORS — Dev: localhost:5173 (vite-dev), Prod: nicht noetig weil same-origin.
# Wir lassen beide drin, Browser ignoriert CORS bei same-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8765", "http://127.0.0.1:8765"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router registrieren
app.include_router(solves.router)  # F2
app.include_router(sessions.router)  # F2
app.include_router(import_cstimer.router)  # F4
app.include_router(stats.router)  # F5
app.include_router(hardware.router)  # F16 (Phase 5)
app.include_router(backup.router)  # Phase L+ (B.1 + B.2) + 9 (Restore)
app.include_router(export_cstimer.router)  # Phase L+ d (csTimer-Export)
app.include_router(achievements.router)  # Phase 7a
app.include_router(challenges.router)  # Phase 7b


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    """Health-Check + Mode + Version. Frontend-Badge liest das.

    Endpoint absichtlich unter /api/, damit es nicht mit dem
    StaticFiles-Mount kollidiert (der sonst alles unter / serviert).
    """
    return {
        "app": "cubetracker",
        "version": __version__,
        "status": "ok",
        "mode": "prod" if IS_PROD else "dev",
    }


# ============================================================
# Frontend-Mount (Phase 9) — production serviert Frontend mit
# ============================================================
# Bei Dev: kein dist/, Vite serviert das Frontend separat auf :5173.
# Bei Prod (PyInstaller): dist/ ist im bundle, wir servieren same-origin.
#
# Wenn dist vorhanden: mount auf "/" (SPA-fallback via html=True).
# Wenn nicht: legacy-Health-Endpoint auf "/" damit der ng-Frontend-
# Health-Check noch funktioniert (Backwards-compat).
_dist = _find_dist_dir()
if _dist is not None:
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
else:

    @app.get("/")
    def root_legacy() -> dict[str, str | bool]:
        """Legacy Health-Endpoint — nur wenn kein Frontend-Mount aktiv ist."""
        return health()

"""cubetracker — FastAPI-Backend.

Entry-Point fuer den uvicorn-Server. Startet die FastAPI-App und
registriert die API-Router.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    achievements,
    backup,
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
__version__ = "0.9.0"

app = FastAPI(
    title="cubetracker",
    version=__version__,
    description="Speedcubing-Solve-Tracking-API",
)

# CORS fuer Vite-Dev-Server (Frontend laeuft auf :5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
app.include_router(backup.router)  # Phase L+ (B.1 + B.2)
app.include_router(export_cstimer.router)  # Phase L+ d (csTimer-Export)
app.include_router(achievements.router)  # Phase 7a


@app.get("/")
def root() -> dict[str, str]:
    """Health-Check."""
    return {"app": "cubetracker", "version": __version__, "status": "ok"}

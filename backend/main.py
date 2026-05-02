"""cubetracker — FastAPI-Backend.

Entry-Point fuer den uvicorn-Server. Startet die FastAPI-App und
registriert die API-Router.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import sessions, solves

app = FastAPI(
    title="cubetracker",
    version="0.1.0",
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

# Router registrieren (F2)
app.include_router(solves.router)
app.include_router(sessions.router)


@app.get("/")
def root() -> dict[str, str]:
    """Health-Check."""
    return {"app": "cubetracker", "version": "0.1.0", "status": "ok"}


# Naechste Router-Registrationen:
# - F4: api.import_cstimer
# - F5: api.stats

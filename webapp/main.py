"""cubetracker-webapp — Multi-User-Variante (Phase W).

Entry-Point für uvicorn. In Production via Render.com gestartet.

Aktuell minimal: nur Auth + Health. Solve/Session/etc-Endpoints
kommen in Sub-Phasen W.3+.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api import achievements as achievements_api
from api import admin as admin_api
from api import auth as auth_api
from api import backup as backup_api
from api import challenges as challenges_api
from api import changelog as changelog_api
from api import export_cstimer as export_api
from api import feedback as feedback_api
from api import friends as friends_api
from api import hardware as hardware_api
from api import import_cstimer as import_api
from api import leaderboard as leaderboard_api
from api import news as news_api
from api import public_profile as public_profile_api
from api import roadmap as roadmap_api
from api import sessions as sessions_api
from api import solves as solves_api
from api import stats as stats_api
from api import wca as wca_api
from auth.config import IS_PROD, require_strong_secret
from auth.rate_limit import limiter

# Version-String wird automatisch aus PATCH_NOTES[0].version abgeleitet —
# Single-Source-of-Truth ist `changelog/data.py`. Bei jeder Änderung
# einen neuen Eintrag dort einfuegen, hier passiert nichts manuell.
from changelog.data import current_version

__version__ = current_version()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup-Hook: secret-check + DB-Schema-Init.

    Aktuell nutzen wir `Base.metadata.create_all(engine)` als pragmatischen
    Initial-Setup — legt fehlende Tabellen an, lässt existierende in Ruhe.

    Sobald das erste Schema-Änderung auf bestehende Live-Daten kommt,
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
            # unterstützt `ADD COLUMN IF NOT EXISTS` -> idempotent + safe.
            # SQLite (lokal) braucht das nicht weil DB beim Dev-Reset eh neu.
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64)",
                # Phase W.9: is_discoverable Opt-In + friendships-Tabelle.
                # create_all() oben legt friendships-Tabelle an, hier nur die
                # neue Spalte auf existierende users-Tabelle.
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN NOT NULL DEFAULT FALSE",
                # Phase W.future-tournaments: Postleitzahl-Feld für
                # späteres "Turniere in der Nähe"-Feature.
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(16)",
                # Phase W.country-feld (2026-05-16): explizites Land im Profil
                # (ISO-3166-1-alpha-2). Vorher haben wir das aus der PLZ
                # abgeleitet — funktioniert nur für DACH. Jetzt explizit.
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS country_iso2 VARCHAR(2)",
                # QA-Fix H1: cross-direction Race-Schutz auf friendships.
                # Functional unique index garantiert dass es NUR EINE Row pro
                # User-Paar gibt, egal welche Richtung (A->B oder B->A).
                # Postgres-spezifisch (LEAST/GREATEST). Auf SQLite (Dev) fällt
                # das durch try/except — Dev-Tests laufen eh nicht concurrent.
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_friendship_pair_normalized "
                "ON friendships (LEAST(requester_id, target_id), GREATEST(requester_id, target_id))",
                # Phase W.admin-toggle (2026-05-17): is_admin als echte
                # DB-Spalte (vorher computed property aus ADMIN_EMAILS-Env-Var).
                # Erlaubt UI-Toggle von Admin-Status. Default FALSE; existing
                # Admins werden im Bootstrap-Step unten auf TRUE gesetzt.
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE",
                # Phase W.wca-profile-light (2026-05-28): offizielle WCA-ID
                # des Users (Format „2024SMIT01"). Optional, kein unique
                # constraint (selten Doppel-Claims möglich, Validierung
                # client+server-seitig).
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS wca_id VARCHAR(10)",
                "CREATE INDEX IF NOT EXISTS ix_users_wca_id ON users (wca_id)",
                # Phase W.tester-role-db (2026-05-28): zusätzliche Rolle
                # „Tester" für Live-Tests + Roadmap-Pflege ohne Admin-
                # Vollzugriff. Default FALSE, Promotion via Admin-UI.
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN NOT NULL DEFAULT FALSE",
                # feedback_messages-Tabelle: create_all() oben legt sie
                # bereits an, hier defensive Idempotenz-Checks für die Indexe.
                "CREATE INDEX IF NOT EXISTS ix_feedback_status_created ON feedback_messages (status, created_at)",
                "CREATE INDEX IF NOT EXISTS ix_feedback_user_created ON feedback_messages (user_id, created_at)",
                # Phase W.roadmap-db (2026-05-28): persistente Roadmap-Items.
                # Schema kommt aus db.models.RoadmapItem (create_all() oben
                # hat sie schon angelegt — diese Statements sind defensive
                # Idempotenz-Checks falls eine alte DB-Version existiert).
                # Indexe sind im Modell deklariert, hier auch nur defensive.
                "CREATE INDEX IF NOT EXISTS ix_roadmap_items_phase_id ON roadmap_items (phase_id)",
                "CREATE INDEX IF NOT EXISTS ix_roadmap_phase_order ON roadmap_items (phase_id, sort_order)",
                # Phase W.feedback-roadmap-pipeline (2026-05-31): Provenienz-
                # Link von einem Roadmap-Item zum Ursprungs-Feedback. Nullable;
                # die FK-Constraint lebt nur auf frischen DBs (create_all aus
                # dem Modell) — hier auf Bestands-Postgres nur die Spalte.
                "ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS source_feedback_id INTEGER",
                # Phase W.public-profile (2026-06-06): Opt-In öffentliche
                # Solving-Card. Zwei Spalten + partieller Unique-Index auf den
                # Slug (mehrere NULLs erlaubt, Slugs eindeutig wo gesetzt).
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_slug VARCHAR(64)",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_public_slug ON users (public_slug) WHERE public_slug IS NOT NULL",
            ]
            with engine.begin() as conn:
                for sql in migrations:
                    try:
                        conn.execute(text(sql))
                    except Exception as me:  # noqa: BLE001
                        print(f"WARN: migration failed ({sql[:60]}...): {me}")

            # Phase W.admin-toggle (2026-05-17): Bootstrap-Step.
            # User, deren Email in der ADMIN_EMAILS-Env-Var steht, bekommen
            # is_admin=TRUE. Idempotent: setzt nur fehlende, überschreibt
            # bereits-promoteed/demoteed User NICHT.
            # ADMIN_EMAILS bleibt als "Initial-Admin-Liste-beim-Bootstrap",
            # Quelle-of-Truth ab jetzt ist die DB-Spalte.
            try:
                import os as _os
                admin_emails_raw = _os.getenv("ADMIN_EMAILS", "")
                admin_emails = {
                    e.strip().lower() for e in admin_emails_raw.split(",") if e.strip()
                }
                if admin_emails:
                    with engine.begin() as conn:
                        for email in admin_emails:
                            conn.execute(
                                text(
                                    "UPDATE users SET is_admin = TRUE "
                                    "WHERE LOWER(email) = :email AND is_admin = FALSE"
                                ),
                                {"email": email},
                            )
                    print(
                        f"INFO: admin bootstrap -> {len(admin_emails)} email(s) "
                        "promoted (if not already admin)"
                    )
            except Exception as ab_e:  # noqa: BLE001
                print(f"WARN: admin bootstrap failed: {ab_e}")

            # W.hardware-auto-seed (2026-05-14): Backfill für User die
            # vor diesem Deploy registriert wurden + noch keine Hardware
            # angelegt haben. Idempotent — User mit existierender Hardware
            # (egal ob 1 oder 30 Einträge) bleiben unangetastet.
            try:
                from seeds.hardware import backfill_users_without_hardware
                from db.database import SessionLocal

                with SessionLocal() as bf_db:
                    users_seeded, rows_created = backfill_users_without_hardware(bf_db)
                    if users_seeded > 0:
                        print(
                            f"INFO: hardware backfill -> {users_seeded} User, "
                            f"{rows_created} Rows angelegt"
                        )
            except Exception as bf_e:  # noqa: BLE001
                print(f"WARN: hardware backfill failed: {bf_e}")

            # W.demo-probe-meppel-seed (2026-05-28): einmaliger Bootstrap
            # der EN-Klick-Through-Demo-Probe-Live-Tests vor dem Meppel-
            # Turnier. Idempotent via related_phase-Marker — beim zweiten
            # Container-Start wird nichts mehr angelegt.
            try:
                from seeds.live_tests import bootstrap_demo_probe_tests
                from db.database import SessionLocal

                with SessionLocal() as lt_db:
                    created = bootstrap_demo_probe_tests(lt_db)
                    if created > 0:
                        print(
                            f"INFO: demo-probe live-tests bootstrap -> "
                            f"{created} Tests angelegt"
                        )
            except Exception as lt_e:  # noqa: BLE001
                print(f"WARN: demo-probe live-tests bootstrap failed: {lt_e}")

            # W.roadmap-db (2026-05-28): einmaliger Bootstrap der Roadmap-
            # Items aus seeds/roadmap.py. Idempotent — wenn schon Items
            # in roadmap_items existieren, wird nichts angelegt. Ab dann
            # pflegt der Admin via /admin/roadmap-Endpoints + Admin-UI.
            try:
                from seeds.roadmap import (
                    bootstrap_roadmap,
                    bootstrap_ux_polish_items,
                    reorder_roadmap_once,
                )
                from db.database import SessionLocal

                with SessionLocal() as rm_db:
                    created = bootstrap_roadmap(rm_db)
                    if created > 0:
                        print(
                            f"INFO: roadmap bootstrap -> {created} Items angelegt"
                        )
                    # W.ux-demo-polish (2026-05-28): additive Migration —
                    # 5 UX-Audit-Findings als P1-Items nachreichen. Pro
                    # Item title_de-Match, also kann in voller DB laufen.
                    polish_created = bootstrap_ux_polish_items(rm_db)
                    if polish_created > 0:
                        print(
                            f"INFO: ux-polish items migration -> "
                            f"{polish_created} Items angelegt"
                        )
                    # W.roadmap-wsjf-reorder (2026-05-29): einmaliges
                    # WSJF-Reorder der Live-DB. Selbst-deaktivierend via
                    # Sentinel (Backend-Test-Suite in P6?). Laeuft genau
                    # einmal pro DB, danach skip.
                    reordered = reorder_roadmap_once(rm_db)
                    if reordered > 0:
                        print(
                            f"INFO: roadmap WSJF-reorder -> "
                            f"{reordered} Items neu sortiert"
                        )
            except Exception as rm_e:  # noqa: BLE001
                print(f"WARN: roadmap bootstrap failed: {rm_e}")
        except Exception as e:  # noqa: BLE001
            print(f"WARN: DB schema-init failed: {e}")
    yield


app = FastAPI(
    title="cubetracker-webapp",
    version=__version__,
    description="Multi-User-Speedcubing-Tracking — Web-Variante",
    lifespan=lifespan,
)

# Rate-Limiter (slowapi) — Brute-Force-Schutz für /login + /register.
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
# überhaupt mit cross-origin Requests gesendet wird.
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

# Router — alle unter gemeinsamem /api-Prefix (W.api-prefix, Hetzner-Migration).
# Ermoeglicht das Eine-Domain-Setup: cubetracker.de/ = Frontend,
# cubetracker.de/api/* = Backend. Frueher lagen die Routen auf Root
# (/auth, /solves, ...). /api/health (unten) bleibt unveraendert.
api_router = APIRouter(prefix="/api")
api_router.include_router(auth_api.router)
api_router.include_router(solves_api.router)
api_router.include_router(sessions_api.router)
api_router.include_router(hardware_api.router)
api_router.include_router(stats_api.router)
api_router.include_router(achievements_api.router)
api_router.include_router(challenges_api.router)
api_router.include_router(backup_api.router)
api_router.include_router(import_api.router)
api_router.include_router(export_api.router)
api_router.include_router(admin_api.router)
api_router.include_router(friends_api.router)
api_router.include_router(leaderboard_api.router)
api_router.include_router(changelog_api.router)
api_router.include_router(wca_api.router)
api_router.include_router(news_api.router)
api_router.include_router(feedback_api.router)
api_router.include_router(roadmap_api.router)
api_router.include_router(public_profile_api.router)
app.include_router(api_router)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    """Health + Version + Mode."""
    return {
        "app": "cubetracker-webapp",
        "version": __version__,
        "status": "ok",
        "mode": "prod" if IS_PROD else "dev",
    }

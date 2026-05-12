"""Admin-API (Phase W) — Statistiken fuer App-Betreiber.

Nur fuer User deren Email in der `ADMIN_EMAILS`-Env-Var steht
(comma-separated). Andere User: 403.

Endpoints:
- GET /admin/stats   — Cluster-Statistiken (User-Counts, Solve-Volume,
                       Activity-Last-7-Days etc.)

Bewusst klein gehalten: nur AGGREGAT-Daten, keine Einzelnen-User-Solves
oder personenbezogenen Daten. DSGVO-konform (Statistiken sind anonym
aggregiert).
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import Achievement, Hardware, Session as DbSession, Snapshot, Solve, User

router = APIRouter(prefix="/admin", tags=["admin"])

# Sub-Agent-QA-Finding S3: Rate-Limit auf Admin-Endpoints — verhindert
# dass ein authentifizierter Angreifer mit gestohlenem Token die teuren
# COUNT-Queries haemmert.
ADMIN_LIMIT = "30/minute"


def _get_admin_emails() -> set[str]:
    """ADMIN_EMAILS aus Env, comma-separated, normalisiert."""
    raw = os.getenv("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI-Dependency fuer Admin-only-Endpoints.

    Sub-Agent-QA-Finding S1: als Dependency statt manueller Aufruf
    im Endpoint-Body — verhindert dass spaetere Admin-Endpoints den
    Check vergessen koennen (statisch im Code-Review erkennbar).

    Sicherheits-Hinweis: liefert generischen 404 (wie bei nicht-existenten
    Endpunkten), kein 403 — verhindert das Probing ob Admin-Endpoint
    existiert. Fail-closed: leere ADMIN_EMAILS -> alle bekommen 404.
    """
    admin_emails = _get_admin_emails()
    if not admin_emails or current_user.email.lower() not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found.",
        )
    return current_user


@router.get("/stats")
@limiter.limit(ADMIN_LIMIT)
def get_admin_stats(
    request: Request,
    _admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Cluster-Statistiken fuer App-Betreiber.

    Liefert ANONYM aggregierte Daten:
    - User: Counts (total/active/verified/recently-active)
    - Daten-Volumen: Solves, Sessions, Hardware, Achievements
    - Activity: aktive User in den letzten 7/30 Tagen
    - Cube-Type-Verteilung (top 10)
    - Snapshot-Storage-Nutzung

    KEINE personenbezogenen Daten (keine Emails, Display-Names,
    Einzel-Solves). DSGVO-konform.

    Sub-Agent-QA-Finding S4: bei sehr kleinem User-Cluster (<5 User)
    sind Cube-Type-Listen theoretisch deanonymisierbar — akzeptables
    Restrisiko fuer Friends-Phase. Bei Wachstum: k-anonymity-Threshold
    in der Cube-Type-Aggregation.
    """
    now = datetime.now(UTC)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # User-Counts
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = (
        db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    )
    verified_users = (
        db.scalar(select(func.count(User.id)).where(User.email_verified.is_(True))) or 0
    )

    # Recently-active: User die in den letzten 7/30 Tagen Solves angelegt haben
    recent_active_7d = (
        db.scalar(
            select(func.count(distinct(Solve.user_id))).where(Solve.timestamp >= seven_days_ago)
        )
        or 0
    )
    recent_active_30d = (
        db.scalar(
            select(func.count(distinct(Solve.user_id))).where(
                Solve.timestamp >= thirty_days_ago
            )
        )
        or 0
    )

    # Daten-Volumen
    total_solves = db.scalar(select(func.count(Solve.id))) or 0
    total_sessions = db.scalar(select(func.count(DbSession.id))) or 0
    total_hardware = db.scalar(select(func.count(Hardware.id))) or 0
    total_achievements_unlocked = db.scalar(select(func.count(Achievement.id))) or 0

    # Top-10 Cube-Types (nach Solve-Anzahl)
    cube_rows = db.execute(
        select(Solve.cube_type, func.count(Solve.id).label("cnt"))
        .group_by(Solve.cube_type)
        .order_by(func.count(Solve.id).desc())
        .limit(10)
    ).all()
    top_cubes = [{"cube_type": r[0], "solves": int(r[1])} for r in cube_rows]

    # Snapshot-Storage
    total_snapshots = db.scalar(select(func.count(Snapshot.id))) or 0
    total_snapshot_bytes = (
        db.scalar(select(func.coalesce(func.sum(func.length(Snapshot.payload_json)), 0)))
        or 0
    )

    return {
        "users": {
            "total": int(total_users),
            "active": int(active_users),
            "email_verified": int(verified_users),
            "recently_active_7d": int(recent_active_7d),
            "recently_active_30d": int(recent_active_30d),
        },
        "volume": {
            "solves": int(total_solves),
            "sessions": int(total_sessions),
            "hardware": int(total_hardware),
            "achievements_unlocked": int(total_achievements_unlocked),
        },
        "top_cubes": top_cubes,
        "storage": {
            "snapshots_count": int(total_snapshots),
            "snapshots_total_bytes": int(total_snapshot_bytes),
            "snapshots_total_mb": round(int(total_snapshot_bytes) / 1024 / 1024, 2),
        },
        "as_of": now.isoformat(),
    }

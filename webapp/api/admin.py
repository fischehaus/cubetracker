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

import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import Achievement, Hardware, Session as DbSession, Snapshot, Solve, User
from emailing.service import send_admin_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Sub-Agent-QA-Finding S3: Rate-Limit auf Admin-Endpoints — verhindert
# dass ein authentifizierter Angreifer mit gestohlenem Token die teuren
# COUNT-Queries haemmert.
ADMIN_LIMIT = "30/minute"
# Single-User-Mail darf haeufiger gehen (Support-Use-Case), aber nicht
# beliebig (Spam-Schutz falls Admin-Token kompromittiert).
ADMIN_MAIL_LIMIT = "30/hour"
# Bulk-Announcement: sehr streng, weil es alle User trifft. 3/h reicht
# fuer betriebliche Ankuendigungen, killt Account-Takeover-Mailbomb.
ADMIN_ANNOUNCE_LIMIT = "3/hour"
# QA-Finding M2: synchroner Resend-Loop -> bei vielen Empfaengern
# Render-Worker-Timeout (>30s). Harter Cap bis Background-Job-Setup.
# 80 * ~200ms = ~16s. Wenn das ueberschritten wird, sollte ein BG-Job
# oder Resend-Batch-Endpoint hin.
ANNOUNCEMENT_MAX_RECIPIENTS = 80


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


# ============================================================
# User-Management (Phase W.admin Phase 2)
# ============================================================


class AdminUserPatch(BaseModel):
    """Felder die ein Admin an einem fremden User aendern darf.

    extra="forbid": Mass-Assignment-Schutz wie bei UserUpdate. Bewusst KEIN
    email/display_name/password — fuer Email-Change gibt's den User-Flow,
    Display-Name ist sein Recht, Passwort hat der Admin gar nicht (bcrypt).
    """

    model_config = ConfigDict(extra="forbid")
    is_active: bool | None = None
    email_verified: bool | None = None


class AdminEmailPayload(BaseModel):
    """Ad-hoc-Mail-Body. Plain-Text, Service escaped vor HTML-Render."""

    model_config = ConfigDict(extra="forbid")
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)


class AdminAnnouncementPayload(BaseModel):
    """Bulk-Mail an alle aktiven User. dry_run liefert nur Empfaenger-Count."""

    model_config = ConfigDict(extra="forbid")
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)
    dry_run: bool = Field(default=False)


def _user_summary_row(
    user: User, solve_count: int, last_solve_at: datetime | None
) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "solve_count": solve_count,
        "last_solve_at": last_solve_at.isoformat() if last_solve_at else None,
    }


@router.get("/users")
@limiter.limit(ADMIN_LIMIT)
def list_users(
    request: Request,
    _admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Alle User mit Aggregaten (Solve-Count, letzter Solve).

    Bewusst kein Pagination — bei <500 User reicht's. Wenn das ueberlaeuft,
    waere k-anonym-Filter sowieso noetig (siehe S4-Doku).
    """
    # Aggregat: solve_count + max(timestamp) je User in einer Query.
    # LEFT JOIN damit User ohne Solves trotzdem mit count=0 auftauchen.
    stats_subq = (
        select(
            Solve.user_id.label("uid"),
            func.count(Solve.id).label("cnt"),
            func.max(Solve.timestamp).label("last_at"),
        )
        .group_by(Solve.user_id)
        .subquery()
    )
    rows = db.execute(
        select(User, stats_subq.c.cnt, stats_subq.c.last_at)
        .outerjoin(stats_subq, User.id == stats_subq.c.uid)
        .order_by(User.created_at.desc())
    ).all()
    users = [
        _user_summary_row(u, int(cnt or 0), last_at) for (u, cnt, last_at) in rows
    ]
    return {"users": users, "count": len(users)}


@router.patch("/users/{user_id}")
@limiter.limit(ADMIN_LIMIT)
def update_user(
    request: Request,
    user_id: int,
    payload: AdminUserPatch,
    admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Setzt is_active und/oder email_verified an einem fremden User.

    Self-Protection: Admin kann sich nicht selbst deaktivieren (sonst
    aussperren-Gefahr).
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Du kannst dich nicht selbst per Admin-API aendern. "
                "Nutze /auth/me oder einen anderen Admin-Account."
            ),
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden."
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mindestens ein Feld (is_active oder email_verified) muss gesetzt sein.",
        )

    # Token-Revocation: Deaktivieren MUSS token_version hochzaehlen, sonst
    # koennte der gerade gesperrte User mit seinem bestehenden Access-Token
    # bis zur naechsten /auth/refresh weiter requests machen.
    if "is_active" in updates and updates["is_active"] is False and user.is_active:
        user.token_version = (user.token_version or 0) + 1
    if "is_active" in updates:
        user.is_active = bool(updates["is_active"])
    if "email_verified" in updates:
        user.email_verified = bool(updates["email_verified"])

    db.commit()
    db.refresh(user)
    logger.warning(
        "[ADMIN] %s patched user %s (%s) -> %s",
        admin.email,
        user.id,
        user.email,
        updates,
    )
    return _user_summary_row(user, solve_count=0, last_solve_at=None)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(ADMIN_LIMIT)
def delete_user(
    request: Request,
    user_id: int,
    confirm: str = Query(
        ..., description="Muss exakt 'DELETE_USER_{id}' sein, sonst 400."
    ),
    admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> None:
    """Hard-Delete eines fremden Users incl. Cascade (Solves, Sessions,
    Hardware, Achievements, Snapshots, alles).

    Confirm-Mechanik wie bei /backup/restore?mode=replace — muesste man
    aus Versehen mehrfach in der UI tippen damit's ausgeloest wird.
    DSGVO-Pflicht: User-Recht auf Vergessen, dokumentierte Dauer 30 Tage,
    wir loeschen sofort. Audit ueber WARNING-Log + Render-Log-Retention.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Du kannst dich nicht selbst loeschen.",
        )
    expected_confirm = f"DELETE_USER_{user_id}"
    if confirm != expected_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"confirm muss exakt '{expected_confirm}' sein.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden."
        )
    email_for_log = user.email  # nach delete() ist user detached
    db.delete(user)
    db.commit()
    logger.warning(
        "[ADMIN] %s HARD-DELETED user %s (%s) — DSGVO-Cascade",
        admin.email,
        user_id,
        email_for_log,
    )


@router.post("/users/{user_id}/email")
@limiter.limit(ADMIN_MAIL_LIMIT)
def send_email_to_user(
    request: Request,
    user_id: int,
    payload: AdminEmailPayload,
    admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Ad-hoc-Mail an einen einzelnen User (Support, Antwort auf Nachfrage).

    Body ist Plain-Text, der Email-Service escaped vor HTML-Render. Keine
    Markdown-/HTML-Pass-Through (Stored-XSS-Schutz falls Admin-Account
    kompromittiert).
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden."
        )
    result = send_admin_message(user.email, payload.subject, payload.body)
    logger.info(
        "[ADMIN] %s -> mail-to-user %s (%s) success=%s id=%s err=%s",
        admin.email,
        user.id,
        user.email,
        result.success,
        result.message_id,
        result.error,
    )
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "recipient": user.email,
    }


@router.post("/announcement")
@limiter.limit(ADMIN_ANNOUNCE_LIMIT)
def send_announcement(
    request: Request,
    payload: AdminAnnouncementPayload,
    admin: User = Depends(require_admin),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Bulk-Mail an alle AKTIVEN User mit verifizierter Email.

    dry_run liefert nur die Empfaenger-Zahl, kein Versand. Praktisch fuer
    Pre-Check ("an wieviele schicke ich?") bevor man den echten Knopf
    drueckt.

    Filter:
    - is_active=True (nicht-deaktivierte)
    - email_verified=True (nur Mails wo wir sicher sind dass sie ankommen
      und Consent ist abgesichert — sonst Spam-Reports)
    """
    recipients = db.execute(
        select(User.email).where(
            User.is_active.is_(True), User.email_verified.is_(True)
        )
    ).scalars().all()
    if payload.dry_run:
        return {
            "dry_run": True,
            "recipient_count": len(recipients),
            "sent": 0,
            "failed": 0,
            "max_recipients": ANNOUNCEMENT_MAX_RECIPIENTS,
            "over_cap": len(recipients) > ANNOUNCEMENT_MAX_RECIPIENTS,
        }

    # QA-Finding M2: harter Cap gegen Worker-Timeout. Wenn das ueberschritten
    # wird, ist ein Background-Job-Setup faellig (siehe Code-Kommentar oben).
    if len(recipients) > ANNOUNCEMENT_MAX_RECIPIENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Zu viele Empfaenger ({len(recipients)}). Maximal "
                f"{ANNOUNCEMENT_MAX_RECIPIENTS} synchron unterstuetzt. "
                "Bitte Background-Job-Setup implementieren bevor du an "
                "mehr User schicken willst."
            ),
        )

    sent = 0
    failed = 0
    failures: list[str] = []
    for to in recipients:
        result = send_admin_message(to, payload.subject, payload.body)
        if result.success:
            sent += 1
        else:
            failed += 1
            failures.append(f"{to}: {result.error}")
    logger.warning(
        "[ADMIN] %s sent announcement '%s' to %d recipients (sent=%d failed=%d)",
        admin.email,
        payload.subject[:60],
        len(recipients),
        sent,
        failed,
    )
    return {
        "dry_run": False,
        "recipient_count": len(recipients),
        "sent": sent,
        "failed": failed,
        # nur die ersten 20 Fehler-Details zurueck, sonst kann der Response
        # bei vielen Empfaengern riesig werden
        "failures": failures[:20],
    }

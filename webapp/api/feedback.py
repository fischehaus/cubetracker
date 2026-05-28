"""Feedback-API (Phase W.feedback, 2026-05-17; umgebaut 2026-05-28 W.tester-role-db).

Nach W.tester-role-db: der ursprüngliche „per Email"-Versand ist
abgelöst durch DB-persistierte FeedbackMessage-Items. User schicken
ihre Nachricht via POST /feedback/messages → landet in der
Admin-Inbox (AdminFeedbackInboxPanel). Admin antwortet via Inbox-UI,
User sieht die Antwort im „Mein Feedback"-Bereich (Verwaltung →
Meine Daten) beim nächsten Login.

Endpoints:
    POST   /feedback/messages           — User schickt Feedback
    GET    /feedback/me/messages        — User sieht eigene Feedback-Items
    GET    /feedback/me/unread-count    — Anzahl ungelesener Admin-Antworten
    POST   /feedback/me/messages/{id}/seen — markiert Antwort als gelesen

Admin-Endpoints (Inbox-CRUD + Stats) liegen in api/admin.py:
    GET    /admin/feedback/messages     — alle Items mit Filter
    PATCH  /admin/feedback/messages/{id} — Status + Antwort setzen
    DELETE /admin/feedback/messages/{id} — Item löschen

Hartes Rate-Limit (3/Stunde pro User) gegen Spam. Auth pflicht für
alle Endpoints — Feedback ist user-gebunden.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.database import get_db
from db.models import FeedbackMessage, User
from db.schemas import (
    FeedbackMessageCreate,
    FeedbackMessageRead,
    FeedbackMessageUserRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/messages", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
def create_feedback_message(
    request: Request,
    payload: FeedbackMessageCreate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Neue Feedback-Nachricht vom eingeloggten User in die Admin-Inbox.

    Status startet auf „new". Admin sieht das Item sofort im
    AdminFeedbackInboxPanel und kann darauf antworten — der User
    bekommt die Antwort beim nächsten Login als Toast.
    """
    msg = FeedbackMessage(
        user_id=current_user.id,
        category=payload.category,
        message=payload.message.strip(),
        status="new",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    logger.info(
        "[FEEDBACK] %s wrote %s message #%s",
        current_user.email,
        payload.category,
        msg.id,
    )
    # User-Endpoint nutzt slim Schema (ohne user_id-Echo).
    return FeedbackMessageUserRead.model_validate(msg).model_dump(mode="json")


@router.get("/me/messages")
def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert die eigenen Feedback-Items des Users, neueste zuerst.

    Wird vom „Mein Feedback"-Bereich (Verwaltung → Meine Daten)
    konsumiert. Admin-Antworten werden mitgeliefert sobald sie
    geschrieben sind (admin_response + admin_response_at).

    QA-Fix W.tester-feedback-qa: nutzt FeedbackMessageUserRead (ohne
    user_id + admin_response_by_user_id) — keine ID-Enumeration.
    """
    rows = (
        db.execute(
            select(FeedbackMessage)
            .where(FeedbackMessage.user_id == current_user.id)
            .order_by(FeedbackMessage.created_at.desc())
        )
        .scalars()
        .all()
    )
    return {
        "messages": [
            FeedbackMessageUserRead.model_validate(r).model_dump(mode="json")
            for r in rows
        ],
        "count": len(rows),
    }


@router.get("/me/unread-count")
def my_unread_response_count(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, int]:
    """Anzahl Items des Users mit Admin-Antwort, die er noch nicht
    gesehen hat. Frontend nutzt das für Toast + Unread-Dot beim Login.
    """
    cnt = db.scalar(
        select(func.count(FeedbackMessage.id)).where(
            FeedbackMessage.user_id == current_user.id,
            FeedbackMessage.admin_response.is_not(None),
            FeedbackMessage.user_seen_response_at.is_(None),
        )
    ) or 0
    return {"unread_count": int(cnt)}


@router.post("/me/messages/{message_id}/seen", status_code=status.HTTP_204_NO_CONTENT)
def mark_response_seen(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """User markiert eine Admin-Antwort als gelesen.

    Defensiv: only verwirft user_seen_response_at-Update wenn das Item
    auch dem User gehört. 404 sonst (kein Information-Leak via Probing).
    """
    msg = db.get(FeedbackMessage, message_id)
    if msg is None or msg.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback-Item nicht gefunden.",
        )
    if msg.admin_response is None:
        # Defensive: kein Status-Update wenn gar keine Antwort vorliegt.
        return
    if msg.user_seen_response_at is None:
        msg.user_seen_response_at = datetime.now(UTC)
        db.commit()

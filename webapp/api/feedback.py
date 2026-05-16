"""Feedback-API (Phase W.feedback, 2026-05-17).

POST /feedback — User schickt Feedback an den Admin via Resend-Email.
Alternative zu GitHub-Issues fuer User ohne GitHub-Account.

Hartes Rate-Limit (3/Stunde pro IP) gegen Spam. Auth pflicht damit nur
echte User schreiben koennen + Sender-Info im Email-Body landet.
"""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field

from auth.deps import get_current_user
from auth.rate_limit import limiter
from db.models import User
from emailing.service import send_feedback_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackPayload(BaseModel):
    """Eingehende Feedback-Daten vom Frontend."""

    model_config = ConfigDict(extra="forbid")

    # type bewusst eingeschraenkt — User soll keinen freien String setzen
    # damit wir die Email-Betreffs vorhersagbar halten + ggf. spaeter
    # routen koennen (Bug → Issue-Tracker, Feature → Roadmap-Doku, etc.).
    feedback_type: Literal["bug", "feature", "other"] = "other"
    message: str = Field(min_length=10, max_length=4000)


@router.post("", status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
def submit_feedback(
    request: Request,
    payload: FeedbackPayload,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """User-Feedback an den Admin via Resend-Email."""
    result = send_feedback_email(
        feedback_type=payload.feedback_type,
        message=payload.message.strip(),
        user_email=current_user.email,
        user_display_name=current_user.display_name,
    )
    if not result.success:
        # 503 statt 500 weil's ein externer Service ist (Resend),
        # nicht unser Code-Bug.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Feedback konnte nicht versendet werden ({result.error}). "
                "Bitte versuche es spaeter erneut oder oeffne direkt ein "
                "GitHub-Issue."
            ),
        )
    return {
        "success": True,
        "message_id": result.message_id,
    }

"""Pydantic-Schemas fuer cubetracker-webapp."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ============================================================
# User-Schemas
# ============================================================


class UserCreate(BaseModel):
    """POST /auth/register Payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """POST /auth/login Payload (alternativ zu OAuth2-Form)."""

    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime


class AccessTokenOnly(BaseModel):
    """Login + Refresh + Logout-Renew Response.

    Nur Access-Token im Body — der Refresh-Token wird ausschliesslich
    als HttpOnly-Cookie gesetzt (XSS-sicher, Security-Finding #1).
    """

    access_token: str
    token_type: str = "bearer"

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


class TokenPair(BaseModel):
    """Login-Response: Access + Refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenOnly(BaseModel):
    """Refresh-Response (nur neuer Access)."""

    access_token: str
    token_type: str = "bearer"

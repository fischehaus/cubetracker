"""Pydantic-Schemas fuer cubetracker-webapp.

API-Surface bewusst OHNE user_id — der wird IMMER aus current_user gezogen,
nie vom Client uebergeben (sonst koennte ein User Daten anderer User
manipulieren).
"""

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
    email_verified: bool
    display_name: str | None
    created_at: datetime
    # Computed-Property aus dem User-Model — abgeleitet von ADMIN_EMAILS-Env-Var.
    # Frontend nutzt das um den Admin-Sub-Tab im VerwaltungTab nur fuer
    # Admins zu rendern. Default False fuer Tests die UserRead manuell bauen.
    is_admin: bool = False


class UserUpdate(BaseModel):
    """PATCH /auth/me — Profil-Updates (display_name aktuell, kein email).

    Sub-Agent-Finding K4: extra="forbid" als zweite Defense-Schicht gegen
    Mass-Assignment. Zusammen mit Whitelist im Endpoint defensiv genug
    auch wenn diese Klasse spaeter erweitert wird.
    """

    model_config = ConfigDict(extra="forbid")
    display_name: str | None = Field(default=None, max_length=64)


class PasswordChange(BaseModel):
    """POST /auth/change-password — eingeloggter User aendert Passwort."""

    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    """POST /auth/forgot-password — User triggert Reset-Mail."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """POST /auth/reset-password — Token aus Mail-Link + neues Passwort."""

    token: str
    new_password: str = Field(min_length=8, max_length=128)


class EmailChangeRequest(BaseModel):
    """POST /auth/change-email — eingeloggter User aendert Email."""

    current_password: str
    new_email: EmailStr


class VerifyEmailRequest(BaseModel):
    """POST /auth/verify-email — Token aus Mail-Link."""

    token: str


class AccessTokenOnly(BaseModel):
    """Login + Refresh + Logout-Renew Response.

    Nur Access-Token im Body — der Refresh-Token wird ausschliesslich
    als HttpOnly-Cookie gesetzt (XSS-sicher, Security-Finding #1).
    """

    access_token: str
    token_type: str = "bearer"


# ============================================================
# Session-Schemas
# ============================================================


class SessionBase(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    scramble_type: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class SessionCreate(SessionBase):
    cstimer_session_id: int | None = None


class SessionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    scramble_type: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class SessionRead(SessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cstimer_session_id: int | None
    created_at: datetime


# ============================================================
# Solve-Schemas
# ============================================================


class SolveBase(BaseModel):
    time_ms: int = Field(ge=0, description="Loesungs-Zeit in Millisekunden")
    cube_type: str = Field(min_length=1, max_length=32, description='z.B. "3x3"')
    scramble: str | None = None
    notes: str | None = None
    plus_two: bool = False
    dnf: bool = False
    alg_case: str | None = Field(
        default=None,
        max_length=64,
        description="Subset-Case-Code, z.B. 'PLL-Tperm' / 'OLL-21'",
    )
    split_times_ms: str | None = Field(
        default=None,
        description=(
            "JSON-array of phase-durations in ms (z.B. '[1200,3300,1800,1200]'). "
            "Sum sollte time_ms entsprechen. None = klassischer Solve ohne Splits."
        ),
    )


class SolveCreate(SolveBase):
    """timestamp ist optional — wenn nicht gesetzt, nutzt der Server `now()`."""

    timestamp: datetime | None = None
    session_id: int | None = None
    hardware_id: int | None = None


class SolveUpdate(BaseModel):
    time_ms: int | None = Field(default=None, ge=0)
    cube_type: str | None = Field(default=None, min_length=1, max_length=32)
    scramble: str | None = None
    notes: str | None = None
    plus_two: bool | None = None
    dnf: bool | None = None
    session_id: int | None = None
    hardware_id: int | None = None
    alg_case: str | None = Field(default=None, max_length=64)
    split_times_ms: str | None = None


class SolveRead(SolveBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    session_id: int | None
    hardware_id: int | None
    effective_time_ms: int | None


# ============================================================
# Hardware-Schemas
# ============================================================


class HardwareBase(BaseModel):
    name: str = Field(min_length=1, max_length=128, description='z.B. "Weilong v11"')
    primary_cube_type: str = Field(
        min_length=1,
        max_length=32,
        description='Primaerer Cube-Type (z.B. "3x3"). Default-Sortierung.',
    )
    notes: str | None = None
    is_active: bool = True
    acquired_at: datetime | None = None


class HardwareCreate(HardwareBase):
    pass


class HardwareUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    primary_cube_type: str | None = Field(default=None, min_length=1, max_length=32)
    notes: str | None = None
    is_active: bool | None = None
    acquired_at: datetime | None = None


class HardwareRead(HardwareBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime

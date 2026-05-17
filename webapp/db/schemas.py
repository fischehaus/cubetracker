"""Pydantic-Schemas fuer cubetracker-webapp.

API-Surface bewusst OHNE user_id — der wird IMMER aus current_user gezogen,
nie vom Client uebergeben (sonst koennte ein User Daten anderer User
manipulieren).
"""

from __future__ import annotations

from datetime import datetime

from typing import Literal

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
    # Phase W.9: Opt-In fuer User-Suche per display_name. Frontend zeigt
    # einen Toggle in den Einstellungen.
    is_discoverable: bool = False
    # Phase W.future-tournaments: Postleitzahl fuer „Turniere in der
    # Naehe"-Feature. Optional, multi-country (kein Format-Check).
    postal_code: str | None = None
    # Phase W.country-feld (2026-05-16): ISO-3166-1-alpha-2-Land.
    country_iso2: str | None = None


class UserUpdate(BaseModel):
    """PATCH /auth/me — Profil-Updates (display_name aktuell, kein email).

    Sub-Agent-Finding K4: extra="forbid" als zweite Defense-Schicht gegen
    Mass-Assignment. Zusammen mit Whitelist im Endpoint defensiv genug
    auch wenn diese Klasse spaeter erweitert wird.
    """

    model_config = ConfigDict(extra="forbid")
    display_name: str | None = Field(default=None, max_length=64)
    is_discoverable: bool | None = Field(default=None)
    postal_code: str | None = Field(default=None, max_length=16)
    # Phase W.country-feld (2026-05-16): ISO-3166-1-alpha-2-Code (DE, AT, US, …).
    # Wir uppercasen im Endpoint vor dem Speichern, hier lasche Validierung
    # (2 chars, alphanumerisch).
    country_iso2: str | None = Field(
        default=None, min_length=2, max_length=2, pattern=r"^[A-Za-z]{2}$"
    )


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


# ============================================================
# LiveTest (Phase W.live-tests, 2026-05-17)
# ============================================================

LiveTestStatusLiteral = Literal["open", "pass", "fail", "skip"]


class LiveTestCreate(BaseModel):
    """Payload zum Anlegen eines neuen Live-Tests (Admin-only).

    Wird im Admin-UI manuell befuellt — Claude gibt mir eine Test-Anweisung
    im Chat, ich kopiere title + description rein. Optional related_phase
    z.B. "W.scramble-image" um Tests einer Welle zuzuordnen.
    """

    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    related_phase: str | None = Field(default=None, max_length=64)
    related_commit_sha: str | None = Field(default=None, max_length=40)
    related_tag: str | None = Field(default=None, max_length=120)


class LiveTestUpdate(BaseModel):
    """Patch: Status setzen + Antwort schreiben.

    Beide Felder optional damit man z.B. nur eine Notiz updaten kann
    ohne Status zu aendern. Beim Status-Set wird responded_at +
    responded_by_user_id serverseitig gesetzt.
    """

    model_config = ConfigDict(extra="forbid")
    status: LiveTestStatusLiteral | None = None
    user_response: str | None = Field(default=None, max_length=4000)


class LiveTestRead(BaseModel):
    """Read-Schema fuer Liste / Detail."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    related_phase: str | None
    related_commit_sha: str | None
    related_tag: str | None
    status: str
    user_response: str | None
    responded_at: datetime | None
    responded_by_user_id: int | None
    github_issue_url: str | None
    github_issue_number: int | None
    created_at: datetime
    created_by_user_id: int | None

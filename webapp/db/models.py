"""SQLAlchemy-Models fuer cubetracker-webapp (Phase W) — Multi-User.

Kerndifferenz zum Desktop-Backend:
- User-Tabelle als Wurzel
- ALLE bisherigen Tabellen haben user_id-FK (NOT NULL, ondelete=CASCADE
  damit User-Loeschen die ganze Daten-Pyramide mit-loescht — DSGVO-relevant)

Schema 1:1 wie Desktop, nur user_id ergaenzt. Pure-Logic-Module aus dem
Desktop-Backend (stats/calc.py, achievements/check.py, etc.) bleiben
wiederverwendbar — sie operieren auf SolvePoint-Tupeln, nicht auf der
DB direkt.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """Ein registrierter App-User.

    `email`: unique, Kleinbuchstaben (Caller normalisiert).
    `hashed_password`: bcrypt-Hash, NIE Plaintext.
    `is_active`: Soft-Delete-Flag (deaktiviert = kein Login moeglich,
        Daten bleiben).
    `created_at`: Registrierungs-Zeitstempel.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Phase W.8: User-Management.
    # email_verified=False bei Register, wird True nach Klick auf Verify-Link.
    # Nicht-verifizierte User koennen sich trotzdem einloggen (sonst chicken-egg
    # wenn Mail nicht ankommt), aber UI zeigt einen Hinweis-Banner.
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Token-Revocation: jeder ausgegebene JWT enthaelt das aktuelle token_version
    # in seinen Claims. Wird die Spalte hochgezaehlt (Logout, Password-Change),
    # invalidiert das alle bestehenden Tokens dieses Users sofort.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships fuer DSGVO-Cascade beim User-Delete
    solves: Mapped[list[Solve]] = relationship(
        "Solve", back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list[Session]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    hardware: Mapped[list[Hardware]] = relationship(
        "Hardware", back_populates="user", cascade="all, delete-orphan"
    )
    achievements: Mapped[list[Achievement]] = relationship(
        "Achievement", back_populates="user", cascade="all, delete-orphan"
    )
    challenges: Mapped[list[Challenge]] = relationship(
        "Challenge", back_populates="user", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list[Snapshot]] = relationship(
        "Snapshot", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list[PasswordResetToken]] = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    email_verification_tokens: Mapped[list[EmailVerificationToken]] = relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def is_admin(self) -> bool:
        """Computed: True wenn email in ADMIN_EMAILS-Env-Var (comma-separated).

        Persistiert NICHT in der DB — Quelle-of-Truth ist die Env-Var (auch
        genutzt in api/admin.py:require_admin). Pydantic UserRead picked das
        ueber from_attributes automatisch auf, ohne dass jeder Endpoint
        manuell setzen muss.
        Fail-closed: leere/fehlende ADMIN_EMAILS -> alle False.
        """
        raw = os.getenv("ADMIN_EMAILS", "")
        admin_set = {e.strip().lower() for e in raw.split(",") if e.strip()}
        return bool(admin_set) and self.email.lower() in admin_set

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r}>"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    scramble_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cstimer_session_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    user: Mapped[User] = relationship("User", back_populates="sessions")
    solves: Mapped[list[Solve]] = relationship(
        "Solve", back_populates="session", cascade="save-update, merge"
    )

    # cstimer_session_id ist pro User unique, nicht global (anders als Desktop!)
    __table_args__ = (
        Index("ix_sessions_user_cstimer", "user_id", "cstimer_session_id", unique=True),
    )


class Solve(Base):
    __tablename__ = "solves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    cube_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    scramble: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), index=True
    )
    plus_two: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    dnf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    hardware_id: Mapped[int | None] = mapped_column(
        ForeignKey("hardware.id", ondelete="SET NULL"), nullable=True, index=True
    )
    alg_case: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    split_times_ms: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="solves")
    session: Mapped[Session | None] = relationship("Session", back_populates="solves")
    hardware: Mapped[Hardware | None] = relationship("Hardware", back_populates="solves")

    __table_args__ = (
        Index("ix_solves_user_cube_ts", "user_id", "cube_type", "timestamp"),
        Index("ix_solves_user_session_ts", "user_id", "session_id", "timestamp"),
    )

    @property
    def effective_time_ms(self) -> int | None:
        if self.dnf:
            return None
        return self.time_ms + 2000 if self.plus_two else self.time_ms


class Hardware(Base):
    __tablename__ = "hardware"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    primary_cube_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    acquired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    user: Mapped[User] = relationship("User", back_populates="hardware")
    solves: Mapped[list[Solve]] = relationship(
        "Solve", back_populates="hardware", cascade="save-update, merge"
    )


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    user: Mapped[User] = relationship("User", back_populates="achievements")

    # code ist pro User unique (jeder User kann jedes Achievement nur 1x haben)
    __table_args__ = (Index("ix_achievements_user_code", "user_id", "code", unique=True),)


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    cube_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    params_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_value: Mapped[int] = mapped_column(Integer, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    generated_for_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    user: Mapped[User] = relationship("User", back_populates="challenges")


class Snapshot(Base):
    """Wiederherstellungspunkt — Voll-JSON eines User-Datenbestands.

    Wird AUTOMATISCH erzeugt vor destruktiven Ops:
    - /backup/restore?mode=replace
    - /import/cstimer mit grossem Volumen (>100 neuen Solves)

    Plus MANUELL via /backup/snapshots POST.

    Pro User max 2 Snapshots — beim Anlegen wird der aelteste verworfen.
    Storage: das ganze Backup-JSON als Text-Blob in Postgres.
    Schaetzung: 100k Solves ~30MB; 2*30MB pro User ist ok bis ~30 User
    auf Free-Tier (1GB).
    """

    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), index=True
    )
    # Klassifizierung: warum wurde dieser Snapshot angelegt?
    # "manual" | "before_restore" | "after_bulk_import"
    # (W.5-Fix 2026-05-12: "before_bulk_import" obsolet — csTimer-Import
    # ist non-destructive, Snapshot wird jetzt NACH dem Bulk-Import als
    # neuer Restore-Punkt angelegt, weil der Vor-Import-Stand via
    # Solve-Delete erreichbar bleibt + der Bulk-Import sonst Worker-blockt.)
    reason: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    # Anzahl Solves im Snapshot — fuers UI ohne JSON-Parse abrufbar.
    solve_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    session_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hardware_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Voll-Backup als JSON-Text (sqlalchemy Text fuer arbitrary length).
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="snapshots")


class PasswordResetToken(Base):
    """Single-Use-Token fuer Password-Reset-Flow (Phase W.8).

    Vom User per /auth/forgot-password angefordert -> Mail mit Link
    https://www.cubetracker.de/reset-password?token=<token-hex> -> Klick
    -> Frontend fordert neues Passwort an + POSTet token + neues Passwort
    an /auth/reset-password.

    Sicherheit:
    - token = secrets.token_urlsafe(48) (288 Bit Entropie, brute-force-sicher)
    - expires_at: 1h nach Erstellung
    - used_at: timestamp wenn benutzt -> kein Re-Use moeglich
    - Pro Password-Change: token_version++ am User -> alle alten JWTs revoked
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="password_reset_tokens")


class EmailVerificationToken(Base):
    """Single-Use-Token fuer Email-Verification (Phase W.8).

    Wird beim Register + bei /auth/resend-verification erstellt.
    Mail-Link: https://www.cubetracker.de/verify-email?token=<token-hex>
    Bei Klick: Frontend POSTet token an /auth/verify-email
    -> User.email_verified = True.

    Sicherheit:
    - token = secrets.token_urlsafe(48)
    - expires_at: 7 Tage nach Erstellung (User lange Zeit fuer Verify)
    - used_at: timestamp wenn benutzt -> kein Re-Use
    """

    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    # Bei Email-Change-Flow: hier steht die NEUE Email-Adresse. Bei Register-
    # Flow: gleich user.email. Wir speichern explizit damit Email-Change
    # sauber funktioniert (User klickt Link -> ueberschreibe email mit dem
    # Wert hier, nicht mit aktuellem user.email).
    new_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="email_verification_tokens")

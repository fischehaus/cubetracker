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

# os-Import entfernt mit W.admin-toggle (2026-05-17) — wurde nur fuer
# die alte ADMIN_EMAILS-Env-Var-Lookup in is_admin-Property gebraucht.
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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
    # Phase W.future-tournaments: Postleitzahl fuer "Turniere in der Naehe"-
    # Feature. Optional, kein Format-Constraint (multi-country: DE 5-stellig,
    # AT 4-stellig, UK alphanumerisch, etc.). Frontend validiert lasch.
    postal_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # Phase W.country-feld (2026-05-16): explizites Land im Profil. Vorher
    # haben wir das aus der PLZ-Struktur abgeleitet (5stellig→DE etc.), was
    # nur fuer DACH funktioniert. Jetzt explizit ISO-3166-1-alpha-2-Code
    # damit User weltweit korrekt geocoded + die richtigen WCA-Comps
    # angezeigt bekommen.
    country_iso2: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # Phase W.9: Friend-System.
    # Opt-In: User muss aktiv is_discoverable=true setzen damit er per
    # display_name in der User-Suche auftaucht. Default False = maximaler
    # Privacy-Schutz. Friend-Request per exakter Email umgeht diese Sperre
    # bewusst NICHT — nur per ID/User-Suche-Result-Klick anfragbar.
    is_discoverable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Token-Revocation: jeder ausgegebene JWT enthaelt das aktuelle token_version
    # in seinen Claims. Wird die Spalte hochgezaehlt (Logout, Password-Change),
    # invalidiert das alle bestehenden Tokens dieses Users sofort.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Phase W.admin-toggle (2026-05-17): is_admin als echte DB-Spalte
    # statt computed property aus ADMIN_EMAILS. Erlaubt UI-Toggle durch
    # andere Admins. Initial-Bootstrap aus ADMIN_EMAILS-Env-Var beim
    # Startup (siehe main.py:lifespan).
    is_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
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
    # Phase W.9 Friend-System. Zwei separate Relations weil eine Friendship
    # einen Requester + ein Target hat. Cascade beim User-Delete: alle eigenen
    # Friendships (egal welche Rolle) werden mit-geloescht.
    sent_friend_requests: Mapped[list[Friendship]] = relationship(
        "Friendship",
        foreign_keys="Friendship.requester_id",
        back_populates="requester",
        cascade="all, delete-orphan",
    )
    received_friend_requests: Mapped[list[Friendship]] = relationship(
        "Friendship",
        foreign_keys="Friendship.target_id",
        back_populates="target",
        cascade="all, delete-orphan",
    )

    # Phase W.admin-toggle (2026-05-17): is_admin ist jetzt eine echte
    # DB-Spalte (oben definiert), die alte @property aus ADMIN_EMAILS-Env-Var
    # ist entfernt. ADMIN_EMAILS dient nur noch als Bootstrap-Quelle beim
    # Startup (main.py lifespan). Toggle erfolgt via Admin-UI / PATCH /admin/users/:id.

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


class Friendship(Base):
    """Friend-Beziehung zwischen zwei Usern (Phase W.9).

    Workflow:
      A klickt "Anfrage senden" zu B -> Row {requester=A, target=B, status='pending'}
      B klickt "Annehmen"           -> status='accepted', accepted_at=now
      A oder B klickt "Entfernen"   -> Row wird geloescht (kein status='removed')

    Design-Entscheidungen:
    - Eine Friendship-Zeile pro Beziehung (nicht zwei symmetrische). Spart
      Schreib-Aufwand bei Accept (statt 2 Rows updaten nur 1). Friend-Listen-
      Abfragen muessen dafuer beide Richtungen (requester OR target) checken.
    - UniqueConstraint normalisiert (kleinste, groesste ID) verhindert dass
      A->B pending UND B->A pending gleichzeitig existieren (kreuz-Anfragen).
      CHECK-Constraint LEAST/GREATEST haengt von Postgres ab -> wir loesen
      es im Service-Layer via Suche nach (LEAST, GREATEST) Match.
    - CASCADE auf User-Delete: wenn ein User geloescht wird, sind seine
      Friendships obsolet — beide Richtungen weg.
    """

    __tablename__ = "friendships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Aktuell nur "pending" + "accepted". "blocked" bewusst draussen — wer
    # blockieren will, kann Friendship loeschen + die Person nicht mehr
    # findbar machen (is_discoverable=false). Block-Liste waere Phase W.10+.
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    requester: Mapped[User] = relationship(
        "User", foreign_keys=[requester_id], back_populates="sent_friend_requests"
    )
    target: Mapped[User] = relationship(
        "User", foreign_keys=[target_id], back_populates="received_friend_requests"
    )

    __table_args__ = (
        # Self-Friendship verhindern (zus. zur Service-Check)
        CheckConstraint("requester_id <> target_id", name="ck_friendship_no_self"),
        # Eine Friendship pro Paar — egal welche Richtung. Pruefung passiert
        # im Service via Symmetrie-Suche, hier ist nur (requester, target)
        # unique (verhindert Doppel-Request derselben Richtung).
        UniqueConstraint("requester_id", "target_id", name="uq_friendship_directed"),
        Index("ix_friendship_status_pair", "status", "requester_id", "target_id"),
    )


class NewsItem(Base):
    """News-Item aus dem RSS-Aggregator (Phase W.news).

    Globale Tabelle (kein user_id), wird vom News-Fetcher periodisch
    befuellt. Dedup ueber `link` (RSS-Item-URL). Cleanup von Items
    aelter als 60 Tage erledigt der Fetcher selbst.
    """

    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Source = interne ID des Feeds (z.B. "wca" oder "reddit_cubers").
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    # User-sichtbarer Label fuer die Source ("WCA", "r/Cubers").
    source_label: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    # URL zum Original-Item — UNIQUE-Constraint dient als Dedup-Key.
    link: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    __table_args__ = (
        # Sort-Index fuer "neueste zuerst"-Query (published_at DESC).
        Index("ix_news_published", "published_at"),
    )


class PostalCodeGeo(Base):
    """Geocoding-Cache fuer Postleitzahlen (Phase W.wca-comps).

    Lookup ueber Nominatim/OpenStreetMap ist rate-limited (1 req/s) und
    bei freier Nutzung schlechte Reliability — daher persistenter DB-Cache.
    PLZ + Land aendert ihre Lat/Lng praktisch nie, TTL = 30 Tage reicht.

    Geteilte Tabelle ueber alle User — wenn 100 User dieselbe PLZ haben,
    nur ein Nominatim-Call fuer alle.
    """

    __tablename__ = "postal_code_geo"

    # Composite Primary Key (postal_code, country_iso2) — selbe PLZ kann
    # in verschiedenen Laendern existieren (z.B. 1010 = AT-Wien + CH-Zuerich).
    postal_code: Mapped[str] = mapped_column(String(16), primary_key=True)
    country_iso2: Mapped[str] = mapped_column(String(2), primary_key=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    # Optional: vom Nominatim-Response uebernommener Stadtname (fuer UI-Anzeige).
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class LiveTest(Base):
    """Live-Test-Eintrag fuer den Admin-QA-Workflow (Phase W.live-tests).

    Wenn ich (Claude) ein Feature deploye, kommen oft Test-Hinweise wie
    'Phone-Test bitte: X, Y, Z'. Diese verlieren sich im Chat / bei
    Compaction. Statt im Chat zu lassen → Eintrag in dieser Tabelle →
    Admin sieht im Admin-Bereich seine QA-Checkliste, klickt PASS / FAIL.

    Bei FAIL + Notiz: optional automatisches GitHub-Issue (Phase 3,
    braucht GITHUB_TOKEN-Env-Var).

    Bewusst KEINE FK-Constraint auf created_by_user_id: Tests koennen
    auch ohne User-Account angelegt werden (z.B. manuelle Admin-Eintraege
    ohne Login, wenn man eine Welle vorbereitet). responded_by_user_id
    ist optional FK.
    """

    __tablename__ = "live_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # Welle-Identifier z.B. "W.scramble-image" — fuers Tracking welche
    # Tests aus welchem Push stammen.
    related_phase: Mapped[str | None] = mapped_column(String(64), nullable=True)
    related_commit_sha: Mapped[str | None] = mapped_column(String(40), nullable=True)
    related_tag: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Status: 'open' (default), 'pass', 'fail', 'skip'. String statt Enum
    # damit wir spaeter Subkategorien ohne Migration ergaenzen koennen.
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="open", server_default="open", index=True
    )
    user_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responded_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Phase 3: GitHub-Issue-URL + Number wenn Auto-Create gelaufen ist.
    github_issue_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_issue_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), index=True
    )
    # Kein FK weil Tests auch System-erstellt sein koennen (created_by NULL).
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<LiveTest id={self.id} status={self.status} title={self.title[:30]!r}>"

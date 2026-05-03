"""SQLAlchemy-ORM-Models fuer cubetracker.

Aktuell: Solve + Session + Hardware. Hardware-FK auf Solve ist nullable
und wurde in Phase 5 / F16 aktiviert.

Sessions wurden vorgezogen (urspruenglich Phase 3 / F14), weil der
csTimer-Import sie schon als Konzept nutzt — jeder importierte Solve
gehoert zu einer Session, und die Session traegt den Cube-Type-Kontext.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Session(Base):
    """Eine Trainings-/Solve-Session.

    `name`: User-vergebener Name (z.B. "3x3", "OH", "L4E", "pll time attack")
    `scramble_type`: WCA-Code aus csTimer (z.B. "444wca", "pyrso", "")
    `cstimer_session_id`: Originale Session-ID aus csTimer-Export, fuer
        Re-Import-Idempotenz. None bei manuell angelegten Sessions.
    `notes`: Freie User-Notizen zur Session (Phase 5b — Trainings-Kontext,
        Schwerpunkte, Cross-Cube-Kommentare, …)
    """

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    scramble_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cstimer_session_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, unique=True, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    solves: Mapped[list[Solve]] = relationship(
        "Solve", back_populates="session", cascade="save-update, merge"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Session id={self.id} name={self.name!r} scramble_type={self.scramble_type!r}>"


class Solve(Base):
    """Ein Speedcubing-Solve.

    `time_ms`: Loesungs-Zeit in Millisekunden. 12340 = 12.34s.
    `cube_type`: Kategorie wie "3x3", "4x4", "OH", "Pyra", "Skewb".
        Wird beim Import aus Session-Kontext + scramble_type abgeleitet,
        kann manuell gesetzt werden bei Direkt-Eingabe.
    `plus_two`: WCA-Strafe (+2 Sekunden) — wird in der Statistik
        beruecksichtigt; time_ms bleibt die gemessene Roh-Zeit.
    `dnf`: Did Not Finish — Solve zaehlt als ungueltig fuer Stats.
    `session_id`: nullable — Solves ohne Session-Zuordnung (z.B. ad-hoc
        manuell eingetragen) sind erlaubt.
    `hardware_id`: nullable, FK auf Hardware — Phase 5/F17 aktiviert die
        Auswahl im Frontend. Existierende Solves bleiben ohne Hardware.
    `alg_case`: nullable — Phase 8 (Algorithm-Trainer). Wenn der Solve in
        einer Trainings-Session zu einem konkreten Subset-Case gehoert
        (z.B. "PLL-Tperm", "OLL-21"), wird der Code hier abgelegt.
        Erlaubt per-case-Stats im Trainer-Tab.
    """

    __tablename__ = "solves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    cube_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    scramble: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    alg_case: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        index=True,
    )
    plus_two: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    dnf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session: Mapped[Session | None] = relationship("Session", back_populates="solves")

    # Phase 5/F16: FK auf Hardware. Wenn ein Hardware-Eintrag geloescht
    # wird, behalten betroffene Solves ihre Daten (hardware_id -> NULL).
    hardware_id: Mapped[int | None] = mapped_column(
        ForeignKey("hardware.id", ondelete="SET NULL"), nullable=True, index=True
    )
    hardware: Mapped[Hardware | None] = relationship("Hardware", back_populates="solves")

    __table_args__ = (
        Index("ix_solves_cube_type_timestamp", "cube_type", "timestamp"),
        Index("ix_solves_session_timestamp", "session_id", "timestamp"),
    )

    @property
    def effective_time_ms(self) -> int | None:
        """Tatsaechliche Zeit nach Strafen.

        Bei DNF: None. Bei +2: time_ms + 2000. Sonst: time_ms.
        """
        if self.dnf:
            return None
        return self.time_ms + 2000 if self.plus_two else self.time_ms

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Solve id={self.id} cube={self.cube_type} time={self.time_ms}ms>"


class Achievement(Base):
    """Ein freigeschaltetes Achievement (Phase 7a).

    Definitionen (name, description, category, target) leben im Code
    unter `achievements/definitions.py`. Die DB speichert NUR welche
    codes der User bereits unlocked hat — minimal-state.

    Einmal unlocked = bleibt unlocked („monotonic" wie Daily Challenges).
    Selbst wenn User Solves nachtraeglich loescht, bleibt das Achievement.
    """

    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Achievement code={self.code!r}>"


class Challenge(Base):
    """Eine Daily Challenge (Phase 7b).

    Wird taeglich generiert (max 3 pro Tag). Progress wird nach jedem
    Solve aktualisiert. Monotonic: Progress kann nur steigen, nicht
    sinken (wie mit User abgesprochen).

    `kind` legt Logik fest:
      - "volume":   target = anzahl-solves, optional cube_type-filter
      - "speed":    target = ziel-zeit-ms in cube_type — progress=1 wenn erreicht
      - "comeback": target = 1, ein solve in cube_type genuegt
      - "diversity": target = anzahl-distinct-cubes heute

    `params_json` haelt zusaetzliche kind-spezifische Felder (selten genutzt,
    aber erlaubt erweiterungen ohne schema-aenderung).
    """

    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
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

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Challenge id={self.id} kind={self.kind!r} "
            f"progress={self.progress}/{self.target_value}>"
        )


class Hardware(Base):
    """Ein physischer Wuerfel im Inventar.

    Phase 5 / F16. Ein Hardware-Eintrag = ein konkreter Wuerfel
    (z.B. „mein Weilong v11 fuer 3x3"). Der `primary_cube_type` ist
    die Default-Sortierung — nichts hindert daran, denselben 3x3-Wuerfel
    auch fuer einen OH-Solve auszuwaehlen.

    Namen sind bewusst NICHT unique: dieselbe Modell-Bezeichnung
    (z.B. „QiYi Stickered") kann fuer mehrere physische Wuerfel
    verwendet werden (3x3-Stickered, 2x2-Stickered, …).
    """

    __tablename__ = "hardware"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    primary_cube_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    acquired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    solves: Mapped[list[Solve]] = relationship(
        "Solve", back_populates="hardware", cascade="save-update, merge"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Hardware id={self.id} name={self.name!r} cube={self.primary_cube_type}>"

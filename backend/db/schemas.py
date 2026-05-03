"""Pydantic-Schemas fuer cubetracker-API.

Trennung Read/Create/Update analog zur FastAPI-Standard-Konvention:
- *Create: Eingabe beim POST (ohne id, ohne timestamp falls auto)
- *Update: PATCH-Operationen, alle Felder optional
- *Read: Ausgabe an den Client (mit id, timestamp, abgeleiteten Werten)
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ============================================================
# Session-Schemas
# ============================================================


class SessionBase(BaseModel):
    """Gemeinsame Felder fuer Session-Schemas."""

    name: str = Field(min_length=1, max_length=128)
    scramble_type: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class SessionCreate(SessionBase):
    """Eingabe-Schema fuer POST /sessions."""

    cstimer_session_id: int | None = None


class SessionUpdate(BaseModel):
    """PATCH-Schema fuer /sessions/{id} — alle Felder optional."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    scramble_type: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class SessionRead(SessionBase):
    """Ausgabe-Schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    cstimer_session_id: int | None
    created_at: datetime


# ============================================================
# Solve-Schemas
# ============================================================


class SolveBase(BaseModel):
    """Gemeinsame Felder fuer Solve-Schemas."""

    time_ms: int = Field(ge=0, description="Loesungs-Zeit in Millisekunden")
    cube_type: str = Field(min_length=1, max_length=32, description='z.B. "3x3"')
    scramble: str | None = None
    notes: str | None = None
    plus_two: bool = False
    dnf: bool = False
    alg_case: str | None = Field(
        default=None,
        max_length=64,
        description="Phase 8: Subset-Case-Code, z.B. 'PLL-Tperm' / 'OLL-21'",
    )
    split_times_ms: str | None = Field(
        default=None,
        description=(
            "Phase 8.2: JSON-array of phase-durations in ms (z.B. '[1200,3300,1800,1200]'). "
            "Sum sollte time_ms entsprechen. None = klassischer Solve ohne Splits."
        ),
    )


class SolveCreate(SolveBase):
    """Eingabe-Schema fuer POST /solves.

    timestamp ist optional — wenn nicht gesetzt, nutzt der Server `now()`.
    """

    timestamp: datetime | None = None
    session_id: int | None = None
    hardware_id: int | None = None


class SolveUpdate(BaseModel):
    """PATCH-Schema — alle Felder optional."""

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
    """Ausgabe-Schema — alles was der Client sehen darf."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    session_id: int | None
    hardware_id: int | None
    effective_time_ms: int | None


# ============================================================
# Hardware-Schemas (Phase 5 / F16)
# ============================================================


class HardwareBase(BaseModel):
    """Gemeinsame Felder fuer Hardware-Schemas."""

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
    """Eingabe-Schema fuer POST /hardware."""


class HardwareUpdate(BaseModel):
    """PATCH-Schema fuer /hardware/{id} — alle Felder optional."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    primary_cube_type: str | None = Field(default=None, min_length=1, max_length=32)
    notes: str | None = None
    is_active: bool | None = None
    acquired_at: datetime | None = None


class HardwareRead(HardwareBase):
    """Ausgabe-Schema fuer Hardware."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime

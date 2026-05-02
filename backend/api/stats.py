"""Stats-API.

Endpoints:
- GET /stats?cube_type=X&session_id=Y → vollstaendige Stats fuer
  die gefilterte Solve-Menge (Avg5/12/100, Best, Worst, Mean,
  current + best Averages, Best-Solve-ID fuer Frontend-Marker).
- GET /stats/by-cube → Stats pro Cube-Type, fuer Multi-Cube-Vergleich.
  Liefert pro cube_type: count, current_ao5, mean_ms, best_ms und
  einen „form_factor" = current_ao5 / mean_ms (kleiner = aktuell besser
  als Gesamtdurchschnitt).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import Solve
from stats.calc import SolvePoint, compute_stats

router = APIRouter(prefix="/stats", tags=["stats"])

# Mindest-Solves pro Cube, damit form_factor sinnvoll ist (current_ao5 braucht
# 5, mean braucht ein paar mehr fuer Aussagekraft)
MIN_SOLVES_FOR_BY_CUBE = 5


@router.get("")
def get_stats(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Liefert Stats fuer die gefilterte Solve-Menge."""
    stmt = select(Solve).order_by(Solve.timestamp.asc())  # asc fuer "current ist letzte"
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)

    rows = db.scalars(stmt).all()
    points = [
        SolvePoint(
            time_ms=s.time_ms,
            dnf=s.dnf,
            plus_two=s.plus_two,
            solve_id=s.id,
        )
        for s in rows
    ]
    result = compute_stats(points)

    return {
        "count": result.count,
        "count_valid": result.count_valid,
        "count_dnf": result.count_dnf,
        "best_ms": result.best_ms,
        "best_solve_id": result.best_solve_id,
        "worst_ms": result.worst_ms,
        "worst_solve_id": result.worst_solve_id,
        "mean_ms": result.mean_ms,
        "current_ao5": result.current_ao5,
        "current_ao12": result.current_ao12,
        "current_ao100": result.current_ao100,
        "best_ao5": result.best_ao5,
        "best_ao12": result.best_ao12,
        "best_ao100": result.best_ao100,
        "filter": {"cube_type": cube_type, "session_id": session_id},
    }


@router.get("/by-cube")
def get_stats_by_cube(
    session_id: int | None = Query(default=None, description="Optional auf Session einschraenken"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats gruppiert pro Cube-Type — Basis fuer Multi-Cube-Vergleich.

    Pro Cube-Type werden geliefert:
      - count            : Anzahl aller Solves (inkl. DNF)
      - count_valid      : Anzahl valider Solves
      - current_ao5      : letzte 5 (oder None bei <5 validen)
      - mean_ms          : arithmetisches Mittel valider Solves
      - best_ms          : Best-Single
      - form_factor      : current_ao5 / mean_ms
                           ( < 1 = aktuell besser als Gesamtschnitt )
                           ( > 1 = aktuell schlechter           )

    Cubes mit weniger als MIN_SOLVES_FOR_BY_CUBE Solves werden uebersprungen.
    Sortierung: form_factor aufsteigend (beste aktuelle Form zuerst). Cubes
    ohne form_factor (zu wenige Solves fuer ao5) landen ans Ende.
    """
    stmt = select(Solve).order_by(Solve.timestamp.asc())
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    # Gruppieren nach cube_type, Reihenfolge (chronologisch) bewahren
    by_cube: dict[str, list[Solve]] = {}
    for s in rows:
        by_cube.setdefault(s.cube_type, []).append(s)

    cubes: list[dict[str, Any]] = []
    for cube_type, group in by_cube.items():
        if len(group) < MIN_SOLVES_FOR_BY_CUBE:
            continue
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        stats = compute_stats(points)

        # form_factor (lifetime): current_ao5 vs Schnitt aller Solves —
        # kann verzerrt sein bei kontinuierlicher Verbesserung (Lernkurve).
        form_factor: float | None = None
        if stats.current_ao5 is not None and stats.mean_ms is not None and stats.mean_ms > 0:
            form_factor = round(stats.current_ao5 / stats.mean_ms, 4)

        # form_factor_recent: current_ao5 vs Mittel der letzten 100 Solves
        # (oder weniger, wenn nicht so viele da sind, mind. die letzten 20).
        # Misst „Tagesform" statt „Lernkurve" — wenn current_ao5 schlechter
        # als die letzten Trainingseinheiten ist, ist das ein echtes Signal.
        form_factor_recent: float | None = None
        valid_recent = [p for p in points[-100:] if not p.dnf]
        if (
            stats.current_ao5 is not None
            and len(valid_recent) >= 20
            and len(valid_recent)
            > 5  # current_ao5 ist die letzten 5, vergleichsfenster muss groesser sein
        ):
            recent_mean = sum(p.effective_ms for p in valid_recent) / len(valid_recent)
            if recent_mean > 0:
                form_factor_recent = round(stats.current_ao5 / recent_mean, 4)

        cubes.append(
            {
                "cube_type": cube_type,
                "count": stats.count,
                "count_valid": stats.count_valid,
                "current_ao5": stats.current_ao5,
                "mean_ms": stats.mean_ms,
                "best_ms": stats.best_ms,
                "form_factor": form_factor,  # vs Lifetime-Mittel (Lernkurve)
                "form_factor_recent": form_factor_recent,  # vs letzte 100 (Tagesform)
            }
        )

    # Sortieren nach form_factor_recent (Tagesform), Fallback form_factor,
    # None ans Ende. Tagesform-basiert ist die ehrlichere Antwort auf
    # „in welchem Cube bist du gerade am besten?".
    def sort_key(c: dict[str, Any]) -> tuple[bool, float]:
        f = c["form_factor_recent"] if c["form_factor_recent"] is not None else c["form_factor"]
        return (f is None, f or 0)

    cubes.sort(key=sort_key)

    return {
        "cubes": cubes,
        "filter": {"session_id": session_id},
    }


@router.get("/temporal")
def get_temporal_stats(
    session_id: int | None = Query(default=None, description="Optional auf Session einschraenken"),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Aktivitaets-Stats fuer „heute" und „diese Woche" — pro Cube + gesamt.

    Kalender-Tag (UTC) und ISO-Woche (Mo-So). Liefert:
      - today: { count, count_per_cube, mean_ms (validiert), current_ao5 }
      - week:  same shape

    Datenbank-Datetimes sind im Repo per Konvention naive UTC.
    """
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    # Wochenstart (Montag) UTC
    week_start = today_start - timedelta(days=today_start.weekday())

    stmt = select(Solve).order_by(Solve.timestamp.asc())
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    def aggregate(filtered: list[Solve]) -> dict[str, Any]:
        per_cube: dict[str, int] = {}
        for s in filtered:
            per_cube[s.cube_type] = per_cube.get(s.cube_type, 0) + 1
        if not filtered:
            return {
                "count": 0,
                "count_per_cube": {},
                "mean_ms": None,
                "current_ao5": None,
            }
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in filtered
        ]
        valid = [p for p in points if not p.dnf]
        mean_ms = round(sum(p.effective_ms for p in valid) / len(valid)) if valid else None
        # current_ao5 nur sinnvoll innerhalb desselben Zeitraums + cube
        # → wir geben hier den Avg-Mittelwert ueber alle Cubes raus, weil
        # cube-spezifisches current_ao5 in der MultiCubeCompareCard sitzt.
        # Hier ist es eine grobe Tages/Wochen-Form.
        current_ao5_total = compute_stats(points).current_ao5
        return {
            "count": len(filtered),
            "count_per_cube": per_cube,
            "mean_ms": mean_ms,
            "current_ao5": current_ao5_total,
        }

    # Naive vergleichen mit naiv (DB hat keine TZ-Info bei import_cstimer)
    def to_naive(dt: datetime) -> datetime:
        return dt.replace(tzinfo=None) if dt.tzinfo else dt

    today_naive = to_naive(today_start)
    week_naive = to_naive(week_start)

    today_solves = [s for s in rows if s.timestamp >= today_naive]
    week_solves = [s for s in rows if s.timestamp >= week_naive]

    return {
        "today": aggregate(today_solves),
        "week": aggregate(week_solves),
        "filter": {"session_id": session_id},
    }

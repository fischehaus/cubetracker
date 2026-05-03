"""Stats-API.

Endpoints:
- GET /stats?cube_type=X&session_id=Y → vollstaendige Stats fuer
  die gefilterte Solve-Menge (Avg5/12/100, Best, Worst, Mean,
  current + best Averages, Best-Solve-ID fuer Frontend-Marker).
- GET /stats/by-cube → Stats pro Cube-Type, fuer Multi-Cube-Vergleich.
  Liefert form_factor (lifetime + recent), improvement_ms (letzte 50
  vs davor), last_solve_at + days_since_last (fuer Trainings-Reminder).
- GET /stats/by-session → Stats pro Session, fuer Multi-Session-Vergleich
  (Phase 6). Analog zu by-cube, aber Aggregation nach session_id.
- GET /stats/by-hardware?cube_type=X[&session_id=Y] → Stats pro
  Hardware-Eintrag innerhalb eines Cube-Types. Vergleich der
  verwendeten Cubes (z.B. Weilong v11 vs Gan 15 fuer 3x3).
- GET /stats/temporal → Aktivitaet heute + diese Woche.
- GET /stats/activity → Aggregierte Solve-Counts pro Periode
  (day/week/month) ueber einen waehlbaren Zeitraum. Gap-gefuellt,
  damit Charts kontinuierliche x-Achse haben.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

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

        # F12 Verbesserungs-Tracking: Mittel der letzten 50 vs Mittel der
        # 50 davorliegenden. Negativer Wert = Verbesserung (in ms).
        # Liefert auch Prozent-Verbesserung relativ zum „davor"-Mittel.
        improvement_ms: int | None = None
        improvement_pct: float | None = None
        valid_points = [p for p in points if not p.dnf]
        if len(valid_points) >= 100:
            last50 = valid_points[-50:]
            prev50 = valid_points[-100:-50]
            mean_last = sum(p.effective_ms for p in last50) / 50
            mean_prev = sum(p.effective_ms for p in prev50) / 50
            improvement_ms = round(mean_last - mean_prev)
            if mean_prev > 0:
                improvement_pct = round((mean_last - mean_prev) / mean_prev, 4)

        # F13 Trainings-Reminder: letzter Solve-Zeitstempel + Tage seit dann.
        # Naive datetime aus DB → in UTC-aware konvertieren fuer den Diff.
        last_solve_at_iso: str | None = None
        days_since_last: int | None = None
        if group:
            last_ts = group[-1].timestamp
            # DB-timestamps sind per Konvention naive UTC
            last_aware = last_ts.replace(tzinfo=UTC) if last_ts.tzinfo is None else last_ts
            days_since_last = (datetime.now(UTC) - last_aware).days
            last_solve_at_iso = last_aware.isoformat()

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
                "improvement_ms": improvement_ms,  # F12: letzte 50 vs davor 50
                "improvement_pct": improvement_pct,
                "last_solve_at": last_solve_at_iso,
                "days_since_last": days_since_last,  # F13: Trainings-Reminder
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


# ============================================================
# /stats/activity — Aggregierte Solve-Counts ueber Zeit
# ============================================================

Granularity = Literal["day", "week", "month"]


def _bucket_key_and_label(dt: datetime, gran: Granularity) -> tuple[Any, str]:
    """Bucket-Key (sortierbar, hashbar) + Label fuer einen Solve-Zeitstempel.

    - day:   key = date, label = ISO-date "YYYY-MM-DD"
    - week:  key = (iso_year, iso_week), label = "YYYY-Www"
    - month: key = (year, month), label = "YYYY-MM"
    """
    if gran == "day":
        d = dt.date()
        return d, d.isoformat()
    if gran == "week":
        y, w, _ = dt.isocalendar()
        return (y, w), f"{y}-W{w:02d}"
    return (dt.year, dt.month), f"{dt.year}-{dt.month:02d}"


def _all_buckets_in_range(from_d: date, to_d: date, gran: Granularity) -> list[tuple[Any, str]]:
    """Alle Bucket-Keys im Range, fuer Gap-Filling (auch leere Tage/Wochen/Monate)."""
    out: list[tuple[Any, str]] = []
    if gran == "day":
        d = from_d
        while d <= to_d:
            out.append((d, d.isoformat()))
            d += timedelta(days=1)
        return out
    if gran == "week":
        # Wir iterieren wochenweise von der ISO-Woche von from_d bis to_d.
        cur_y, cur_w, _ = from_d.isocalendar()
        end_y, end_w, _ = to_d.isocalendar()
        while (cur_y, cur_w) <= (end_y, end_w):
            out.append(((cur_y, cur_w), f"{cur_y}-W{cur_w:02d}"))
            # Naechste Woche: spring 7 Tage vom Montag dieser Woche
            mon = date.fromisocalendar(cur_y, cur_w, 1)
            nxt = mon + timedelta(days=7)
            cur_y, cur_w, _ = nxt.isocalendar()
        return out
    # month
    cur_y, cur_m = from_d.year, from_d.month
    end_y, end_m = to_d.year, to_d.month
    while (cur_y, cur_m) <= (end_y, end_m):
        out.append(((cur_y, cur_m), f"{cur_y}-{cur_m:02d}"))
        cur_m += 1
        if cur_m > 12:
            cur_m = 1
            cur_y += 1
    return out


@router.get("/activity")
def get_activity(
    granularity: Granularity = Query("day", description="day | week | month"),
    days: int = Query(30, ge=1, le=10000, description="Lookback in Tagen (max 10000 ~ 27 Jahre)"),
    cube_type: str | None = Query(default=None),
    session_id: int | None = Query(default=None),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Aggregierte Solve-Counts pro Periode ueber den gewaehlten Zeitraum.

    Gap-gefuellt: leere Tage/Wochen/Monate werden mit count=0 zurueckgegeben,
    damit Bar-Charts eine kontinuierliche x-Achse haben.
    """
    # Naive UTC fuer DB-Vergleich (DB-Konvention)
    now = datetime.now(UTC).replace(tzinfo=None)
    to_d = now.date()
    from_d = to_d - timedelta(days=days - 1)
    from_dt = datetime(from_d.year, from_d.month, from_d.day)

    stmt = select(Solve).where(Solve.timestamp >= from_dt)
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    # Pre-fill alle Buckets mit 0
    all_buckets = _all_buckets_in_range(from_d, to_d, granularity)
    counts: dict[Any, dict[str, int]] = {
        key: {"count": 0, "count_valid": 0, "count_dnf": 0} for key, _ in all_buckets
    }

    for s in rows:
        key, _ = _bucket_key_and_label(s.timestamp, granularity)
        if key in counts:  # Sicherheits-check (sollte immer drin sein)
            counts[key]["count"] += 1
            if s.dnf:
                counts[key]["count_dnf"] += 1
            else:
                counts[key]["count_valid"] += 1

    buckets = [
        {
            "period": label,
            "count": counts[key]["count"],
            "count_valid": counts[key]["count_valid"],
            "count_dnf": counts[key]["count_dnf"],
        }
        for key, label in all_buckets
    ]
    total = sum(b["count"] for b in buckets)

    return {
        "granularity": granularity,
        "from": from_d.isoformat(),
        "to": to_d.isoformat(),
        "buckets": buckets,
        "total_count": total,
        "filter": {"cube_type": cube_type, "session_id": session_id},
    }


# ============================================================
# /stats/by-hardware — Hardware-Performance-Vergleich (Phase 5d)
# ============================================================


@router.get("/by-hardware")
def get_stats_by_hardware(
    cube_type: str = Query(
        ..., description="Cube-Type — Pflicht, sonst macht der Vergleich keinen Sinn"
    ),
    session_id: int | None = Query(default=None),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats gruppiert pro Hardware-Eintrag innerhalb eines Cube-Types.

    Antwort auf „mit welchem meiner 3x3-Cubes bin ich am schnellsten?".
    Solves ohne hardware_id werden als eigene Pseudo-Gruppe „Ohne Hardware"
    gefuehrt — sonst sieht der User csTimer-Importe nicht (die haben kein
    hardware_id).

    Pro Hardware geliefert:
      - hardware_id (oder null fuer „Ohne Hardware")
      - hardware_name
      - count, count_valid
      - mean_ms, best_ms, current_ao5, best_ao5

    Sortierung: Best-PB aufsteigend (schnellster Cube zuerst). Eintraege
    ohne best_ms (alle DNF) ans Ende.
    """
    from db.models import Hardware

    stmt = select(Solve).where(Solve.cube_type == cube_type).order_by(Solve.timestamp.asc())
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    # Hardware-name-lookup fuer hardware_id im Output
    hw_names: dict[int, str] = {h.id: h.name for h in db.scalars(select(Hardware)).all()}

    # Gruppieren nach hardware_id (None = „Ohne Hardware")
    grouped: dict[int | None, list[Solve]] = {}
    for s in rows:
        grouped.setdefault(s.hardware_id, []).append(s)

    out: list[dict[str, Any]] = []
    for hw_id, group in grouped.items():
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        stats = compute_stats(points)
        name = "Ohne Hardware" if hw_id is None else hw_names.get(hw_id, f"Hardware #{hw_id}")
        out.append(
            {
                "hardware_id": hw_id,
                "hardware_name": name,
                "count": stats.count,
                "count_valid": stats.count_valid,
                "mean_ms": stats.mean_ms,
                "best_ms": stats.best_ms,
                "current_ao5": stats.current_ao5,
                "best_ao5": stats.best_ao5,
            }
        )

    # Sortieren: best_ms ASC, None ans Ende
    out.sort(key=lambda h: (h["best_ms"] is None, h["best_ms"] or 0))

    return {
        "cube_type": cube_type,
        "filter": {"session_id": session_id},
        "hardware": out,
    }


# ============================================================
# /stats/by-session — Multi-Session-Vergleich (Phase 6)
# ============================================================

# Mindest-Solves pro Session, damit form_factor sinnvoll ist (analog zu by-cube)
MIN_SOLVES_FOR_BY_SESSION = 5


@router.get("/by-session")
def get_stats_by_session(
    cube_type: str | None = Query(
        default=None, description="Optional auf einen Cube-Type einschraenken"
    ),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats gruppiert pro Session — fuer Multi-Session-Vergleich im Dashboard.

    Antwort auf „in welcher Session bin ich gerade in welcher Form?".
    Analog zu /stats/by-cube, aber Aggregation nach session_id (Solves
    ohne session_id werden uebersprungen — ohne Session ist kein
    sinnvoller Vergleichs-Eintrag).

    Optional cube_type-Filter — sinnvoll wenn Sessions verschiedene
    Cubes mischen und User nur 3x3-Performance pro Session sehen will.
    """
    from db.models import Session as DbSession

    stmt = select(Solve).where(Solve.session_id.is_not(None)).order_by(Solve.timestamp.asc())
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    rows = db.scalars(stmt).all()

    # Session-name-lookup
    session_names: dict[int, str] = {s.id: s.name for s in db.scalars(select(DbSession)).all()}

    # Gruppieren nach session_id
    by_session: dict[int, list[Solve]] = {}
    for s in rows:
        if s.session_id is None:
            continue
        by_session.setdefault(s.session_id, []).append(s)

    out: list[dict[str, Any]] = []
    for session_id, group in by_session.items():
        if len(group) < MIN_SOLVES_FOR_BY_SESSION:
            continue
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        stats = compute_stats(points)

        form_factor: float | None = None
        if stats.current_ao5 is not None and stats.mean_ms is not None and stats.mean_ms > 0:
            form_factor = round(stats.current_ao5 / stats.mean_ms, 4)

        form_factor_recent: float | None = None
        valid_recent = [p for p in points[-100:] if not p.dnf]
        if stats.current_ao5 is not None and len(valid_recent) >= 20 and len(valid_recent) > 5:
            recent_mean = sum(p.effective_ms for p in valid_recent) / len(valid_recent)
            if recent_mean > 0:
                form_factor_recent = round(stats.current_ao5 / recent_mean, 4)

        # Last solve + days_since_last (analog zu by-cube)
        last_solve_at_iso: str | None = None
        days_since_last: int | None = None
        if group:
            last_ts = group[-1].timestamp
            last_aware = last_ts.replace(tzinfo=UTC) if last_ts.tzinfo is None else last_ts
            days_since_last = (datetime.now(UTC) - last_aware).days
            last_solve_at_iso = last_aware.isoformat()

        out.append(
            {
                "session_id": session_id,
                "session_name": session_names.get(session_id, f"Session #{session_id}"),
                "count": stats.count,
                "count_valid": stats.count_valid,
                "current_ao5": stats.current_ao5,
                "mean_ms": stats.mean_ms,
                "best_ms": stats.best_ms,
                "form_factor": form_factor,
                "form_factor_recent": form_factor_recent,
                "last_solve_at": last_solve_at_iso,
                "days_since_last": days_since_last,
            }
        )

    # Sortieren: form_factor_recent asc (beste Form zuerst), Fallback form_factor
    def sort_key(s: dict[str, Any]) -> tuple[bool, float]:
        f = s["form_factor_recent"] if s["form_factor_recent"] is not None else s["form_factor"]
        return (f is None, f or 0)

    out.sort(key=sort_key)

    return {
        "filter": {"cube_type": cube_type},
        "sessions": out,
    }

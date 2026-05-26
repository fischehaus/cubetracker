"""Stats-API (Phase W) — Multi-User-Variante.

ALLE Queries filtern auf user_id == current_user.id. Pro-User-Stats:
- /stats                   — Gesamt-Stats (mit optionalen Filtern)
- /stats/by-cube           — pro Cube-Type
- /stats/by-session        — pro Session
- /stats/by-hardware       — pro Hardware-Eintrag innerhalb eines Cubes
- /stats/temporal          — heute + diese Woche
- /stats/activity          — Aggregierte Solve-Counts über Zeit
- /stats/by-alg-case       — pro PLL/OLL-Case (Algorithm-Trainer)
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from db.database import get_db
from db.models import Hardware, Session as DbSession, Solve, User
from stats.calc import SolvePoint, compute_stats, pb_history

router = APIRouter(prefix="/stats", tags=["stats"])

MIN_SOLVES_FOR_BY_CUBE = 5
MIN_SOLVES_FOR_BY_SESSION = 5


@router.get("")
def get_stats(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Gesamt-Stats für die gefilterte Solve-Menge des aktuellen Users."""
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .order_by(Solve.timestamp.asc())
    )
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)

    rows = db.scalars(stmt).all()
    points = [
        SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id) for s in rows
    ]
    result = compute_stats(points)

    by_id = {s.id: s for s in rows}

    def _ts(sid: int | None) -> str | None:
        if sid is None:
            return None
        s = by_id.get(sid)
        if s is None or s.timestamp is None:
            return None
        ts = s.timestamp
        ts_aware = ts.replace(tzinfo=UTC) if ts.tzinfo is None else ts
        return ts_aware.isoformat()

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
        "best_ao5_solve_id": result.best_ao5_solve_id,
        "best_ao12_solve_id": result.best_ao12_solve_id,
        "best_ao100_solve_id": result.best_ao100_solve_id,
        "best_ao5_at": _ts(result.best_ao5_solve_id),
        "best_ao12_at": _ts(result.best_ao12_solve_id),
        "best_ao100_at": _ts(result.best_ao100_solve_id),
        "pb_solve_ids": result.pb_solve_ids,
        "ao5_pb_solve_ids": result.ao5_pb_solve_ids,
        "ao12_pb_solve_ids": result.ao12_pb_solve_ids,
        "filter": {"cube_type": cube_type, "session_id": session_id},
    }


@router.get("/pb-history")
def get_pb_history(
    cube_type: str | None = Query(default=None, description="Filter auf Cube-Type"),
    session_id: int | None = Query(default=None, description="Filter auf Session-ID"),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """PB-Progression (Single + ao5 + ao12) fuer die Visualisierung im ANALYSE-Tab.

    Liefert pro Metrik die Rekord-Punkte mit aufgeloestem Timestamp, chronologisch.
    Filter wie /stats (cube_type, session_id). Pro User.
    """
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .order_by(Solve.timestamp.asc())
    )
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    points = [
        SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id) for s in rows
    ]
    hist = pb_history(points)

    by_id = {s.id: s for s in rows}

    def _ts(sid: int) -> str | None:
        s = by_id.get(sid)
        if s is None or s.timestamp is None:
            return None
        ts = s.timestamp
        ts_aware = ts.replace(tzinfo=UTC) if ts.tzinfo is None else ts
        return ts_aware.isoformat()

    def _series(pairs: list[tuple[int, int]]) -> list[dict[str, Any]]:
        return [{"solve_id": sid, "ms": ms, "at": _ts(sid)} for sid, ms in pairs]

    return {
        "single": _series(hist.single),
        "ao5": _series(hist.ao5),
        "ao12": _series(hist.ao12),
        "filter": {"cube_type": cube_type, "session_id": session_id},
    }


@router.get("/recent-pbs")
def get_recent_pbs(
    limit: int = Query(5, ge=1, le=50, description="Max. Anzahl der zurueckgegebenen PB-Events."),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Letzte N PB-Ereignisse (Single + ao5 + ao12) ueber ALLE Cube-Types
    des Users, chronologisch absteigend nach Setzdatum (W.recent-pbs).

    Pro Event: kind ("single"|"ao5"|"ao12"), cube_type, solve_id, ms,
    at (ISO-timestamp), delta_ms_vs_prev (None beim ersten PB der Metrik).

    Berechnung: pro Cube-Type wird die volle pb_history (alle 3 Metriken)
    erzeugt, alle Events werden zusammengefuehrt und nach `at` DESC sortiert.
    Top-N wird zurueckgegeben.
    """
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .order_by(Solve.timestamp.asc())
    )
    rows = list(db.scalars(stmt).all())

    by_id = {s.id: s for s in rows}

    def _ts(sid: int) -> str | None:
        s = by_id.get(sid)
        if s is None or s.timestamp is None:
            return None
        ts = s.timestamp
        ts_aware = ts.replace(tzinfo=UTC) if ts.tzinfo is None else ts
        return ts_aware.isoformat()

    by_cube: dict[str, list[Solve]] = {}
    for s in rows:
        by_cube.setdefault(s.cube_type, []).append(s)

    events: list[dict[str, Any]] = []
    for cube_type, group in by_cube.items():
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        hist = pb_history(points)

        for kind, series in (
            ("single", hist.single),
            ("ao5", hist.ao5),
            ("ao12", hist.ao12),
        ):
            prev_ms: int | None = None
            for sid, ms in series:
                delta = None if prev_ms is None else (prev_ms - ms)
                events.append(
                    {
                        "kind": kind,
                        "cube_type": cube_type,
                        "solve_id": sid,
                        "ms": int(ms),
                        "at": _ts(sid),
                        "delta_ms_vs_prev": delta,
                    }
                )
                prev_ms = ms

    # Nach Datum absteigend; Events ohne Timestamp landen hinten.
    events.sort(key=lambda e: e["at"] or "", reverse=True)
    events = events[:limit]

    return {"events": events, "count": len(events), "limit": limit}


@router.get("/by-cube")
def get_stats_by_cube(
    session_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats gruppiert pro Cube-Type — Multi-Cube-Vergleich (eigene Solves)."""
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .order_by(Solve.timestamp.asc())
    )
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

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

        form_factor: float | None = None
        if stats.current_ao5 is not None and stats.mean_ms is not None and stats.mean_ms > 0:
            form_factor = round(stats.current_ao5 / stats.mean_ms, 4)

        form_factor_recent: float | None = None
        valid_recent = [p for p in points[-100:] if not p.dnf]
        if (
            stats.current_ao5 is not None
            and len(valid_recent) >= 20
            and len(valid_recent) > 5
        ):
            recent_mean = sum(p.effective_ms for p in valid_recent) / len(valid_recent)
            if recent_mean > 0:
                form_factor_recent = round(stats.current_ao5 / recent_mean, 4)

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

        last_solve_at_iso: str | None = None
        days_since_last: int | None = None
        if group:
            last_ts = group[-1].timestamp
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
                "form_factor": form_factor,
                "form_factor_recent": form_factor_recent,
                "improvement_ms": improvement_ms,
                "improvement_pct": improvement_pct,
                "last_solve_at": last_solve_at_iso,
                "days_since_last": days_since_last,
            }
        )

    def sort_key(c: dict[str, Any]) -> tuple[bool, float]:
        f = c["form_factor_recent"] if c["form_factor_recent"] is not None else c["form_factor"]
        return (f is None, f or 0)

    cubes.sort(key=sort_key)
    return {"cubes": cubes, "filter": {"session_id": session_id}}


@router.get("/temporal")
def get_temporal_stats(
    session_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Heute + diese Woche, eigene Solves."""
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    week_start = today_start - timedelta(days=today_start.weekday())

    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .order_by(Solve.timestamp.asc())
    )
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    def aggregate(filtered: list[Solve]) -> dict[str, Any]:
        per_cube: dict[str, int] = {}
        for s in filtered:
            per_cube[s.cube_type] = per_cube.get(s.cube_type, 0) + 1
        if not filtered:
            return {"count": 0, "count_per_cube": {}, "mean_ms": None, "current_ao5": None}
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in filtered
        ]
        valid = [p for p in points if not p.dnf]
        mean_ms = round(sum(p.effective_ms for p in valid) / len(valid)) if valid else None
        current_ao5_total = compute_stats(points).current_ao5
        return {
            "count": len(filtered),
            "count_per_cube": per_cube,
            "mean_ms": mean_ms,
            "current_ao5": current_ao5_total,
        }

    # Postgres liefert aware timestamps; SQLite liefert naive. Wir
    # normalisieren beide Seiten auf aware (UTC), dann ist der Vergleich safe.
    def to_aware(dt: datetime) -> datetime:
        return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt

    today_solves = [s for s in rows if to_aware(s.timestamp) >= today_start]
    week_solves = [s for s in rows if to_aware(s.timestamp) >= week_start]

    return {
        "today": aggregate(today_solves),
        "week": aggregate(week_solves),
        "filter": {"session_id": session_id},
    }


# ============================================================
# /stats/activity
# ============================================================

Granularity = Literal["day", "week", "month"]


def _bucket_key_and_label(dt: datetime, gran: Granularity) -> tuple[Any, str]:
    if gran == "day":
        d = dt.date()
        return d, d.isoformat()
    if gran == "week":
        y, w, _ = dt.isocalendar()
        return (y, w), f"{y}-W{w:02d}"
    return (dt.year, dt.month), f"{dt.year}-{dt.month:02d}"


def _all_buckets_in_range(from_d: date, to_d: date, gran: Granularity) -> list[tuple[Any, str]]:
    out: list[tuple[Any, str]] = []
    if gran == "day":
        d = from_d
        while d <= to_d:
            out.append((d, d.isoformat()))
            d += timedelta(days=1)
        return out
    if gran == "week":
        cur_y, cur_w, _ = from_d.isocalendar()
        end_y, end_w, _ = to_d.isocalendar()
        while (cur_y, cur_w) <= (end_y, end_w):
            out.append(((cur_y, cur_w), f"{cur_y}-W{cur_w:02d}"))
            mon = date.fromisocalendar(cur_y, cur_w, 1)
            nxt = mon + timedelta(days=7)
            cur_y, cur_w, _ = nxt.isocalendar()
        return out
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
    granularity: Granularity = Query("day"),
    days: int = Query(30, ge=1, le=10000),
    cube_type: str | None = Query(default=None),
    session_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Aggregierte Solve-Counts pro Periode, eigene Solves, gap-gefuellt."""
    # UTC-aware für Postgres-Kompatibilitaet
    now = datetime.now(UTC)
    to_d = now.date()
    from_d = to_d - timedelta(days=days - 1)
    from_dt = datetime(from_d.year, from_d.month, from_d.day, tzinfo=UTC)

    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .where(Solve.timestamp >= from_dt)
    )
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    all_buckets = _all_buckets_in_range(from_d, to_d, granularity)
    counts: dict[Any, dict[str, int]] = {
        key: {"count": 0, "count_valid": 0, "count_dnf": 0} for key, _ in all_buckets
    }

    for s in rows:
        key, _ = _bucket_key_and_label(s.timestamp, granularity)
        if key in counts:
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


@router.get("/by-hardware")
def get_stats_by_hardware(
    cube_type: str = Query(...),
    session_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats pro Hardware innerhalb eines Cube-Types — eigene only."""
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .where(Solve.cube_type == cube_type)
        .order_by(Solve.timestamp.asc())
    )
    if session_id is not None:
        stmt = stmt.where(Solve.session_id == session_id)
    rows = db.scalars(stmt).all()

    hw_names: dict[int, str] = {
        h.id: h.name
        for h in db.scalars(
            select(Hardware).where(Hardware.user_id == current_user.id)
        ).all()
    }

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
                "current_ao12": stats.current_ao12,
                "best_ao12": stats.best_ao12,
            }
        )

    out.sort(key=lambda h: (h["best_ms"] is None, h["best_ms"] or 0))
    return {"cube_type": cube_type, "filter": {"session_id": session_id}, "hardware": out}


@router.get("/by-session")
def get_stats_by_session(
    cube_type: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Stats pro Session — eigene only."""
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .where(Solve.session_id.is_not(None))
        .order_by(Solve.timestamp.asc())
    )
    if cube_type is not None:
        stmt = stmt.where(Solve.cube_type == cube_type)
    rows = db.scalars(stmt).all()

    session_names: dict[int, str] = {
        s.id: s.name
        for s in db.scalars(
            select(DbSession).where(DbSession.user_id == current_user.id)
        ).all()
    }

    by_session: dict[int, list[Solve]] = {}
    for s in rows:
        if s.session_id is None:
            continue
        by_session.setdefault(s.session_id, []).append(s)

    out: list[dict[str, Any]] = []
    for session_id_, group in by_session.items():
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
        if (
            stats.current_ao5 is not None
            and len(valid_recent) >= 20
            and len(valid_recent) > 5
        ):
            recent_mean = sum(p.effective_ms for p in valid_recent) / len(valid_recent)
            if recent_mean > 0:
                form_factor_recent = round(stats.current_ao5 / recent_mean, 4)

        last_solve_at_iso: str | None = None
        days_since_last: int | None = None
        if group:
            last_ts = group[-1].timestamp
            last_aware = last_ts.replace(tzinfo=UTC) if last_ts.tzinfo is None else last_ts
            days_since_last = (datetime.now(UTC) - last_aware).days
            last_solve_at_iso = last_aware.isoformat()

        out.append(
            {
                "session_id": session_id_,
                "session_name": session_names.get(session_id_, f"Session #{session_id_}"),
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

    def sort_key(s: dict[str, Any]) -> tuple[bool, float]:
        f = s["form_factor_recent"] if s["form_factor_recent"] is not None else s["form_factor"]
        return (f is None, f or 0)

    out.sort(key=sort_key)
    return {"filter": {"cube_type": cube_type}, "sessions": out}


@router.get("/by-alg-case")
def get_stats_by_alg_case(
    subset: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    """Per-case-Stats für alg_case-Tags — eigene only."""
    prefix = f"{subset}-"
    stmt = (
        select(Solve)
        .where(Solve.user_id == current_user.id)
        .where(Solve.alg_case.is_not(None))
        .where(Solve.alg_case.startswith(prefix))
        .order_by(Solve.timestamp.asc())
    )
    rows = list(db.scalars(stmt).all())

    groups: dict[str, list[Solve]] = {}
    for s in rows:
        if s.alg_case is None:
            continue
        groups.setdefault(s.alg_case, []).append(s)

    out: list[dict[str, Any]] = []
    for case_id, solves in groups.items():
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in solves
        ]
        stats = compute_stats(points)
        last_solve = solves[-1]
        last_ts = last_solve.timestamp
        last_aware = last_ts.replace(tzinfo=UTC) if last_ts.tzinfo is None else last_ts
        out.append(
            {
                "alg_case": case_id,
                "count": stats.count,
                "count_valid": stats.count_valid,
                "mean_ms": stats.mean_ms,
                "best_ms": stats.best_ms,
                "current_ao5": stats.current_ao5,
                "last_solve_at": last_aware.isoformat(),
            }
        )

    def sort_key(s: dict[str, Any]) -> tuple[bool, float]:
        v = s["current_ao5"]
        return (v is None, -(v or 0))

    out.sort(key=sort_key)
    return {"filter": {"subset": subset}, "cases": out}

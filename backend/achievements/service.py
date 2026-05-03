"""Achievement-Service: bridge zwischen DB und pure check-funktion.

Verantwortlich fuer:
- DB-Snapshot bauen (AchievementInput aus aktuellen DB-zustaenden)
- check_achievements aufrufen
- diff zur DB → neue Eintraege inserten
- liste der NEU unlockten codes zurueckgeben (fuer toast/notification)
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from db.models import Achievement, Hardware, Solve

from .check import AchievementInput, check_achievements


def _build_snapshot(db: OrmSession) -> AchievementInput:
    """Baut den AchievementInput aus DB-queries.

    Eine handvoll SQL-aggregations — bei 6200 solves <50ms.
    """
    total_solves = db.scalar(select(func.count(Solve.id))) or 0
    total_valid = db.scalar(select(func.count(Solve.id)).where(Solve.dnf.is_(False))) or 0

    # solves_per_cube (nur valide, fuer faires count gegen achievement-thresholds)
    rows = db.execute(
        select(Solve.cube_type, func.count(Solve.id))
        .where(Solve.dnf.is_(False))
        .group_by(Solve.cube_type)
    ).all()
    solves_per_cube: dict[str, int] = {r[0]: int(r[1]) for r in rows}

    # best_ms_per_cube — effective ms (time_ms + 2000 wenn plus_two)
    # Wir holen alle valid solves und rechnen client-seitig — bei 6k zeilen
    # immer noch sub-100ms und der SQL waere mit case-when haesslich
    best_per_cube: dict[str, int] = {}
    for s in db.scalars(select(Solve).where(Solve.dnf.is_(False))).all():
        eff = s.time_ms + (2000 if s.plus_two else 0)
        cur = best_per_cube.get(s.cube_type)
        if cur is None or eff < cur:
            best_per_cube[s.cube_type] = eff

    # distinct cube-types (auch bei nur DNF zaehlt der Cube-Type als „getestet")
    distinct_cubes = db.scalar(select(func.count(distinct(Solve.cube_type)))) or 0

    hardware_count = db.scalar(select(func.count(Hardware.id))) or 0

    # Phase 8.5: Tages-Volume-Aggregation
    # Wir gruppieren nach DATE(timestamp) + cube_type → counts, dann
    # nehmen pro cube den maximalen Tageswert.
    day_rows = db.execute(
        select(
            func.date(Solve.timestamp).label("day"),
            Solve.cube_type,
            func.count(Solve.id),
        )
        .where(Solve.dnf.is_(False))
        .group_by("day", Solve.cube_type)
    ).all()

    max_per_cube: dict[str, int] = {}
    per_day_total: dict[str, int] = {}  # day → total count over all cubes
    days_with_3x3_100plus: set[str] = set()
    all_active_days: set[str] = set()
    for day, cube_type, cnt in day_rows:
        cnt = int(cnt)
        day_str = str(day)
        cur = max_per_cube.get(cube_type, 0)
        if cnt > cur:
            max_per_cube[cube_type] = cnt
        per_day_total[day_str] = per_day_total.get(day_str, 0) + cnt
        if cube_type == "3x3" and cnt >= 100:
            days_with_3x3_100plus.add(day_str)
        all_active_days.add(day_str)

    max_one_day_any = max(per_day_total.values(), default=0)

    # Phase 8.5: Streak-Detection.
    max_consec_3x3_100 = _longest_consecutive_day_streak(days_with_3x3_100plus)
    max_solve_streak = _longest_consecutive_day_streak(all_active_days)

    return AchievementInput(
        total_solves=int(total_solves),
        total_valid_solves=int(total_valid),
        solves_per_cube=solves_per_cube,
        best_ms_per_cube=best_per_cube,
        distinct_cube_types=int(distinct_cubes),
        hardware_count=int(hardware_count),
        max_solves_one_day_per_cube=max_per_cube,
        max_solves_one_day_any=max_one_day_any,
        max_consecutive_days_3x3_100plus=max_consec_3x3_100,
        max_solve_streak_days=max_solve_streak,
    )


def _longest_consecutive_day_streak(date_strings: set[str]) -> int:
    """Pure helper: nimmt eine Menge ISO-date-Strings (YYYY-MM-DD) und
    liefert die laengste Streak von aufeinanderfolgenden Tagen.

    Beispiel: {2026-01-01, 2026-01-02, 2026-01-03, 2026-01-05} → 3.
    """
    if not date_strings:
        return 0
    days = sorted(date.fromisoformat(d) for d in date_strings)
    longest = 1
    current = 1
    for i in range(1, len(days)):
        if days[i] - days[i - 1] == timedelta(days=1):
            current += 1
            if current > longest:
                longest = current
        else:
            current = 1
    return longest


def run_achievement_check(db: OrmSession) -> list[str]:
    """Vollst. check + DB-update. Liefert codes der NEU unlockten Achievements.

    Idempotent: wenn alle bereits unlocked, liefert leere Liste.
    Wird automatisch nach jeder Solve-Mutation und beim Achievement-Recheck
    aufgerufen.
    """
    snapshot = _build_snapshot(db)
    should_be_unlocked = set(check_achievements(snapshot))

    already_unlocked = {a.code for a in db.scalars(select(Achievement)).all()}
    new_codes = should_be_unlocked - already_unlocked

    for code in new_codes:
        db.add(Achievement(code=code))
    if new_codes:
        db.commit()

    return sorted(new_codes)

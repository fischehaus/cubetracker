"""Achievement-Service (Phase W) — Multi-User-Variante.

Bridge zwischen DB und pure check-funktion. ALLE DB-Queries filtern
auf user_id; jeder User hat seine eigene Achievement-Sammlung.
"""

from __future__ import annotations

import math
from datetime import date, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from db.models import Achievement, Hardware, Solve

from .check import AchievementInput, check_achievements
from .patterns import ChronoSolve, detect_patterns, merge_patterns


def _build_snapshot(db: OrmSession, user_id: int) -> AchievementInput:
    """Baut den AchievementInput aus DB-queries fuer einen User."""
    total_solves = (
        db.scalar(select(func.count(Solve.id)).where(Solve.user_id == user_id)) or 0
    )
    total_valid = (
        db.scalar(
            select(func.count(Solve.id))
            .where(Solve.user_id == user_id)
            .where(Solve.dnf.is_(False))
        )
        or 0
    )

    rows = db.execute(
        select(Solve.cube_type, func.count(Solve.id))
        .where(Solve.user_id == user_id)
        .where(Solve.dnf.is_(False))
        .group_by(Solve.cube_type)
    ).all()
    solves_per_cube: dict[str, int] = {r[0]: int(r[1]) for r in rows}

    best_per_cube: dict[str, int] = {}
    for s in db.scalars(
        select(Solve).where(Solve.user_id == user_id).where(Solve.dnf.is_(False))
    ).all():
        eff = s.time_ms + (2000 if s.plus_two else 0)
        cur = best_per_cube.get(s.cube_type)
        if cur is None or eff < cur:
            best_per_cube[s.cube_type] = eff

    distinct_cubes = (
        db.scalar(
            select(func.count(distinct(Solve.cube_type))).where(Solve.user_id == user_id)
        )
        or 0
    )

    hardware_count = (
        db.scalar(select(func.count(Hardware.id)).where(Hardware.user_id == user_id)) or 0
    )

    day_rows = db.execute(
        select(
            func.date(Solve.timestamp).label("day"),
            Solve.cube_type,
            func.count(Solve.id),
        )
        .where(Solve.user_id == user_id)
        .where(Solve.dnf.is_(False))
        .group_by("day", Solve.cube_type)
    ).all()

    max_per_cube: dict[str, int] = {}
    per_day_total: dict[str, int] = {}
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
    max_consec_3x3_100 = _longest_consecutive_day_streak(days_with_3x3_100plus)
    max_solve_streak = _longest_consecutive_day_streak(all_active_days)

    pattern_results = []
    all_solves_chrono = list(
        db.scalars(
            select(Solve).where(Solve.user_id == user_id).order_by(Solve.timestamp.asc())
        ).all()
    )
    by_cube_chrono: dict[str, list[ChronoSolve]] = {}
    for s in all_solves_chrono:
        if s.timestamp is None:
            continue
        eff = math.inf if s.dnf else float(s.time_ms + (2000 if s.plus_two else 0))
        by_cube_chrono.setdefault(s.cube_type, []).append(
            ChronoSolve(
                day=s.timestamp.date(),
                effective_ms=eff,
                dnf=s.dnf,
                plus_two=s.plus_two,
                time_ms=s.time_ms,
            )
        )
    for chrono_solves in by_cube_chrono.values():
        pattern_results.append(detect_patterns(chrono_solves))
    merged_patterns = merge_patterns(pattern_results)

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
        had_pb_double=merged_patterns.had_pb_double,
        had_pb_synchronized=merged_patterns.had_pb_synchronized,
        had_pb_triple_day=merged_patterns.had_pb_triple_day,
        had_5_consecutive_under_ao12=merged_patterns.had_5_consecutive_under_ao12,
    )


def _longest_consecutive_day_streak(date_strings: set[str]) -> int:
    """Pure helper — laengste aufeinanderfolgende Tage-Streak."""
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


RECHECK_SOLVE_CAP = 200_000


def run_achievement_check(db: OrmSession, user_id: int) -> list[str]:
    """Vollst. check + DB-update fuer einen User. Liefert codes der
    NEU unlockten Achievements.

    Idempotent: wenn alle bereits unlocked, liefert leere Liste.

    Security-Fix W.5-finding-2: Soft-Cap bei RECHECK_SOLVE_CAP.
    `_build_snapshot` macht zwei volle in-Memory-Loads aller User-Solves,
    plus pro-Cube chronologische Sortierung. Bei sehr grossen Mengen
    (>200k Solves) blockiert das den FastAPI-Worker mehrere Sekunden.
    Bei Ueberschreitung: skip + leere Liste — der User kann manuell via
    POST /achievements/recheck triggern (bewusst, akzeptiert Wartezeit).
    """
    total_solves = (
        db.scalar(
            select(func.count(Solve.id)).where(Solve.user_id == user_id)
        )
        or 0
    )
    if total_solves > RECHECK_SOLVE_CAP:
        # Skip — zu teuer fuer synchronen Recheck. User kann manuell.
        return []

    snapshot = _build_snapshot(db, user_id)
    should_be_unlocked = set(check_achievements(snapshot))

    already_unlocked = {
        a.code
        for a in db.scalars(select(Achievement).where(Achievement.user_id == user_id)).all()
    }
    new_codes = should_be_unlocked - already_unlocked

    for code in new_codes:
        db.add(Achievement(user_id=user_id, code=code))
    if new_codes:
        db.commit()

    return sorted(new_codes)

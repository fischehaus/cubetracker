"""Challenge-Service (Phase W) — Multi-User-Variante.

Bridge zwischen DB und pure layer. ALLE Queries filtern auf user_id;
jeder User hat seine eigenen Daily Challenges.
"""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from db.models import Challenge, Solve

from .generator import GeneratorInput, generate_daily_challenges
from .tracker import ChallengeState, SolveSnapshot, update_progress_for_solve

ACTIVE_DAYS_WINDOW = 30


def _today_start_naive_utc() -> datetime:
    now = datetime.now(UTC)
    return datetime(now.year, now.month, now.day)


def _today_date() -> date:
    return datetime.now(UTC).date()


def _build_generator_snapshot(db: OrmSession, user_id: int) -> GeneratorInput:
    """Snapshot fuer den Generator aus DB-queries (user-scoped)."""
    now = datetime.now(UTC).replace(tzinfo=None)
    window_start = now - timedelta(days=ACTIVE_DAYS_WINDOW)

    rows_recent = list(
        db.scalars(
            select(Solve)
            .where(Solve.user_id == user_id)
            .where(Solve.timestamp >= window_start)
        ).all()
    )
    distinct_days = {s.timestamp.date() for s in rows_recent}
    n_active_days = len(distinct_days)
    avg_per_day = round(len(rows_recent) / n_active_days) if n_active_days > 0 else 0

    counts: dict[str, int] = {}
    for s in rows_recent:
        if not s.dnf:
            counts[s.cube_type] = counts.get(s.cube_type, 0) + 1
    most_active = max(counts, key=lambda c: counts[c]) if counts else None

    best_per_cube: dict[str, int] = {}
    for s in db.scalars(
        select(Solve).where(Solve.user_id == user_id).where(Solve.dnf.is_(False))
    ).all():
        eff = s.time_ms + (2000 if s.plus_two else 0)
        if best_per_cube.get(s.cube_type, 99_999_999) > eff:
            best_per_cube[s.cube_type] = eff

    last_per_cube: dict[str, datetime] = {}
    for s in db.scalars(select(Solve).where(Solve.user_id == user_id)).all():
        if s.cube_type not in last_per_cube or s.timestamp > last_per_cube[s.cube_type]:
            last_per_cube[s.cube_type] = s.timestamp
    cubes_unused: dict[str, int] = {c: (now - ts).days for c, ts in last_per_cube.items()}

    distinct_total = (
        db.scalar(
            select(func.count(distinct(Solve.cube_type))).where(Solve.user_id == user_id)
        )
        or 0
    )

    return GeneratorInput(
        avg_solves_per_active_day=avg_per_day,
        most_active_cube=most_active,
        best_ms_per_cube=best_per_cube,
        cubes_unused_for_days=cubes_unused,
        distinct_cubes_total=int(distinct_total),
    )


def get_or_generate_today(db: OrmSession, user_id: int) -> list[Challenge]:
    """Heutige Challenges des Users — generiert wenn nicht da. Idempotent."""
    today = _today_start_naive_utc()
    existing = list(
        db.scalars(
            select(Challenge)
            .where(Challenge.user_id == user_id)
            .where(Challenge.generated_for_date == today)
        ).all()
    )
    if existing:
        return existing

    snap = _build_generator_snapshot(db, user_id)
    specs = generate_daily_challenges(snap)
    created: list[Challenge] = []
    for spec in specs:
        ch = Challenge(
            user_id=user_id,
            kind=spec.kind,
            cube_type=spec.cube_type,
            params_json=json.dumps(spec.params) if spec.params else None,
            target_value=spec.target_value,
            progress=0,
            generated_for_date=today,
        )
        db.add(ch)
        created.append(ch)
    db.commit()
    for ch in created:
        db.refresh(ch)
    return created


def regenerate_today(db: OrmSession, user_id: int) -> list[Challenge]:
    """Loescht heutige Challenges des Users + generiert frisch."""
    today = _today_start_naive_utc()
    existing = list(
        db.scalars(
            select(Challenge)
            .where(Challenge.user_id == user_id)
            .where(Challenge.generated_for_date == today)
        ).all()
    )
    for ch in existing:
        db.delete(ch)
    db.commit()
    return get_or_generate_today(db, user_id)


def update_today_progress_for_solve(
    db: OrmSession, user_id: int, solve: Solve
) -> list[int]:
    """Nach jedem Solve: progress aller heutigen aktiven Challenges des Users
    aktualisieren. Liefert Liste der Challenge-IDs die jetzt frisch
    completed sind.
    """
    today = _today_start_naive_utc()
    challenges = list(
        db.scalars(
            select(Challenge)
            .where(Challenge.user_id == user_id)
            .where(Challenge.generated_for_date == today)
            .where(Challenge.dismissed.is_(False))
        ).all()
    )
    if not challenges:
        return []

    snap = SolveSnapshot(
        cube_type=solve.cube_type,
        time_ms=solve.time_ms,
        plus_two=solve.plus_two,
        dnf=solve.dnf,
    )

    newly_completed: list[int] = []

    for ch in challenges:
        if ch.kind == "diversity":
            if ch.completed_at:
                continue
            distinct_today = (
                db.scalar(
                    select(func.count(distinct(Solve.cube_type)))
                    .where(Solve.user_id == user_id)
                    .where(Solve.timestamp >= today)
                    .where(Solve.dnf.is_(False))
                )
                or 0
            )
            new_progress = max(ch.progress, int(distinct_today))
        else:
            state = ChallengeState(
                kind=ch.kind,
                cube_type=ch.cube_type,
                target_value=ch.target_value,
                progress=ch.progress,
                is_completed=ch.completed_at is not None,
            )
            new_progress = update_progress_for_solve(state, snap)

        if new_progress != ch.progress:
            ch.progress = new_progress
            if new_progress >= ch.target_value and ch.completed_at is None:
                ch.completed_at = datetime.now(UTC)
                newly_completed.append(ch.id)

    db.commit()
    return newly_completed

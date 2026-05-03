"""Challenge-Service: bridge zwischen DB und pure layer (Phase 7b).

Verantwortlich:
- Snapshot bauen fuer den Generator
- Heutige Challenges holen oder generieren (max 1x/Tag)
- Progress-Update nach jedem Solve (alle aktiven challenges)
- Diversity-Logic (braucht DB-context fuer „heute distinct cubes")
"""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session as OrmSession

from db.models import Challenge, Solve

from .generator import GeneratorInput, generate_daily_challenges
from .tracker import ChallengeState, SolveSnapshot, update_progress_for_solve

# Wie viele Tage zaehlen wir „aktive Tage" fuer den volume-mittelwert
ACTIVE_DAYS_WINDOW = 30


def _today_start_naive_utc() -> datetime:
    """Tagesanfang heute (naive UTC, weil DB-timestamps so abgelegt sind)."""
    now = datetime.now(UTC)
    return datetime(now.year, now.month, now.day)


def _today_date() -> date:
    return datetime.now(UTC).date()


def _build_generator_snapshot(db: OrmSession) -> GeneratorInput:
    """Baut den Snapshot fuer den Generator aus DB-queries."""
    now = datetime.now(UTC).replace(tzinfo=None)
    window_start = now - timedelta(days=ACTIVE_DAYS_WINDOW)

    # mittel solves pro aktivem tag
    rows_recent = list(db.scalars(select(Solve).where(Solve.timestamp >= window_start)).all())
    distinct_days = {s.timestamp.date() for s in rows_recent}
    n_active_days = len(distinct_days)
    avg_per_day = round(len(rows_recent) / n_active_days) if n_active_days > 0 else 0

    # most-active cube
    counts: dict[str, int] = {}
    for s in rows_recent:
        if not s.dnf:
            counts[s.cube_type] = counts.get(s.cube_type, 0) + 1
    most_active = max(counts, key=lambda c: counts[c]) if counts else None

    # PB pro cube (gesamt, nicht nur recent — sonst zu volatil)
    best_per_cube: dict[str, int] = {}
    for s in db.scalars(select(Solve).where(Solve.dnf.is_(False))).all():
        eff = s.time_ms + (2000 if s.plus_two else 0)
        if best_per_cube.get(s.cube_type, 99_999_999) > eff:
            best_per_cube[s.cube_type] = eff

    # Tage seit letztem solve pro cube (alle cubes mit historischen solves)
    last_per_cube: dict[str, datetime] = {}
    for s in db.scalars(select(Solve)).all():
        if s.cube_type not in last_per_cube or s.timestamp > last_per_cube[s.cube_type]:
            last_per_cube[s.cube_type] = s.timestamp
    cubes_unused: dict[str, int] = {c: (now - ts).days for c, ts in last_per_cube.items()}

    distinct_total = db.scalar(select(func.count(distinct(Solve.cube_type)))) or 0

    return GeneratorInput(
        avg_solves_per_active_day=avg_per_day,
        most_active_cube=most_active,
        best_ms_per_cube=best_per_cube,
        cubes_unused_for_days=cubes_unused,
        distinct_cubes_total=int(distinct_total),
    )


def get_or_generate_today(db: OrmSession) -> list[Challenge]:
    """Liefert die heutigen Challenges. Generiert sie, wenn fuer heute
    noch keine existieren.

    Idempotent: zweiter Aufruf am gleichen Tag liefert dieselben.
    """
    today = _today_start_naive_utc()
    existing = list(
        db.scalars(select(Challenge).where(Challenge.generated_for_date == today)).all()
    )
    if existing:
        return existing

    # Neu generieren
    snap = _build_generator_snapshot(db)
    specs = generate_daily_challenges(snap)
    created: list[Challenge] = []
    for spec in specs:
        ch = Challenge(
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


def regenerate_today(db: OrmSession) -> list[Challenge]:
    """Loescht heutige Challenges und generiert frisch."""
    today = _today_start_naive_utc()
    existing = list(
        db.scalars(select(Challenge).where(Challenge.generated_for_date == today)).all()
    )
    for ch in existing:
        db.delete(ch)
    db.commit()
    return get_or_generate_today(db)


def update_today_progress_for_solve(db: OrmSession, solve: Solve) -> list[int]:
    """Nach jedem Solve: progress aller heutigen aktiven Challenges
    aktualisieren. Liefert Liste der Challenge-IDs die jetzt frisch
    completed sind.
    """
    today = _today_start_naive_utc()
    challenges = list(
        db.scalars(
            select(Challenge)
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
    today_date = _today_date()

    for ch in challenges:
        if ch.kind == "diversity":
            # Spezialfall: braucht DB-context (alle distinct cubes heute)
            if ch.completed_at:
                continue
            distinct_today = (
                db.scalar(
                    select(func.count(distinct(Solve.cube_type)))
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

    if newly_completed or any(c.progress != c.progress for c in challenges):
        db.commit()
    else:
        db.commit()  # progress-only updates auch persistieren

    # silence the unused 'today_date' linter — used in spezialfall above
    _ = today_date
    return newly_completed

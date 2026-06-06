"""Public-Profile-API (Phase W.public-profile, 2026-06-06).

Eine anonym (ohne Login) abrufbare, teilbare Solving-Card unter
/u/<slug> (Frontend) → GET /api/public/profile/<slug> (hier).

WICHTIG — Privacy:
- Das ist der ERSTE anonyme Endpoint der App, der User-Daten ausliefert.
- Strikt **opt-in**: nur User mit `public_profile_enabled=True` (Default False)
  haben eine Card. Sonst generischer 404 (kein Existence-/Enumeration-Leak).
- Es werden NUR Aggregate ausgeliefert (Single/Avg-PBs pro Cube, Counts,
  Achievement-Anzahl, letzte PB-Events). NIEMALS Email, PLZ, Einzel-Solves,
  Sessions, Hardware, Notizen.
- Die generische Stats-Engine (`stats.calc.compute_stats`) ist nicht an
  current_user gekoppelt → wir füttern sie hier mit den Solves der Profil-
  user_id.

Siehe docs/permissions-matrix.md (Abschnitt „Public-Profile").
"""

from __future__ import annotations

import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from auth.rate_limit import limiter
from db.database import get_db
from db.models import Achievement, Solve, User
from db.schemas import PublicCubeStat, PublicPb, PublicProfileRead
from stats.calc import SolvePoint, compute_stats, single_pb_progression

router = APIRouter(prefix="/public", tags=["public"])

RECENT_PBS_LIMIT = 8
# Platz für ein "-<id>"-Suffix innerhalb VARCHAR(64).
_SLUG_MAX = 48


def _slugify(name: str | None) -> str:
    """display_name → URL-Slug: lowercase, ä/ö/ü/ß transliteriert, nur a-z0-9,
    Rest zu '-' kollabiert (z.B. „Über-Cuber 2024" → „ueber-cuber-2024").

    Nicht-lateinische Zeichen jenseits von ä/ö/ü/ß (z.B. é, ñ, ć) werden still
    entfernt — akzeptabel für den aktuellen User-Kreis; bei leerem Ergebnis
    greift in generate_public_slug der „cuber"-Fallback.
    """
    s = (name or "").strip().lower()
    s = s.translate(str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}))
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:_SLUG_MAX]


def generate_public_slug(db: OrmSession, user: User) -> str:
    """Eindeutiger, stabiler Slug aus dem display_name.

    Basis frei → Basis (z.B. „max-mustermann"); sonst Basis-<user.id>
    (garantiert eindeutig, da user.id unique). Leerer Name → „cuber".
    Wird beim ERSTEN Aktivieren erzeugt und bleibt danach stabil (Aufrufer
    regeneriert nicht), damit geteilte Links gültig bleiben.
    """
    base = _slugify(user.display_name) or "cuber"
    taken = db.scalar(
        select(User.id).where(User.public_slug == base, User.id != user.id)
    )
    if taken is None:
        return base
    return f"{base}-{user.id}"


def slug_with_id_suffix(user: User) -> str:
    """Garantiert eindeutiger Fallback-Slug (Basis + user.id). Vom PATCH-/me-
    Handler bei einer seltenen Slug-Kollisions-Race (zwei gleiche display_names
    aktivieren gleichzeitig) genutzt — die user.id macht ihn kollisionsfrei."""
    base = _slugify(user.display_name) or "cuber"
    return f"{base}-{user.id}"


def _aware(ts: datetime) -> datetime:
    """Naive Timestamps als UTC interpretieren (DB liefert teils naive)."""
    return ts.replace(tzinfo=UTC) if ts.tzinfo is None else ts


def _build_public_profile(db: OrmSession, user: User) -> PublicProfileRead:
    """Komponiert die Card aus den Solves der Profil-user_id (nur Aggregate)."""
    rows = db.scalars(
        select(Solve)
        .where(Solve.user_id == user.id)
        .order_by(Solve.timestamp.asc())
    ).all()

    by_cube: dict[str, list[Solve]] = {}
    for s in rows:
        by_cube.setdefault(s.cube_type, []).append(s)

    solve_by_id = {s.id: s for s in rows}
    cubes: list[PublicCubeStat] = []
    pb_candidates: list[tuple[Solve, int]] = []
    total_valid = 0

    for cube_type, group in by_cube.items():
        points = [
            SolvePoint(time_ms=s.time_ms, dnf=s.dnf, plus_two=s.plus_two, solve_id=s.id)
            for s in group
        ]
        stats = compute_stats(points)
        total_valid += stats.count_valid

        last_solve_at = _aware(group[-1].timestamp).isoformat() if group else None

        cubes.append(
            PublicCubeStat(
                cube_type=cube_type,
                count=stats.count,
                best_ms=stats.best_ms,
                best_ao5=stats.best_ao5,
                best_ao12=stats.best_ao12,
                best_ao100=stats.best_ao100,
                current_ao5=stats.current_ao5,
                last_solve_at=last_solve_at,
            )
        )

        for sid, ms in single_pb_progression(points):
            sv = solve_by_id.get(sid)
            if sv is not None:
                pb_candidates.append((sv, ms))

    # Meist-geübte Cubes zuerst.
    cubes.sort(key=lambda c: c.count, reverse=True)

    # Letzte Single-PB-Events über alle Cubes, nach Zeit absteigend, Top N.
    pb_candidates.sort(key=lambda t: _aware(t[0].timestamp), reverse=True)
    recent_pbs = [
        PublicPb(
            cube_type=sv.cube_type,
            time_ms=ms,
            at=_aware(sv.timestamp).isoformat(),
        )
        for sv, ms in pb_candidates[:RECENT_PBS_LIMIT]
    ]

    achievements_unlocked = (
        db.scalar(
            select(func.count())
            .select_from(Achievement)
            .where(Achievement.user_id == user.id)
        )
        or 0
    )

    return PublicProfileRead(
        slug=user.public_slug or "",
        display_name=user.display_name,
        country_iso2=user.country_iso2,
        member_since=_aware(user.created_at),
        wca_id=user.wca_id,
        total_solves=len(rows),
        total_valid=total_valid,
        achievements_unlocked=int(achievements_unlocked),
        cubes=cubes,
        recent_pbs=recent_pbs,
    )


@router.get("/profile/{slug}", response_model=PublicProfileRead)
@limiter.limit("60/minute")
def get_public_profile(
    request: Request, slug: str, db: OrmSession = Depends(get_db)
) -> PublicProfileRead:
    """Anonyme, opt-in öffentliche Solving-Card.

    Generischer 404 bei: Slug existiert nicht / Card deaktiviert / User
    inaktiv — derselbe Fehler für alle Fälle (kein Existence-Leak).
    """
    norm = slug.strip().lower()
    user = db.scalar(
        select(User).where(
            User.public_slug == norm,
            User.public_profile_enabled.is_(True),
            User.is_active.is_(True),
        )
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return _build_public_profile(db, user)

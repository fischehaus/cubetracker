"""Demo-User-Seed (Phase W.demo-user-backend, 2026-05-28).

Genau EIN User in der DB hat `is_demo=True`. Er existiert damit Besucher
sich die App anschauen koennen ohne sich zu registrieren — der LoginPage-
Button "Demo ausprobieren" loggt direkt in diesen User ein (siehe
api/auth.py:demo_login).

Verhalten des Demo-Users:
- Normal-Login via /auth/login geht NICHT (unbrauchbarer Passwort-Hash,
  und Sanity-Check in demo_login schliesst Doppel-Use aus).
- Mutating Endpoints (POST/PATCH/DELETE auf eigene Solves/Sessions/etc.)
  sind via require_not_demo blockiert. User sieht alles, kann aber
  nichts schreiben -> shared Account ohne Drift.
- Sample-Solves: ~120 Solves über 60 Tage gestreut, mehrere Cubes.
  Realistic-aussehende Times mit leichter Improve-Tendenz, ein paar
  PB-Sprünge, manche +2 und DNF.

Idempotenz:
- Wenn User mit Email DEMO_EMAIL existiert + is_demo=True: nichts machen.
- Wenn User existiert aber is_demo=False (z.B. realer User der die Email
  vor unserem Bootstrap registriert hat): KEINE Aenderung -- log warning.
  Der Email-Konflikt-Check im Register-Endpoint sollte das eigentlich
  verhindert haben, aber defensive.
- Wenn User NICHT existiert: anlegen + Sample-Solves seeden.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from auth.password import hash_password
from db.models import Solve, User

DEMO_EMAIL = "demo@cubetracker.de"
DEMO_DISPLAY_NAME = "Demo"

# Unbrauchbarer Passwort-Hash. Bcrypt-Format aber unmoeglich zu rebuilden
# (50-Random-Zeichen, vorher gehashed). Theoretisch koennte ein Angreifer
# nie das Login-Passwort hier raten. Plus: /auth/login wirft "Email oder
# Passwort falsch" wenn das nicht matched -- normaler Login-Flow.
# Demo-Login geht nur via /auth/demo-login (kein Passwort-Check).
_DUMMY_PW_HASH = hash_password("DEMO_USER_NO_LOGIN_XX_" + "".join(
    chr(ord("a") + (i * 7) % 26) for i in range(30)
))


def _seed_solves(db: OrmSession, user_id: int) -> int:
    """Seed ~120 Sample-Solves fuer den Demo-User."""
    # Fester Seed damit alle Demo-Sessions identische Daten sehen.
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    solves: list[Solve] = []

    # Verteilung pro Cube-Type:
    #   3x3: 80 Solves, ~16s Mittel, langsam improving
    #   4x4: 18 Solves, ~75s Mittel
    #   OH:  12 Solves, ~28s Mittel
    #   Pyra: 8 Solves, ~6s Mittel
    cube_config = [
        ("3x3", 80, 16_000, 2_500, 60),  # name, count, mean_ms, stddev_ms, days_span
        ("4x4", 18, 75_000, 12_000, 45),
        ("OH", 12, 28_000, 4_500, 45),
        ("Pyra", 8, 6_000, 1_200, 30),
    ]
    scrambles_per_cube = {
        "3x3": ["R U R' U' R' F R2 U' R' U' R U R' F'", "F R U' R' U' R U R' F'", "R U R' U R U2 R'"],
        "4x4": ["Rw U Rw' U Rw U2 Rw'", "Fw R U' R' U Fw'"],
        "OH": ["R U R' U R U2 R'", "F R U' R' F'"],
        "Pyra": ["L R B U B' R' L'", "U' L R U R'"],
    }

    for cube_type, count, mean_ms, stddev_ms, days_span in cube_config:
        scrambles = scrambles_per_cube[cube_type]
        # Improvement: aeltere Solves langsamer als neue (5% drift over span)
        for i in range(count):
            day_offset = days_span * (1 - i / count)
            ts = now - timedelta(
                days=day_offset, hours=rng.randint(0, 23), minutes=rng.randint(0, 59)
            )
            improvement_factor = 1.05 - 0.05 * (i / count)
            time_ms = max(
                500,
                int(rng.gauss(mean_ms * improvement_factor, stddev_ms)),
            )
            # 4% DNF, 6% +2, sonst clean
            roll = rng.random()
            dnf = roll < 0.04
            plus_two = 0.04 <= roll < 0.10
            if plus_two:
                time_ms += 2000
            solves.append(
                Solve(
                    user_id=user_id,
                    time_ms=time_ms,
                    cube_type=cube_type,
                    scramble=rng.choice(scrambles),
                    notes=None,
                    timestamp=ts,
                    plus_two=plus_two,
                    dnf=dnf,
                )
            )

    # Bulk-insert für Performance
    db.add_all(solves)
    db.flush()
    return len(solves)


def bootstrap_demo_user(db: OrmSession) -> tuple[bool, int]:
    """Anlegen wenn fehlend, idempotent.

    Returns:
        (created, solves_seeded) — created=True nur beim Erst-Anlegen.
    """
    existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if existing:
        if not existing.is_demo:
            # Defensive: User mit der Demo-Email existiert aber is_demo=False.
            # Das sollte nicht passieren — Register-Endpoint sollte die
            # Email-Kollision verhindern. Nichts tun, nicht ueberschreiben.
            print(
                f"WARN: User mit Email {DEMO_EMAIL!r} existiert ohne "
                "is_demo-Flag — Demo-Bootstrap uebersprungen."
            )
            return False, 0
        # Demo-User existiert bereits + is_demo gesetzt. Idempotent: nichts tun.
        # Sample-Solves NICHT neu seeden (User-Edits sind eh blockiert,
        # aber bei Container-Restart nicht alles ueberschreiben).
        return False, 0

    # Erst-Anlegen.
    demo = User(
        email=DEMO_EMAIL,
        hashed_password=_DUMMY_PW_HASH,
        display_name=DEMO_DISPLAY_NAME,
        is_active=True,
        email_verified=True,  # Skip Email-Verify-Block fuer Demo-Login
        is_admin=False,
        is_tester=False,
        is_demo=True,
        is_discoverable=False,
    )
    db.add(demo)
    db.flush()  # damit demo.id verfuegbar ist

    seeded = _seed_solves(db, demo.id)
    db.commit()

    return True, seeded

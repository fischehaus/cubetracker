"""Seed-Daten für Live-Tests (Admin-QA-Checklisten).

Aktuelle Seed-Sets:

- **W.demo-probe-meppel** (2026-05-28): EN-Klick-Through + WCA-Profil-
  Smoke-Tests vor dem WCA-Turnier-Demo in Meppel am Sa 30.05.2026.
  Wird beim Cold-Start des Containers idempotent angelegt — wenn schon
  Tests mit diesem `related_phase` existieren, wird nichts angefasst.

Konvention:
- Jeder Eintrag bekommt einen aussagekräftigen `related_phase`-Marker
  damit Idempotenz-Check trivial ist (1× Count-Query pro Set).
- `created_by_user_id` bleibt None — System-erstellt, nicht von einem
  bestimmten Admin. (`live_tests.created_by_user_id` hat KEIN FK-
  Constraint, ist also als Info-Feld gemeint.)
- Live-Tests sind global pro Repo, NICHT per-User-Daten. Sie werden
  von allen Admins gelesen + geschrieben (siehe webapp/api/admin.py:
  list_live_tests — kein per-User-Filter).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

# ============================================================
# W.demo-probe-meppel (2026-05-28) — Turnier-Sprint-Abschluss
# ============================================================

_PHASE_DEMO_PROBE = "W.demo-probe-meppel"

# Reihenfolge: gleicht dem realen Demo-Flow am Phone — Login → Dashboard →
# Solve-Tab → Analyse → Verwaltung → Trainer → Community → WCA → Backup →
# Modals. So kann der Admin die Liste linear abarbeiten.
DEMO_PROBE_TESTS: list[tuple[str, str]] = [
    (
        "Sprach-Switcher im Header funktioniert",
        "Auf der Live-App (https://www.cubetracker.de) auf die 🇬🇧-Flagge im "
        "Header klicken — UI schaltet sofort auf Englisch um. Erneut auf 🇩🇪 "
        "klicken → wieder Deutsch. KEINEN Reload nötig. Erwartung: PASS. "
        "Wenn FAIL: Notiz mit dem konkreten Fehler (rendert nicht / Flagge "
        "fehlt / falsche Sprache nach Klick).",
    ),
    (
        "Login-Seite komplett auf Englisch",
        "Ausloggen → Login-Seite öffnet — bei EN müssen alle Strings übersetzt "
        "sein: Email/Password-Labels, Sign-in-Button, Tab-Switcher zu Register, "
        "Forgot-password-Link + Banner, Marketing-Tagline + Hero-Highlights "
        "rechts, Footer-Links (Privacy, Imprint, Roadmap, Feedback, Features). "
        "Keine deutschen Reste. Auch der Sprach-Switcher liegt oben rechts in "
        "der Auth-Card.",
    ),
    (
        "Dashboard EN: alle Karten übersetzt",
        "Einloggen mit EN-UI → Dashboard. Pro Sektion prüfen, keine DE-Reste: "
        "(a) Heute: Onboarding-Banner (bei leerer DB), Stats-Karte, Letzte-"
        "Rekorde, Reminder. (b) Performance: Multi-Compare, ChallengesMini, "
        "AchievementsMini. (c) Antrieb. (d) Welt: WCA-Profil, WCA-Upcoming, "
        "News. Sektion-Header oben (Today / Your performance / Training / "
        "Speedcubing world) sind ebenfalls auf Englisch.",
    ),
    (
        "Timer-Tab EN: Solve-Flow + Live + Letzte Solves",
        "Timer-Tab in EN. Ein Solve eintippen → Save → erscheint in der Live-"
        "Karte. Penalty-Quick-Buttons (+2 / DNF / Delete) zeigen englische "
        "Tooltips. „Letzte Solves\"-Tabelle hat englische Spalten-Header (#/"
        "Time/Mo3/AO5/AO12) und einen englischen Empty-State. Bonus: Spacebar-"
        "Modus aktivieren → Hint-Texte (Idle/Inspection/Ready/Running/"
        "Stopped) sind alle EN.",
    ),
    (
        "Analyse-Tab EN: Charts + Solve-Liste + Filter + Solve-Detail",
        "Analyse-Tab in EN. Alle 5 Charts haben englische Header (Trends / "
        "PB Progression / Histogram / Activity / Hardware Compare) + Picker-"
        "Labels + Y-Axis-Inputs + Tooltips. Solve-Liste: Spalten-Header (#/"
        "Time/Mo3/AO5/AO12/AO100/Cube/Hardware/Actions), Footer-Tipp, Filter-"
        "Bar oben. Klick auf einen Solve → Solve-Detail-Modal komplett EN "
        "inkl. der 5 Action-Buttons.",
    ),
    (
        "Verwaltung-Tab EN: alle Sub-Tabs",
        "Verwaltung in EN. Sub-Tab-Bar: Sessions / Hardware / My data / "
        "Outliers / Settings / Account. Stichproben: (a) Session anlegen + "
        "umbenennen + Notes editieren, alle Modal-Buttons EN. (b) Hardware: "
        "Cube aktivieren + Notes editieren, Bulk-Aktionen + Delete-Confirm "
        "EN. (c) My data: Backup-Download-Button + Ownership-Text + Danger-"
        "Zone mit 3 Lösch-Aktionen EN. (d) Settings: Spacebar/Inspection/"
        "Splits/Fonts/Image-Sektionen EN. (e) Account: alle 4 Sektionen "
        "(Profile/Password/Email/Danger).",
    ),
    (
        "Trainer + Community EN",
        "(a) Trainer-Tab in EN: Sub-Tab-Bar (Today / Algs / Achievements). "
        "Daily-Challenges-Header + InfoButton + Regenerate-Button EN. "
        "Algorithm-Trainer mit Drill-Card (Show/Hide algorithm, Skip, Save-"
        "Button mit Busy-State). Achievements-Kacheln mit Tooltips EN. "
        "(b) Community-Tab: Sub-Tabs (Friends / Leaderboard). FriendsTab "
        "mit Search/Pending/List-Cards EN. Leaderboard mit Tabelle EN.",
    ),
    (
        "WCA-Profil: ID setzen → Karte erscheint sofort",
        "In EN: Verwaltung → Settings → Account → WCA-ID-Sektion. Eigene "
        "WCA-ID eintragen (Format wie 2024SMIT01) → Save → ohne Reload "
        "ins Dashboard wechseln. Die „WCA profile\"-Karte oben rechts in "
        "der „Speedcubing world\"-Sektion zeigt sofort echte Daten — "
        "NICHT erst nach Hard-Refresh. (Cache-Invalidation-Test.)",
    ),
    (
        "WCA-Profil: echte Zahlen werden gezogen",
        "Nach der WCA-ID-Eingabe (siehe Test #8): die WCA-Karte zeigt: "
        "(a) Wettkampf-Count > 0, (b) Medaillen-Zeile mit Gold/Silver/"
        "Bronze, (c) Records-Zeile mit WR/CR/NR, (d) Mindestens 1 PB-Zeile "
        "in der Tabelle mit Single + Average Werten und einem Rank-Badge "
        "(WR/CR/NR), (e) Recent-Comps-Liste mit mindestens 1 Eintrag + "
        "Datum. Wenn ALLES 0/leer ist: FAIL mit Notiz „API-Quirk wieder "
        "da\".",
    ),
    (
        "Backup-Download in EN funktioniert + enthält wca_id",
        "Verwaltung → My data → „Download full backup now\"-Button. JSON-"
        "Datei wird heruntergeladen. JSON öffnen — top-level muss enthalten: "
        "user_email, user_wca_id (entweder die eingetragene ID oder null), "
        "counts, solves, sessions, hardware, achievements, challenges. "
        "Erfolg: Datei lädt + user_wca_id-Feld vorhanden.",
    ),
    (
        "Roadmap-Modal in EN zeigt DE-only-Banner",
        "Im EN-Modus: Footer → „Roadmap\"-Link → Modal öffnet. Oben sollte "
        "ein amber Hinweis-Banner stehen: „🇩🇪 Roadmap content is currently "
        "only available in German. English translation will follow after "
        "the Meppel demo (end of May 2026).\" Modal-Inhalt darunter bleibt "
        "auf Deutsch (das ist OK + dokumentiert). Wenn KEIN Banner: FAIL.",
    ),
    (
        "Sprach-Wahl persistiert nach Reload + Logout",
        "(a) EN aktiv → Browser-Reload (F5) → Sprache bleibt EN. (b) EN "
        "aktiv → Logout → Login-Seite ist auch EN → Re-Login → App startet "
        "in EN. (c) Bonus: localStorage prüfen — Key `cubetracker_language` "
        "= „en\" (DevTools → Application → Local Storage).",
    ),
]


def _count_existing(db: OrmSession, phase: str) -> int:
    """Anzahl bestehender LiveTests mit dem gegebenen related_phase."""
    from db.models import LiveTest

    stmt = select(func.count(LiveTest.id)).where(LiveTest.related_phase == phase)
    return int(db.execute(stmt).scalar() or 0)


def bootstrap_demo_probe_tests(db: OrmSession) -> int:
    """Idempotenter Seeder für die EN-Klick-Through-Demo-Probe-Tests.

    Idempotenz: prüft Count von LiveTests mit related_phase=W.demo-probe-
    meppel. Wenn ≥ len(DEMO_PROBE_TESTS), wird nichts angelegt. Wenn 0,
    werden alle angelegt. Bei Teil-Mengen (z.B. weil Admin manuell ein
    paar gelöscht hat): aktuell wird trotzdem nichts angelegt — sonst
    bekäme der Admin nach jedem Delete + Container-Restart die Test
    zurück (Frustration). Manuelles Re-Seed via `POST /admin/live-tests/
    seed-demo-probe` wäre möglich, aber aktuell nicht implementiert.

    Returns: Anzahl angelegter LiveTests (0 wenn bereits gebootstrappt).
    """
    from db.models import LiveTest

    if _count_existing(db, _PHASE_DEMO_PROBE) > 0:
        return 0

    created = 0
    for title, description in DEMO_PROBE_TESTS:
        db.add(
            LiveTest(
                title=title,
                description=description,
                related_phase=_PHASE_DEMO_PROBE,
                related_commit_sha=None,
                related_tag="v2.0.0-alpha.W.demo-probe-meppel",
                status="open",
                created_by_user_id=None,  # System-erstellt
            )
        )
        created += 1
    db.commit()
    return created

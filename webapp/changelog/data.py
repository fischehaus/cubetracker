"""Patch-Notes als Single-Source-of-Truth.

Konvention seit 2026-05-14:
  - Bei JEDER Aenderung neuer Eintrag oben in PATCH_NOTES.
  - `version` folgt SemVer-Schema `2.0.0-alpha.W.X.Y` waehrend Multi-User-
    Web-Phase. v2.0.0 sobald Hetzner-Migration durch + Feature-Set stable.
  - `__version__` in main.py wird automatisch aus PATCH_NOTES[0].version
    abgeleitet — damit "vergisst man nicht" die Versionsnummer hochzuziehen.
  - Frontend liest /api/changelog und rendert in Verwaltung → Patch Notes.

Format:
    PatchNote(
        version="2.0.0-alpha.W.X",
        released=date(2026, 5, 14),
        title="Kurzer Titel",
        highlights=["Aufzaehlungs-Punkt 1", "Punkt 2"],
        commit="abc1234",  # optional, fuer Cross-Reference
    )

KEINE Markdown im title/highlights — Frontend rendert als plain text.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class PatchNote:
    version: str
    released: date
    title: str
    highlights: list[str]
    commit: str | None = None


# Neue Eintraege OBEN einfuegen — PATCH_NOTES[0] = neueste Version.
PATCH_NOTES: list[PatchNote] = [
    PatchNote(
        version="2.0.0-alpha.W.solvelist-hardware",
        released=date(2026, 5, 14),
        title="Analyse → Solves: Hardware statt Notiz in Tabelle",
        highlights=[
            "Notiz-Spalte raus aus der Solve-Tabelle (Notiz bleibt im "
            "Detail-Modal ueber den ℹ-Button verfuegbar)",
            "Hardware-Spalte stattdessen — zeigt den Hardware-Namen "
            "fuer jeden Solve, oder „—\" wenn keine zugeordnet",
            "Cube-Spalte vereinfacht (Hardware-Sub-Zeile entfernt — "
            "wird ja jetzt eigenstaendig gezeigt)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.patchnotes",
        released=date(2026, 5, 14),
        title="Patch Notes + automatische Versionierung",
        highlights=[
            "Single-Source-of-Truth `changelog/data.py` — pflegt Versions-"
            "Nummer + Patch-Notes in einem Schritt",
            "Neuer Sub-Tab in Verwaltung: Patch Notes",
            "Backend liefert neuen Endpoint GET /api/changelog",
            "Frontend-Versionsanzeige im Header zieht jetzt automatisch "
            "die neueste Version aus den Patch Notes",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.hardware-auto-seed",
        released=date(2026, 5, 14),
        title="Hardware Auto-Seed + Bulk-Aktionen + Umbenennen-Button",
        highlights=[
            "Jeder neue User bekommt automatisch die 30-Cube-Standard-Liste "
            "(default inaktiv) — kein Import-Button mehr noetig",
            "Lifespan-Backfill: bestehende User ohne Hardware kriegen die "
            "Liste beim naechsten Cold-Start nachgepflegt",
            "Pro Cube-Type-Gruppe: Checkbox 'alle markieren' + Bulk-Buttons "
            "(aktivieren, deaktivieren, loeschen)",
            "Expliziter Umbenennen-Button bei jedem Eintrag",
            "Header zeigt jetzt 'X aktiv von Y' statt nur Total",
        ],
        commit="8d24cbc",
    ),
    PatchNote(
        version="2.0.0-alpha.W.hardware-seed-fix",
        released=date(2026, 5, 13),
        title="Bug-Fix: Hardware-Seed-Endpoint im Web-Backend nachgeruestet",
        highlights=[
            "Frontend-Seed-Button war funktionslos (Endpoint existierte nur "
            "im Desktop-Backend) — jetzt multi-user-safe geportet",
            "pyproject.toml packages-Liste um friends/leaderboard/seeds "
            "ergaenzt fuer sauberen Pip-Install",
        ],
        commit="8e5f3bc",
    ),
    PatchNote(
        version="2.0.0-alpha.W.ui-polish",
        released=date(2026, 5, 13),
        title="TIMER-Layout links + sortierbare Solve-Tabellen",
        highlights=[
            "TIMER-Tab: LIVE + Letzte-Solves wandern von rechts nach links",
            "Neue 'Letzte Solves'-Tabelle: X-Picker (10/20/50/100), "
            "Spalten #|Zeit|AO5|AO12, klickbare Spalten-Headers zum Sortieren",
            "Analyse → Solves: zusaetzlich Solvenummer-Spalte + Sortierung "
            "nach #/Zeit/AO5/AO12",
            "DNF/None-Averages landen beim Sortieren immer am Ende",
        ],
        commit="b09b067",
    ),
    PatchNote(
        version="2.0.0-alpha.W.10",
        released=date(2026, 5, 13),
        title="Leaderboards — Vergleich mit Freunden",
        highlights=[
            "Neuer Top-Tab: Bestenliste",
            "Cube-Type-Picker + Tabelle mit Best Single, Best AO5, Best AO12, "
            "Aktuelles AO5, Solves (30d), Last Active",
            "Self optisch hervorgehoben + immer oben; Top-3 Freunde mit "
            "Gold/Silber/Bronze-Medaille",
            "Privacy: nur accepted-Friends, keine Emails im Output",
            "WCA-konforme +2/DNF-Behandlung",
        ],
        commit="8966715",
    ),
    PatchNote(
        version="2.0.0-alpha.W.9",
        released=date(2026, 5, 13),
        title="Friend-System",
        highlights=[
            "Neuer Top-Tab: Freunde",
            "User-Suche per Display-Name (Opt-In via is_discoverable) ODER "
            "exakter Email",
            "Anfragen-Workflow: schicken, annehmen, ablehnen, zuruecknehmen",
            "Eigene Freundeliste mit Entfreunden-Confirm",
            "Functional UniqueIndex (LEAST, GREATEST) verhindert Cross-"
            "Direction-Race bei parallelen Anfragen",
        ],
        commit="d573b11",
    ),
    PatchNote(
        version="2.0.0-alpha.W.backup",
        released=date(2026, 5, 13),
        title="DB-Backup via GitHub Actions",
        highlights=[
            "Daily pg_dump 02:00 UTC, GitHub-Artifact mit 90 Tagen Retention",
            "Manual-Trigger ueber Actions-Tab",
            "BACKUP.md mit Restore-Anleitung",
        ],
        commit="29074ba",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-2",
        released=date(2026, 5, 13),
        title="Admin User-Management + Ad-hoc-Mail + Bulk-Announcement",
        highlights=[
            "User-Liste mit Solve-Count + Aktivitaet, Deaktivieren/Aktivieren",
            "Email manuell verifizieren (Support-Hilfe)",
            "DSGVO-Hard-Delete mit Pflicht-Confirm-String",
            "Ad-hoc-Mail an einzelne User",
            "Bulk-Announcement mit Dry-Run-Workflow",
        ],
        commit="faedeec",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-1",
        released=date(2026, 5, 13),
        title="Admin-Statistik-Panel + Cache-Leak-Fix",
        highlights=[
            "Neuer Admin-Sub-Tab in Verwaltung mit User-/Volume-/Cube-/"
            "Storage-Kacheln",
            "React-Query-Cache wird bei Login/Logout geleert — "
            "verhindert Datenleak zwischen User-Sessions",
        ],
        commit="1a64bcb",
    ),
    PatchNote(
        version="2.0.0-alpha.W.touch",
        released=date(2026, 5, 13),
        title="Touch-Timer fuer Phone + F19-Race-Fix",
        highlights=[
            "Auf Touch-Devices erscheint im Timer-Tab ein grosser Tap-Pad",
            "Dispatched synthetische Space-Events → useSpacebarTimer "
            "behandelt sie identisch zur echten Tastatur",
            "Auf Phone wird automatisch Spacebar-Modus aktiviert "
            "(kein Settings-Detour mehr)",
        ],
        commit="f9491e5",
    ),
    PatchNote(
        version="2.0.0-alpha.W.5-ux",
        released=date(2026, 5, 13),
        title="UX-Trennung csTimer-Import vs Cubetracker-Backup",
        highlights=[
            "Klare visuelle Trennung der zwei JSON-Formate in Verwaltung → Daten",
            "Auto-Detect bei falscher Datei mit klarer Fehlermeldung",
            "csTimer-Import Crash bei Integer-Session-Namen behoben",
        ],
        commit="c11362b",
    ),
    PatchNote(
        version="2.0.0-alpha.W.8",
        released=date(2026, 5, 12),
        title="User-Management + Email-Verifikation",
        highlights=[
            "Email-Verifikation + Password-Reset via Resend",
            "Display-Name + Email-Change-Flow",
            "Token-Revocation-Pattern (alle Sessions sofort invalidierbar)",
        ],
        commit="6c780d1",
    ),
    PatchNote(
        version="2.0.0-alpha.W.5",
        released=date(2026, 5, 11),
        title="Backup + Snapshots + csTimer-Import",
        highlights=[
            "Voll-JSON-Export pro User unter Verwaltung → Daten",
            "Restore mit merge/replace-Modus + Confirm-String",
            "Manuelle + automatische Snapshots (max 2 pro User)",
            "csTimer-Import (TXT/JSON) mit Dedup",
        ],
        commit="b5531f3",
    ),
    PatchNote(
        version="2.0.0-alpha.W.4",
        released=date(2026, 5, 10),
        title="Trainer + Stats per User",
        highlights=[
            "Achievements + Daily Challenges multi-user-faehig",
            "Stats-Endpoints filtern auf user_id",
            "UTC-aware datetimes fuer Postgres-Kompatibilitaet",
        ],
        commit="b83c9df",
    ),
    PatchNote(
        version="2.0.0-alpha.W.3",
        released=date(2026, 5, 9),
        title="Multi-User-CRUD",
        highlights=[
            "Solve/Session/Hardware-Endpoints filtern auf user_id",
            "Cube-Filter im Analyse-Tab",
        ],
        commit="c225979",
    ),
    PatchNote(
        version="2.0.0-alpha.W.2",
        released=date(2026, 5, 7),
        title="Auth-Skeleton + Security-Sub-Agent-Findings",
        highlights=[
            "JWT-Auth mit Access-Token + HttpOnly-Refresh-Cookie",
            "Single-Flight Refresh-Interceptor im Frontend",
            "6 kritische Security-Findings vor Live-Deploy gefixt",
        ],
        commit="b791e36",
    ),
    PatchNote(
        version="1.0.1",
        released=date(2026, 5, 4),
        title="Letzter Desktop-Stand vor Multi-User-Web-Pivot",
        highlights=[
            "Bugfix: hardcoded baseURL in v1.0.0 — API-Calls in ausgerollter "
            "Desktop-App waren tot",
        ],
        commit="ceb63ba",
    ),
]


def current_version() -> str:
    """Neuester Eintrag = aktuelle App-Version. Wird von main.py importiert."""
    return PATCH_NOTES[0].version

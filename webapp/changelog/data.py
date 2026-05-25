"""Patch-Notes als Single-Source-of-Truth.

Konvention seit 2026-05-14:
  - Bei JEDER Änderung neuer Eintrag oben in PATCH_NOTES.
  - `version` folgt SemVer-Schema `2.0.0-alpha.W.X.Y` während Multi-User-
    Web-Phase. v2.0.0 sobald Hetzner-Migration durch + Feature-Set stable.
  - `__version__` in main.py wird automatisch aus PATCH_NOTES[0].version
    abgeleitet — damit "vergisst man nicht" die Versionsnummer hochzuziehen.
  - Frontend liest /api/changelog und rendert in Verwaltung → Patch Notes.

Format:
    PatchNote(
        version="2.0.0-alpha.W.X",
        released=date(2026, 5, 14),
        title="Kurzer Titel",
        highlights=["Aufzählungs-Punkt 1", "Punkt 2"],
        commit="abc1234",  # optional, für Cross-Reference
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


# Neue Einträge OBEN einfügen — PATCH_NOTES[0] = neueste Version.
PATCH_NOTES: list[PatchNote] = [
    PatchNote(
        version="2.0.0-alpha.W.meine-daten",
        released=date(2026, 5, 25),
        title="Meine Daten — deine Daten gehören dir",
        highlights=[
            "Neuer Bereich Verwaltung → 'Meine Daten': ein Klick lädt ein "
            "vollständiges Backup all deiner Solves, Sessions, Hardware und "
            "Achievements als offenes JSON herunter.",
            "Klare Botschaft dahinter: du behältst die volle Kontrolle — "
            "jederzeit exportieren, wieder importieren oder den Account komplett "
            "löschen. Zusätzlich sichern wir die Datenbank täglich automatisch "
            "(Server in Deutschland/EU).",
        ],
        commit="0c1169d",
    ),
    PatchNote(
        version="2.0.0-alpha.W.legal",
        released=date(2026, 5, 25),
        title="Impressum & Datenschutzerklärung",
        highlights=[
            "Impressum und Datenschutzerklärung sind jetzt über die "
            "Footer-Links erreichbar — auch ohne Login.",
            "Kein Cookie-Banner nötig: cubetracker nutzt nur ein technisch "
            "notwendiges Login-Cookie und kein Tracking. Keine Analyse- oder "
            "Werbe-Dienste von Drittanbietern.",
        ],
        commit="5747ea3",
    ),
    PatchNote(
        version="2.0.0-alpha.W.hetzner",
        released=date(2026, 5, 22),
        title="Eigene Infrastruktur (Hetzner Cloud, EU)",
        highlights=[
            "cubetracker läuft jetzt auf einer eigenen Hetzner-Cloud in "
            "Deutschland (EU) — mit eigener Domain, HTTPS und täglichen "
            "Backups. Alle Daten wurden 1:1 übernommen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.pb-history",
        released=date(2026, 5, 20),
        title="Alle PBs sichtbar + PB-Verlauf-Chart",
        highlights=[
            "User-Wunsch: nicht nur die aktuelle Bestzeit, sondern JEDE Zeit, "
            "die zum Zeitpunkt ihres Setzens ein persönlicher Rekord war, wird "
            "in der Solve-Liste als PB markiert. Aktueller Allzeit-PB kräftig "
            "gold (Stern ★), alte (inzwischen überbotene) PBs dezent (☆).",
            "Neuer 'PB-Verlauf'-Chart im Analyse-Tab: die absteigende Treppe "
            "deiner Rekorde über die Zeit. Umschaltbar zwischen Single, ao5 und "
            "ao12 — so siehst du deine Verbesserung auf einen Blick.",
            "Die PB-Progression wird serverseitig über ALLE Solves des aktuellen "
            "Filters berechnet (nicht nur das geladene Listen-Fenster), damit "
            "auch sehr alte Rekorde korrekt erscheinen. DNF zählt nicht, +2 wird "
            "als Effektivzeit gewertet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.umlauts-qa",
        released=date(2026, 5, 19),
        title="Umlaut-Nachzieher (Bestätigung, Lädt, zwölf, …)",
        highlights=[
            "Folge-Welle zur grossen Umlaut-Migration. User-Befunde nach "
            "Deploy: 'Laedt…' im Boot-Splash + Backup-Loading, 'Bestaetigung' "
            "unter /Verwaltung/Daten, 'zwoelf' als Voice-Alert-String.",
            "Audit-Skript extrahiert alle Worte mit ae/ue/oe-Pattern, "
            "filtert english/Code-Identifier raus, listet echte deutsche "
            "Treffer. Damit drei zusätzliche Skript-Pässe mit erweiterter "
            "Wortliste durchgenudelt.",
            "Direkt User-relevante Fixes: Bestaetigung → Bestätigung (5×), "
            "zwoelf → zwölf (Voice-Alert auf DE), Loescht → Löscht, "
            "Empfaenger → Empfänger, Schaetzung → Schätzung. Plus alle "
            "Endungen (noetig/laeuft/zusaetzlich/pruefen/ungueltig/Laender/"
            "zuruecksetzen/druecken/Granularitaet/uebrig/fehlschlaegt/"
            "muehsam/Rueckgabe/faellt/unterstuetzt/zukuenftig/erhoeht/...).",
            "Gesamt 487 weitere Replacements über 102 Files in 3 Pässen, "
            "plus 5 manuelle Edits für die letzten Rest-Vorkommen.",
            "Verbleibende Audit-Treffer sind alle false positives: "
            "englisch (Query/Request/Issue/continue), Code-Identifier "
            "(target_value, requester_id, github_issue_*), und deutsche "
            "Worte ohne Umlaut (neu*/aktuell*/manuell/Quelle/visuell/"
            "Sequenz/feuer*/Dauer).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.umlauts",
        released=date(2026, 5, 17),
        title="Umlaute zurück (ä, ö, ü, ß) auf der gesamten Webseite",
        highlights=[
            "User-Wunsch: deutsche Texte sollen wieder mit Umlauten "
            "geschrieben werden, nicht mit den ASCII-Substituten "
            "(ae/ue/oe/ss). Betrifft alle User-sichtbaren Strings — "
            "UI-Labels, Tooltips, Patch-Notes, Roadmap, Features-Liste.",
            "1417 Ersetzungen über 140+ Files (Frontend .ts/.tsx + "
            "Backend .py). Skript-getrieben mit kuratierter Wortliste "
            "von ~250 deutschen Worten und deren ASCII-Vorgänger-Form.",
            "Sicher gehalten: Vendor-Files (cstimer-vendor/ + "
            "scrambow-patched.*) bleiben unangetastet — GPL-Code und "
            "3rd-Party-Patches in Originalschreibweise. Tests 158/158 "
            "weiterhin grün, Backend startet sauber.",
            "Konvention ab jetzt: deutsche Texte mit Umlauten + ß. "
            "Code-Identifier (Variablen, Funktionen, Konstanten) "
            "bleiben weiterhin ASCII — kein 'Größe = ...' als "
            "Variable-Name.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-workflow-qa",
        released=date(2026, 5, 17),
        title="QA-Fixes auf Admin-Workflow (2 KRITISCH + 4 SOLLTE + 2 NICE)",
        highlights=[
            "Sub-Agent-QA der 3 Admin-Phasen hat 2 KRITISCH + 7 SOLLTE + "
            "5 NICE gefunden. Davon 2 KRITISCH + 4 wichtigste SOLLTE + "
            "2 NICE sofort gefixt, 2 SOLLTE als Roadmap.",
            "KRITISCH #1: Race-Condition beim 'letzter Admin'-Safeguard "
            "wurde mit SELECT ... FOR UPDATE behoben. Zwei parallele "
            "Demotes auf den vorletzten Admin können jetzt nicht mehr "
            "beide durchgehen — Lock greift, zweiter Request wartet + "
            "sieht aktualisierten Stand. Postgres-native row-level locking.",
            "KRITISCH #2 (Alembic-Replacement): aufgeschoben als Roadmap-"
            "Item in P6. Risiko aktuell niedrig (IS_PROD-Gate + Postgres-"
            "Prod), aber Lesson notiert.",
            "SOLLTE: responded_at wird jetzt NUR bei Status-Change "
            "überschrieben, nicht bei reinen Notiz-Updates. 'Wann war "
            "der Test wirklich' bleibt stabil.",
            "SOLLTE: GitHub-API-Calls jetzt asynchron via FastAPI-"
            "BackgroundTasks mit eigener DB-Session. User-Response geht "
            "sofort raus, kein Worker-Block bei GitHub-Latenz oder "
            "Rate-Limits.",
            "SOLLTE: GitHub-API-Error-Bodies werden NICHT mehr geloggt "
            "(defense-in-depth gegen hypothetische Token-Reflektion). "
            "Nur Status-Code + Reason + Exception-Klassen-Name.",
            "SOLLTE: confirm()-Dialog in AdminLiveTestsPanel raus, "
            "2-Klick-Pattern rein (analog BigTimerInput-Fix). Button "
            "wechselt zu 'Wirklich?' (rot-pulsierend), 5s-Auto-Reset.",
            "NICE: Skip-Filter-Pill in der Liste ergänzt. "
            "title[:256] statt vorher willkuerlichem [:200].",
            "Roadmap-Items neu: Backend-Test-Suite einfuehren (aktuell "
            "0% Test-Coverage auf Backend!) + Alembic-Migration "
            "statt inline ALTER TABLE.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-tests-github",
        released=date(2026, 5, 17),
        title="Live-Test-FAIL → automatisches GitHub-Issue (Phase 3 von 3)",
        highlights=[
            "Schliesst den Live-Test-Loop. Bei FAIL + Notiz wird "
            "automatisch ein GitHub-Issue im Repo erstellt — der nächste "
            "Fix-Schritt landet sofort als trackbares Issue.",
            "Neues Modul: services/github.py mit create_issue() + "
            "add_comment(). Nutzt httpx (haben wir schon), GitHub-API-"
            "Version 2022-11-28. 8s Timeout.",
            "Konfiguration: Env-Var GITHUB_TOKEN (Personal Access Token "
            "mit repo-Scope) + optional GITHUB_REPO (default "
            "'fischehaus/cubetracker'). Setze auf Render unter "
            "Environment-Tab.",
            "Workflow: Admin markiert Test als FAIL + schreibt Notiz → "
            "Backend baut strukturierten Issue-Body (Beschreibung + "
            "Notiz + Welle/Commit/Tag-Kontext) → create_issue mit "
            "Labels 'live-test-fail' + 'automated' + 'phase:W.xyz'. "
            "Issue-URL + Nummer wird in DB gespeichert.",
            "Update-Logik: bei späteren PATCHes auf einem bereits-FAIL-"
            "Test mit existierendem Issue → add_comment() statt erneutem "
            "create. So bleibt der Issue-Thread synchron mit den Admin-"
            "Notizen.",
            "Graceful Degradation: ohne GITHUB_TOKEN funktioniert alles "
            "normal, nur ohne Issue-Verknüpfung. Bei Network-Errors / "
            "Rate-Limits: Test wird trotzdem gespeichert, nur Warning "
            "im Log.",
            "Damit ist der Admin-Workflow-Refactor (3 Phasen seit "
            "heute Mittag) abgeschlossen: Admin-User-Toggle + Live-Test-"
            "Liste + GitHub-Sync.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-tests",
        released=date(2026, 5, 17),
        title="Live-Test-Liste im Admin-Bereich (Phase 2 von 3)",
        highlights=[
            "Löst ein echtes Workflow-Problem: Test-Hinweise aus Claude-"
            "Deploys ('Phone-Test: X, Y, Z bitte') verlieren sich aktuell "
            "im Chat. Bei Compaction weg, bei nächster Session vergessen. "
            "Phone-Tests passieren oft nicht.",
            "Neuer Panel im Admin-Bereich: Liste aller Live-Tests mit "
            "Filter (Offen / Alle / Pass / Fail). Pro Test: Titel + "
            "Beschreibung + Status-Badge + Notiz + Aktionen "
            "(PASS / FAIL / SKIP / Reopen).",
            "Workflow: Claude sagt im Chat 'teste bitte X'. Du klickst "
            "'+ Neu', paste Title + Beschreibung. Später testest du auf "
            "Phone, klickst PASS oder FAIL+Notiz. Notiz kann jederzeit "
            "editiert werden.",
            "Datenmodell: neue Tabelle live_tests (id, title, description, "
            "related_phase, related_commit_sha, related_tag, status, "
            "user_response, responded_at, responded_by_user_id, "
            "github_issue_url, created_at, created_by_user_id). Wird "
            "automatisch beim ersten Startup via create_all() angelegt.",
            "Backend: 4 neue Endpoints unter /admin/live-tests (GET mit "
            "Status-Filter, POST, PATCH, DELETE). Alle hinter require_admin, "
            "30/min Rate-Limit.",
            "Phase 3 (kommt noch): bei FAIL + Notiz wird automatisch ein "
            "GitHub-Issue erstellt (mit GITHUB_TOKEN-Env-Var). Aktuell "
            "wird github_issue_url-Feld nur für manuelle Einträge "
            "vorbereitet.",
            "Bundle-Impact: +2.3KB gzipped (Panel + Hooks). Total "
            "Bundle jetzt 420KB gz.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-toggle",
        released=date(2026, 5, 17),
        title="Admin-Status via UI toggeln (statt nur ADMIN_EMAILS-Env-Var)",
        highlights=[
            "Phase 1 von 3 für das Admin-Workflow-Refactor. Vorher: "
            "Admin-Status war computed property aus der ADMIN_EMAILS-Env-"
            "Var auf Render. Wer rein/raus wollte, brauchte Env-Var-Edit "
            "+ Server-Restart. Jetzt: DB-Spalte users.is_admin + Toggle "
            "via Admin-UI.",
            "Mini-Migration in main.py:lifespan: ADD COLUMN is_admin + "
            "Bootstrap-Step (User mit Email in ADMIN_EMAILS bekommen "
            "is_admin=TRUE beim ersten Startup). Idempotent — bestehende "
            "Promotes/Demotes bleiben unangetastet.",
            "Neuer Button in AdminUsersPanel-Tabelle: '★ Admin abnehmen' / "
            "'☆ Admin machen' pro User-Zeile (ausser für sich selbst).",
            "Safeguard: letzter Admin kann sich nicht entzogen werden — "
            "Backend wirft 400 wenn nach Demote keine Admins mehr übrig "
            "wären. Aussperren-Risiko gebannt.",
            "Nächste Phasen: Live-Test-Liste im Admin-Bereich (Phase 2) "
            "+ GitHub-Issue-Auto-Create bei FAIL (Phase 3). Kommen "
            "separat um kleinere Iterationen zu fahren.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-more-puzzles-qa",
        released=date(2026, 5, 17),
        title="QA-Fixes auf csTimer-Erweiterung (8 Befunde behoben)",
        highlights=[
            "Sub-Agent-QA hat 1 KRITISCH + 5 SOLLTE + 4 NICE gefunden. "
            "Davon 1 KRITISCH + 3 SOLLTE + 2 NICE sofort gefixt, 2 SOLLTE "
            "als Roadmap-Items dokumentiert.",
            "KRITISCH #1: COMMON_CUBE_TYPES enthielt die neuen Cubes nicht "
            "— User konnte sie im Scramble-Picker wählen, aber NICHT als "
            "cube_type für Solve-Speicherung setzen. Ergänzt: Ivy, Gear, "
            "Redi, Master Pyraminx, Master Skewb, FTO, Dino, Floppy, Tower. "
            "Plus cubeTypeToScrambowType-Cases.",
            "SOLLTE #2: 'Bandaged 3x3 (Square)'-Label war falsch — csTimer "
            "'bsq' ist tatsaechlich Bandaged-Square-1. Cube war eh broken "
            "(SOLLTE #3) und wurde komplett entfernt.",
            "QA-Runtime-Check hat aufgedeckt: 7 von 11 neuen Cubes "
            "(helicopter/gigaminx/bicube/bandaged-sq1/square-2/curvy-copter/"
            "diamond) returnen leerstring und Megaminx-RS returnt null, "
            "weil src/js/solver/-Files nicht vendored sind. Saubere Lösung: "
            "vorerst raus aus UI, in Roadmap als P6-Item mit Solver-"
            "Vendoring-Aufwand notiert.",
            "Nach Cleanup: inoffizielle Cube-Liste wieder bei 9 (statt 16): "
            "Ivy, Gear, Redi, Master Pyraminx, Master Skewb, FTO, Dino, "
            "Floppy, Tower. Alle 8 davon mit Random-State (master_skewb "
            "weiter Random-Move).",
            "SOLLTE #5: ScrambleNet zeigt jetzt auch 2D-Net für OH + 3BLD "
            "(beides mechanisch 3x3-Scrambles).",
            "SOLLTE #6: Test-Whitelist statt nur 'non-empty' — fängt "
            "Bug-Klassen wie '???' oder leerstring ab. Eigenes mgmso-Test "
            "hat damit den megaminx-Bug aufgedeckt (typeof null === "
            "'object' war Test-Bug).",
            "NICE #7+#8: Code-Hygiene (toter rotateFace180/CCW + void-"
            "ESLint-Trick raus, tote Loop im Sexy-Move-Test raus).",
            "Bundle-Win: -40KB raw / -14KB gz (utilscramble.js + "
            "grouplib.js + poly3dlib.js + megaminx.js entfernt). Total "
            "Bundle jetzt 418KB gz (vorher 432).",
            "Lesson: Vendor-Smoke-Tests nicht nur 'registered' prüfen, "
            "sondern auch 'liefert valide non-empty Output'. Im aktuellen "
            "Test-File ergänzt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-more-puzzles",
        released=date(2026, 5, 17),
        title="11 weitere Scramble-Types via csTimer (Quick-Wins + Exotische)",
        highlights=[
            "Massiv-Erweiterung der inoffiziellen Cube-Liste. Im Scramble-"
            "Picker stehen jetzt 16 inoffizielle Cubes zur Wahl (vorher 6).",
            "Neu via vendored csTimer (kleine Files): Dino Cube, Floppy "
            "Cube (1x3x3), Tower Cube (2x2x3). Plus: Megaminx hat jetzt "
            "echte Random-State (vorher scrambow random-move) — Quality-"
            "Upgrade für den WCA-Cube.",
            "Neu via vendored csTimer (utilscramble.js): Helicopter Cube, "
            "Gigaminx (5x5 Megaminx), Bicube, Bandaged 3x3, Square-2, "
            "Curvy Copter, Diamond Cube. Sammler-Puzzles auf einmal "
            "verfügbar.",
            "Alle 11 neuen Cubes haben Random-State-Scrambles (= Mindest-"
            "Distanz garantiert) — der „nicht WCA-Quality\"-Disclaimer "
            "im Scramble-Picker greift jetzt NUR noch für Master Skewb.",
            "Bundle-Impact: +46KB raw / +16KB gzipped (grouplib + "
            "poly3dlib + utilscramble + 3 Mini-Files). Insgesamt nutzt "
            "Cubetracker jetzt 7 csTimer-Modul-Files (gearcube, redi, "
            "pyraminx, skewb, mgmlsll, megaminx, utilscramble) plus die "
            "Foundation-Files (mathlib, scramble, isaac, grouplib, "
            "poly3dlib).",
            "Geplant für P4 Power-User-Phase: 3x3-/4x4-Trainer-Subsets "
            "via csTimer (ZBLL, ZBLS, VLS, COLL, Roux, EOline, 2gen, CTO, "
            "EDO, ELL, ...). scramble_333_edit.js + scramble_444.js sind "
            "größer (36KB + 77KB) — daher als zukünftige Phase, nicht "
            "als Quick-Win.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-ivy-switch",
        released=date(2026, 5, 17),
        title="Ivy-Cube: Scrambler von Eigenbau auf csTimer umgestellt",
        highlights=[
            "User-Beobachtung: csTimer kann Ivy-Cube scramblen. Bei der "
            "ersten Recherche zum Vendor-Port hatte ich nur nach 'ivy.js' "
            "gesucht — der Ivy-Scrambler ist aber überraschend im "
            "skewb.js-File mit-versteckt (registriert via "
            "`scrMgr.reg(['ivyo', 'ivyso'], ...)` am Ende der Datei).",
            "Konsequenz: Ivy läuft jetzt über csTimer ('ivyso' = Random-"
            "State). Unser Eigenbau-BFS-Solver (ivyScramble.ts mit 29.160-"
            "State-Lookup-Tabelle) bleibt als defensiver Fallback hinter "
            "csTimer im Cascade. Wenn csTimer crashen sollte, springt "
            "automatisch der Eigenbau ein.",
            "Vorteil: Konsistenz mit Gear / Redi / Master Pyraminx. "
            "Identischer Scramble-Style wie bei csTimer-Usern.",
            "Kein 2D-Net für Ivy: unser Renderer (ScrambleNet) kann "
            "aktuell nur 3x3. csTimer rendert Ivy auch nicht in 2D. "
            "Wenn das jemand vermisst, können wir's später selbst bauen "
            "(~1 Tag, Ivy-Geometrie = 4 dreieckige Faces + 4 Eck-Caps).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-vendor",
        released=date(2026, 5, 17),
        title="csTimer-Scrambles für Gear / Redi / Master Pyraminx",
        highlights=[
            "Direkter Folge-Schritt nach der GPL-Migration. csTimer-"
            "Source-Files vendored unter webapp/frontend/src/lib/"
            "cstimer-vendor/ (mathlib, scramble, gearcube, redi, "
            "pyraminx, skewb, mgmlsll, isaac + Mini-jQuery-Shim).",
            "Gear Cube, Redi Cube, Master Pyraminx haben jetzt echte "
            "Random-State-Scrambles (vorher Random-Move-Sequenz). "
            "Identisch zu csTimer-Output, WCA-quality im Sinne "
            "garantierter Mindest-Distanz.",
            "Ivy bleibt auf unserem Eigenbau-BFS-Solver — csTimer hat "
            "kein Ivy-Modul. Master Skewb bleibt auf Random-Move-"
            "Fallback — csTimer hat auch keinen dedizierten Master-"
            "Skewb-Generator (mgmlsll.js ist Megaminx-LSLL, nicht "
            "Master Skewb).",
            "Bundle-Impact: +52KB raw / +19KB gzipped (mathlib+isaac "
            "sind die größten Brocken). Vergleich: cubing.js wäre "
            "~150-500KB gewesen.",
            "Disclaimer 'kein Random-State'-Hinweis wird jetzt NUR "
            "für Master Skewb angezeigt (vorher für alle inoffiziellen "
            "Custom-Puzzles).",
            "Lessons applied: csTimer-Source-Files sind reines pure-JS "
            "(IIFE-Pattern, kein Buffer/Node). Der cstimer_module-NPM-"
            "Crash 2026-05-16 war ein Packaging-Problem, kein Source-"
            "Problem. Direkt-Vendoring umgeht das.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.gpl-license-migration",
        released=date(2026, 5, 17),
        title="Lizenz-Migration auf GPL-3.0-or-later",
        highlights=[
            "Cubetracker steht ab heute unter GNU General Public "
            "License v3 (oder später). Vorher war kein expliziter "
            "Lizenz-Eintrag im Repo, was per Default 'all rights "
            "reserved' bedeutet hat.",
            "Hintergrund: Vorbereitung für die Integration von "
            "csTimer-Scramble-Algorithmen (selbst GPL-v3) für "
            "inoffizielle Puzzles wie Gear, Redi, Master Pyraminx, "
            "Master Skewb. GPL ist Copyleft — alles was csTimer-"
            "Code beinhaltet, muss komplett GPL sein.",
            "Was sich ändert: LICENSE-File im Repo (GPL-v3 "
            "Volltext), license-Field in package.json + pyproject.toml, "
            "README-Sektion umgeschrieben.",
            "Was bleibt: Source ist eh schon public auf GitHub, "
            "die App ist non-commercial. GPL passt zum Speedcubing-"
            "Community-Ethos.",
            "Konsequenz: Forks/Derivate müssen ebenfalls GPL-v3 "
            "(oder kompatibel) sein. Keine proprietaeren Closed-"
            "Source-Forks möglich. Re-Lizenzierung wäre nur mit "
            "Zustimmung aller Contributor möglich — einseitiger "
            "Schritt, bewusst.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-image-toggle",
        released=date(2026, 5, 17),
        title="Schnell-Toggle für das 2D-Net direkt im /timer-Tab",
        highlights=[
            "Direkter Folge-Iteration zum 2D-Net (scramble-image): "
            "Bild ein/aus geht jetzt mit einem Klick in der "
            "ScrambleCard, ohne den Umweg über /einstellungen/Timer.",
            "Button 'Bild an' / 'Bild aus' sitzt neben 'Eigene' und "
            "'Skip'. Visualer State: aktiviert (lila Highlight) wenn "
            "das Bild eingeblendet ist, dim wenn aus.",
            "Erscheint NUR für Cube-Types, für die das 2D-Net "
            "überhaupt rendert (aktuell nur 3x3). Bei 4x4, Pyraminx "
            "etc. wäre der Toggle wirkungslos und wird ausgeblendet "
            "— vermeidet Verwirrung.",
            "Settings-Panel-Hint mit-aktualisiert: User wird auf den "
            "Schnell-Toggle hingewiesen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-image",
        released=date(2026, 5, 17),
        title="2D-Cube-Net unter dem Scramble (visuelle Verifikation)",
        highlights=[
            "P1.5 aus dem Quick-Wins-Sprint. Unter jedem 3x3-Scramble "
            "zeigt sich jetzt das Cross-Layout-Bild des Cubes nach "
            "Anwendung des Scrambles. Standard-Erwartung an Speedcubing-"
            "Timer — endlich Parity mit csTimer.",
            "Komplett Eigenbau (lib/cube-net.ts, ~250 Zeilen): kleiner "
            "Cube-State-Simulator (6×9 Sticker-Array, 18 Basic-Moves) + "
            "SVG-Renderer. Bundle nur +1.7kB gzipped — kein Lib-Dep, "
            "kein cstimer_module-Browser-Polyfill-Risiko.",
            "Logik verifiziert durch 20 Tests (cube-net.test.ts): "
            "Identitäten (R+R'=solved, 4xR=solved), Centers nie "
            "geändert, bekannte Group-Orders (Sune Order 6, T-Perm "
            "Order 2, Sexy-Move Order 6), 5 Random-Scrambles + Inverse.",
            "Aktuell nur 3x3 — andere Cube-Types zeigen kein Bild "
            "(2x2/4x4/Pyra kommen schrittweise, Code ist erweiterbar).",
            "Setting in /einstellungen/Timer: '2D-Net unter dem "
            "Scramble anzeigen' (default an). Power-User können "
            "ausschalten wenn sie pure Notation wollen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.qa-fixes-p1",
        released=date(2026, 5, 17),
        title="QA-Fixes zu Voice-Alert / Penalty-Buttons / Quick-Aktionen",
        highlights=[
            "Voice-Alert: globaler speechSynthesis.cancel()-Call entfernt. "
            "Vorher konnte unsere TTS-Ansage Screen-Reader-Ausgaben (NVDA / "
            "VoiceOver) abbrechen. Das Risiko ist real, der Overlap-Schutz "
            "war eh überkonstruiert (4s Abstand zwischen 'acht' und 'zwölf').",
            "Voice-Alert: Safari iOS bekommt jetzt eine 0-Volume-Dummy-"
            "Utterance beim ersten Spacebar-Press, damit die Voice-Engine "
            "warm läuft. Vorher konnte die erste TTS-Ansage stumm bleiben.",
            "Penalty-Quick-Buttons: Klick auf DNF entfernt automatisch ein "
            "vorhandenes +2 (WCA-konform, beides ist nicht kombinierbar). "
            "Dieses Verhalten ist jetzt im Button-Tooltip explizit erklärt, "
            "vorher hat es das Flag still gelöscht.",
            "Penalty-Quick-Buttons: 'Letzter Solve:' zeigt jetzt zusätzlich "
            "den Cube-Type (z.B. 'Letzter Solve (3x3):'), damit klar bleibt "
            "welcher Solve gerade editiert wird.",
            "Löschen-Quick-Aktion: window.confirm() raus, Zwei-Klick-Pattern "
            "rein. Erster Klick aktiviert den Button (rot pulsierend), "
            "zweiter Klick innerhalb 5s löscht. Sicherer auf Mobile + ohne "
            "Browser-Native-Dialog-Abhängigkeit.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-frontend",
        released=date(2026, 5, 17),
        title="Roadmap-Anzeige im Frontend (Modal mit Phasen P1-P6)",
        highlights=[
            "P1.4 aus dem Quick-Wins-Sprint. Neues RoadmapModal zeigt "
            "die 6 Phasen mit Items, Aufwand-Schätzung und Status. "
            "Transparent für User was geplant ist + warum.",
            "Triggerbar via Footer-Link 'Roadmap' UND User-Menu oben "
            "rechts. Beide Wege parallel = mehr Sichtbarkeit.",
            "Single-Source webapp/frontend/src/lib/roadmap-data.ts — "
            "Roadmap-Updates brauchen kein Backend-Deploy, nur "
            "Frontend-Build.",
            "Status-Kodierung: aktiv (lila) / geplant (amber) / future "
            "(grau) / ongoing (blau). Bereits abgeschlossene Items pro "
            "Phase mit ✓ + Strikethrough.",
            "Hinweis im Modal: 'fehlt was? Sag's uns via Feedback-Link "
            "oder GitHub' — closed-the-loop zum Feedback-Kanal.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.custom-scramble",
        released=date(2026, 5, 17),
        title="Custom-Scramble eintippen statt random generieren",
        highlights=[
            "P1.3 aus dem Quick-Wins-Sprint. Neuer Edit-Button in der "
            "ScrambleCard. Klick darauf öffnet eine Textarea wo der "
            "User einen eigenen Scramble eintippen kann.",
            "Use-Cases: Wettkampf-Scramble aus der WCA-Live-Anzeige "
            "übernehmen, Algorithmus-Drill mit fixer Sequenz, Scramble "
            "aus einer anderen App fortsetzen.",
            "Bedienung: Enter speichert, Esc bricht ab. Custom-Scramble "
            "überlebt Cube-Type-Wechsel nicht (Auto-Reset). Skip-Button "
            "verwirft Custom + generiert neuen Random.",
            "Visueller Hinweis bei aktivem Custom-Scramble: kleiner "
            "lila Badge ev eigene Eingabe neben dem Scramble.",
            "Keine Validierung der Notation — der User weiss was er "
            "eintippt. Defensive Trim auf Whitespace.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.penalty-quick",
        released=date(2026, 5, 17),
        title="Penalty-Quick-Buttons direkt unter dem Timer",
        highlights=[
            "P1.2 aus dem Quick-Wins-Sprint. Nach jedem Save erscheint "
            "unter dem großen Timer-Display ein Mini-Toolbar mit "
            "+2 / DNF / Löschen — Korrektur ohne den Weg über die "
            "Letzte-Solves-Sidebar.",
            "Funktioniert in beiden Modi (Text + Spacebar). Im Spacebar-"
            "Modus besonders nützlich: wenn die Inspection-Penalty "
            "(automatisch detected) doch nicht passte, schnell "
            "korrigieren.",
            "Buttons zeigen den aktuellen Zustand visuell („✓ +2\” wenn "
            "aktiv) und togglen bei Klick. Löschen mit Confirm-Dialog. "
            "↺-Button blendet die Mini-Toolbar manuell aus.",
            "Auto-Reset bei Cube- oder Session-Wechsel — verhindert dass "
            "die „Letzter Solve war 3x3\”-Anzeige im 4x4-Kontext weiter "
            "blinkt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.voice-alert",
        released=date(2026, 5, 17),
        title="Voice-Alert für Inspection-Warnings (csTimer-aequivalent)",
        highlights=[
            "Erstes Item aus dem Quick-Wins-Sprint P1: Inspection-Audio-"
            "Calls bei 8s + 12s können jetzt als gesprochene Stimme "
            "statt Sinus-Beep abgespielt werden.",
            "Vier Modi wählbar (Verwaltung → Einstellungen → Inspection):"
            " 🔔 Sinus-Beep (Default, bestehende User merken keinen "
            "Unterschied) — 🇩🇪 Deutsch (acht, zwölf) — 🇬🇧 Englisch "
            "(eight, twelve) — 🔇 Aus.",
            "Voice-Modi nutzen die Browser-Web-Speech-API — kein Asset, "
            "kein Network-Roundtrip, funktioniert offline. Stimme/Akzent "
            "abhängig von Browser + OS.",
            "Fail-soft: wenn TTS nicht verfügbar (alter Browser, "
            "Permission-Block), fällt der Solve-Flow unbeeintraechtigt "
            "weiter.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-usermenu",
        released=date(2026, 5, 17),
        title="Feedback geben: zusätzlich im User-Menu oben rechts",
        highlights=[
            "Footer-Link war versteckt — viele User scrollen nie ans Ende. "
            "Feedback-Item jetzt auch im User-Menu (Avatar oben rechts) "
            "neben Mein Account / Patch Notes / Was kann diese App.",
            "Funktional identisch: öffnet dasselbe FeedbackModal mit "
            "GitHub-Issue-Tab + Email-Form-Tab.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback",
        released=date(2026, 5, 17),
        title="Feedback-Kanal: GitHub-Issues + Email-Form ohne GitHub-Account",
        highlights=[
            "Neuer Footer-Link 💬 Feedback in der App. Oeffnet ein Modal "
            "mit zwei Wegen: GitHub-Issue (für Profi-User mit Account) "
            "oder Email-Form (für alle anderen).",
            "GitHub-Issue-Templates angelegt unter .github/ISSUE_TEMPLATE/ "
            "für Bug-Reports + Feature-Wünsche. Strukturierte Form-Felder "
            "fuhren Schritt-für-Schritt durch die wichtigen Fragen.",
            "Email-Form-Mode: User schreibt Nachricht (10-4000 Zeichen), "
            "Backend schickt via vorhandene Resend-Infrastruktur an die "
            "erste ADMIN_EMAILS-Adresse. User-Email + Display-Name werden "
            "im Body mitgeschickt, damit Antwort möglich ist.",
            "Hartes Rate-Limit 3/Stunde pro IP gegen Spam. Auth pflicht "
            "(nur eingeloggte User können Feedback schicken).",
            "Vorbereitung: Repo soll public werden, damit die GitHub-"
            "Issue-Links funktionieren. Secret-Audit ist clean (keine "
            ".env-Files, keine hardcoded Tokens, keine echten User-Daten "
            "im Code) — Repo-Switch via GitHub-Settings ohne weitere "
            "Vorarbeit möglich.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ivy-rs",
        released=date(2026, 5, 17),
        title="Ivy Cube: echte WCA-Quality-Scrambles (Eigenbau-Solver)",
        highlights=[
            "Erster Eigenbau-Random-State-Solver für ein Custom-Puzzle. "
            "Ivy Cube hat seit jetzt echte WCA-Quality-Scrambles (4-10 "
            "Moves, optimal kurz, garantierte Mindest-Distanz von 4).",
            "Implementation als reines TypeScript-Modul (lib/ivyScramble.ts) "
            "ohne externe Deps — kein cstimer_module mehr (das ist beim "
            "vorigen Versuch am Browser-Buffer-Crash gescheitert). Code "
            "vollstaendig lesbar, BFS-Lookup-Table 29.160 States, baut "
            "beim ersten Aufruf in ~50-200ms.",
            "Referenz: csTimer src/js/scramble/skewb.js (Funktion "
            "getScrambleIvy). Gleiche State-Repräsentation (360 Center-"
            "Permutationen × 81 Corner-Twists), gleiche Move-Notation "
            "(R/L/D/B), aber sauber als TypeScript ohne csTimer-mathlib-"
            "Dependency.",
            "Bundle-Size sogar KLEINER als beim cstimer_module-Versuch: "
            "389 KB gzipped (vs 478 KB cstimer-Variante, vs 295 KB "
            "Random-Move-Variante davor). Eigenbau-Code = ~250 Zeilen TS.",
            "Disclaimer in der ScrambleCard angepasst: zeigt sich nur "
            "noch für Gear/Redi/Master Pyra+Skewb. Ivy ist jetzt in der "
            "WCA-Quality-Liga.",
            "Nächster Schritt (falls gewünscht): Gear Cube + Redi Cube "
            "+ Master Pyraminx + Master Skewb mit derselben Template-"
            "Methode. Gear ist als nächstes geplant.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.revert-cstimer",
        released=date(2026, 5, 17),
        title="HOTFIX-REVERT: cstimer_module wegen Browser-Crash zurueckgerollt",
        highlights=[
            "Sorry — cstimer_module-Einbau (6d7a0eb) hat die Seite gekillt.",
            "Root-Cause: cstimer_module nutzt 12x Node.js-Buffer-Globals "
            "direkt im Top-Level-Init. Im Browser existiert Buffer nicht "
            "ohne Polyfill (vite-plugin-node-polyfills o.ae.) — Bundle "
            "wurde sauber gebaut, crashte aber sofort beim Module-Load "
            "im Browser.",
            "Lokaler Vite-Build + Node-Smoke-Test waren grün weil im "
            "Node-Kontext Buffer immer existiert. Browser-Test hätte "
            "den Bug sofort gezeigt — das machen wir kuenftig vor jedem "
            "neuen NPM-Package mit Headless-Chrome o.ae.",
            "Stand wieder bei 60148cd (Random-Move-Scrambles mit "
            "korrigierter Notation). Ivy/Gear/Redi/Master Pyra+Skewb "
            "sind keine WCA-Quality, aber Notation ist sauber + "
            "Disclaimer in der ScrambleCard ehrlich.",
            "Nächster Versuch (separater Branch zuerst): "
            "vite-plugin-node-polyfills einbauen + cstimer_module "
            "isoliert testen mit Headless-Browser bevor wir Production "
            "antasten.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-quality",
        released=date(2026, 5, 17),
        title="Inoffizielle Scrambles: Notations-Bugs gefixt + ehrlicher Disclaimer",
        highlights=[
            "User-Befund: einige Custom-Scrambles waren falsch. Recherche "
            "bestätigt zwei echte Bugs in scramble.ts:",
            "GEAR CUBE (kritischer Bug): wegen der Zahnrad-Mechanik sind "
            "physikalisch nur 180-Grad-Drehungen möglich (Quelle: Wikipedia/"
            "Gear-Cube). Meine alte Spec hatte nur 3 Faces (U/R/F) statt 6 "
            "und mischte 90 + 180 Grad. Jetzt: alle 6 Faces (U/D/L/R/F/B), "
            "ausschließlich 2-Suffix.",
            "IVY CUBE: falsche Achse F statt U. Standard-Notation per "
            "Speedsolving-Wiki ist U/L/R/B für die 4 Eck-Achsen. "
            "Scramble-Länge auf csTimer-Default 8 reduziert.",
            "Ehrlicher UI-Disclaimer in der ScrambleCard für inoffizielle "
            "Cubes: 'Random-Move-Sequenzen mit korrekter Notation, kein "
            "Random-State-Solver — gut fürs Training, nicht 100% Wettkampf-"
            "vergleichbar'. FTO bleibt ausgenommen (scrambow-generiert, "
            "WCA-quality).",
            "Redi + Master Pyra/Skewb: Notation belassen (csTimer-MoYu-"
            "Variante ist nicht eindeutig dokumentiert, unsere Approximation "
            "ist plausibel).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-card-mo3-ao100",
        released=date(2026, 5, 17),
        title="LIVE-Karte: 4 Averages — Tabelle wieder ohne Scroll",
        highlights=[
            "Live-Karte (Timer-Tab) zeigt jetzt 4 Averages in 2x2-Grid: "
            "Mo3, AO5, AO12, AO100. Vorher nur AO5 + AO12. Mo3 wird "
            "clientseitig aus dem schon geladenen rolling-Map abgeleitet, "
            "AO100 kommt aus dem bestehenden Stats-Endpoint.",
            "Letzte-Solves-Tabelle (Timer-Tab): AO100-Spalte wieder raus. "
            "Hintergrund: AO100 ändert sich pro Zeile praktisch nicht "
            "(100er-Fenster). In der Tabelle wenig informativ, in der "
            "Live-Karte oben deutlich besser aufgehoben.",
            "Tabelle ohne AO100 hat jetzt nur 5 Spalten (Nr / Zeit / Mo3 / "
            "AO5 / AO12 + Löschen) — passt wieder ohne horizontalen Scroll "
            "in die schmale Sidebar. Das min-w-[420px] + overflow-Scroll "
            "ist raus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.abschluss-skill",
        released=date(2026, 5, 16),
        title="Session-Ende-Check: /abschluss-Slash-Command + Stop-Hook-Backstop",
        highlights=[
            "Neuer Slash-Command /abschluss für den User-getriggerten "
            "Session-Ende-Check. Geht eine 8-Punkte-Liste durch: "
            "uncommitted Änderungen, unpushed Commits, fehlende Patch-"
            "Notes-Einträge, fehlende Git-Tags, features-data.ts-Update, "
            "Doku-Aktualität, offene Todos, Backend-Smoke-Test (lokal "
            "Parse + Module-Import). Bei Luecken bietet Fixes an.",
            "Neuer Stop-Hook stop-mini-check.sh: läuft 1x pro Session "
            "(via once:true) als Mini-Backstop wenn Claude zum ersten Mal "
            "antwortet. Meldet nur das absolut Wichtigste (uncommitted + "
            "unpushed) und verweist auf /abschluss für den vollen Check.",
            "Konvention in CLAUDE.md verankert: bei Aussagen wie „Session "
            "beenden\” / „das wars für heute\” → /abschluss proaktiv "
            "aufrufen. Plus Hinweis-Block über Patch-Notes-Konvention, "
            "Tag-Konvention, features-data.ts-Konvention.",
            "Hintergrund: heute (2026-05-16) ist mehrfach was durchge"
            "rutscht: 26 ungetaggte Patch-Notes-Versionen, features-data.ts "
            "wurde erst nach User-Nachfrage aktualisiert, Quote-Bug hat "
            "5 Render-Deploys gekillt. Der /abschluss-Check fängt all das "
            "in Zukunft systematisch ab.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-update-wca-news",
        released=date(2026, 5, 16),
        title="Was kann die App: Speedcubing-Welt + Country-Update",
        highlights=[
            "Feature-Liste auf der Anmeldeseite + im In-App-Modal um die "
            "heute neuen Features erweitert.",
            "Neue Kategorie Speedcubing-Welt: WCA-Turniere in der Nähe "
            "(mit DACH-Nachbarn-Logik), Speedcubing-News aus drei kuratierten "
            "Quellen, Auto-Refresh-Hinweis, Datenquellen-Transparenz.",
            "Account-Bullet aktualisiert: Postleitzahl ist nicht mehr "
            "Vorbereitung sondern produktiv genutzt — jetzt mit Land "
            "zusammen klar als Speed-Turnier-Filter beschrieben.",
            "HERO-HIGHLIGHTS auf der Login-Seite: einen Snapshot+Backup-"
            "Bullet ersetzt durch WCA-Turniere/News — das ist heute der "
            "wahre Marketing-Wert.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.country-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach Country-Feld-Welle",
        highlights=[
            "HIGH-Bug-Fix: WcaUpcomingCard hat die 422-Detail-Message vom "
            "Backend nicht extrahiert (Axios setzt error.message auf "
            "generisches Request-failed-Status — die echte Message liegt "
            "in error.response.data.detail). Folge: der Onboarding-Empty-"
            "State triggerte NIE, User sahen statt freundlichem Hint die "
            "nutzlose rote Error-Box. Jetzt: explizites Parsing via "
            "AxiosError-Type + Status-422-Match.",
            "MEDIUM-Fix: Login-Endpoint hatte lazy-import von news.refresh "
            "ohne try/except. Wenn feedparser/httpx fehlen (z.B. nach "
            "fehlgeschlagenem Render-pip-install), würde Login 500 werfen "
            "obwohl Auth funktioniert. Jetzt: try/except um den Import — "
            "Auto-Refresh ist nice-to-have, Login hat Prio.",
            "Country-Liste erweitert um 8 fehlende Cube-Communities: "
            "Hongkong (HK, >500 WCA-Cuber), VAE (AE), Neuseeland (NZ), "
            "Aegypten (EG), Marokko (MA), Dominikanische Republik (DO), "
            "Costa Rica (CR), Venezuela (VE). Insgesamt 63 Länder.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.country-feld",
        released=date(2026, 5, 16),
        title="Land-Feld im Profil + WCA-Hinweise sauber",
        highlights=[
            "Neues Profil-Feld „Land” (Dropdown mit 55 Cuber-Ländern, "
            "alphabetisch nach dt. Bezeichnung) zusätzlich zur "
            "Postleitzahl. Vorher haben wir das Land aus der PLZ-Struktur "
            "geraten (5-stellig=DE, 4-stellig=AT, sonst nichts) — das "
            "funktionierte nur für DACH-User.",
            "WCA-Turniere-Endpoint nutzt jetzt User.country_iso2 mit "
            "Vorrang vor der PLZ-Heuristik. Damit funktioniert das "
            "Turnier-Feature weltweit: User in USA, Polen, Japan etc. "
            "bekommen die richtigen Turniere ihres Landes (+ Nachbarn "
            "wo definiert).",
            "Sauber kommunizierte Voraussetzungen: AccountSettingsPanel "
            "zeigt einen Amber-Hint dass „PLZ UND Land beide nötig\” "
            "sind. WcaUpcomingCard zeigt bei fehlenden Feldern den "
            "konkreten Pfad „Verwaltung → Einstellungen → Account → "
            "Profil\” als Empty-State.",
            "DB-Schema: User.country_iso2 VARCHAR(2), via Inline-Migration "
            "(ALTER TABLE ADD COLUMN IF NOT EXISTS) idempotent eingespielt. "
            "Pydantic-Schema mit Pattern ^[A-Za-z]{2}$, im Endpoint wird "
            "uppercased + getrimmt.",
            "Geocoding-Call nutzt jetzt das User-Land statt Heuristik — "
            "Nominatim-Treffer sind deutlich praeziser (z.B. PLZ 8001 "
            "in CH vs AT korrekt aufloesbar).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-neighbors-news-refresh",
        released=date(2026, 5, 16),
        title="WCA: Nachbarländer + News: weitere Quelle + Auto-Refresh bei Login",
        highlights=[
            "WCA-Turniere: zeigt jetzt nicht nur Turniere im eigenen Land, "
            "sondern auch in direkten Nachbarlaendern. Für DE-User: AT, CH, "
            "NL, BE, LU, FR, DK, PL, CZ. Für AT-User: DE, CH, IT, SI, HU, "
            "SK, CZ, LI. Für CH-User: DE, AT, FR, IT, LI. Parallel-Fetch "
            "via asyncio.gather, daher kaum Latenz-Aufschlag.",
            "Speedcubing-News: dritte Quelle dazu — SpeedCubing.org/blog "
            "(World Records, Competition Coverage). RSS-Recherche ergab "
            "dass SpeedCubeShop + TheCubicle keinen public RSS-Endpoint "
            "anbieten — die kaemen nur via HTML-Scraping ran, kein MVP-Wert.",
            "Auto-Refresh bei Login (User-Wunsch): nach erfolgreichem "
            "Login läuft im Hintergrund (NACH der Response, blockt User "
            "nicht) ein Refresh für News + WCA-Caches. Bei warmen Caches "
            "= no-op, bei stale Caches = stiller Refresh. Effekt: wer sich "
            "nach Pause einloggt, sieht frische Daten ohne Wartezeit.",
            "Backend-Module: webapp/news/refresh.py als zentraler Refresh-"
            "Helper. Wird vom Auth-Login-Endpoint als BackgroundTask "
            "getriggert. News-Refresh = sync, WCA-Warmup = async via "
            "asyncio.run im Background-Thread.",
            "Frontend zeigt in der WCA-Card jetzt die Liste der "
            "gequeryten Länder (z.B. 'Länder: DE, AT, CH, NL, ...') "
            "als Footer-Info, damit der User weiss warum sich z.B. ein "
            "Wiener Turnier in seiner Berliner Liste findet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.deploy-fix",
        released=date(2026, 5, 16),
        title="Hotfix: SyntaxError-Quotes in Patch-Notes — alle Render-Deploys grün",
        highlights=[
            "Render-Deploys aller heutigen Welle-Commits sind gescheitert "
            "(5 Fail-Mails: news-backend, news-frontend, dashboard-story, "
            "wca-comps-hardening, wca-news-qa).",
            "Root-Cause: in mehreren Patch-Notes-Strings hatte mein "
            "Bash-Heredoc das deutsche Schliess-Anführungszeichen (U+201D) "
            "fälschlich durch ein ASCII-Quote (U+0022) ersetzt. Das mittlere "
            "ASCII-Quote terminierte den Python-String an einer ungewollten "
            "Stelle, der Rest war Syntaxmuell. 22 solcher Stellen über 13 "
            "Zeilen gefunden.",
            "Fix: alle ASCII-Quotes mitten in Patch-Notes-Strings systematisch "
            "durch das korrekte deutsche Schliess-Anführungszeichen ersetzt. "
            "Backend startet jetzt sauber (lokal mit echten Deps verifiziert).",
            "Konsequenz: zukünftige Patch-Notes nutzen nur ASCII-Quoting "
            "oder explizit-escaped Quotes — kein Mix mehr von deutschen "
            "Anführungszeichen mit Heredoc-faulen Bash-Pipes.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-news-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach WCA/News-Sprint",
        highlights=[
            "Operator-Precedence-Bug im News-Parser behoben: bei feedparser-"
            "Entries ohne `.get`-Methode wurde der link fälschlich None. "
            "Helper `_attr_or_key` mit expliziten Klammern.",
            "Session-Race im News-Fetcher: bei IntegrityError (Multi-Worker-"
            "Race) würde der naive db.rollback() ALLE bisher geflushten "
            "Items derselben Iteration wegrollen. Jetzt: SAVEPOINT pro "
            "Item via `db.begin_nested()` — nur das eine kaputte Item "
            "rollt zurück.",
            "WCA-Sortier-Bug: Turniere mit distance_km = 0.0 (User direkt "
            "am Venue) wurden fälschlich ans Ende sortiert, weil 0.0 in "
            "Python falsy ist. Jetzt expliziter `is None`-Check.",
            "News-Cleanup: N+1-DELETE-Schleife → ein einzelner DELETE WHERE "
            "(SQLAlchemy `delete()`-Construct).",
            "PostalCodeGeo: `Float` explizit als mapped_column-Type — "
            "SQLAlchemy 2.0 sollte das aus dem Python-Type ableiten können, "
            "aber explizit ist defensiver bei Postgres-DDL-Generation.",
            "Hygiene: ungenutzter datetime-Import in wca/client.py raus, "
            "Doc-Strings in den __init__.py-Files der neuen Sub-Pakete "
            "(wca, news).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.dashboard-story",
        released=date(2026, 5, 16),
        title="Dashboard-Refactor: 4-Sektionen-Story",
        highlights=[
            "Dashboard hat jetzt eine klare Story-Reihenfolge in 4 "
            "Sektionen statt loser Karten-Reihen: HEUTE (Activity/"
            "Reminder) → DEINE PERFORMANCE (Multi-Cube-Vergleich + "
            "Stats) → TRAININGS-ANTRIEB (Challenges + Achievements) → "
            "SPEEDCUBING-WELT (WCA-Turniere + News).",
            "Jede Sektion hat einen dezenten Mini-Header (lila, klein, "
            "Spacing wide), Karten selbst sind unverändert. Semantisches "
            "<section>-Markup + aria-labelledby für Screenreader.",
            "Speedcubing-Welt-Sektion ist jetzt der „natuerliche\” Ort "
            "für die heute neu hinzugefuegten Karten (WCA-Turniere + "
            "News) statt einer temporaeren Anhang-Reihe.",
            "Spacing zwischen Sektionen leicht größer (space-y-8 statt "
            "space-y-6) — Sektionen sollen sich visuell abgrenzen.",
            "Tab-Reihenfolge bleibt (User-Entscheidung): Timer / "
            "Dashboard / Analyse / Trainer / Community / Verwaltung.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.news-frontend",
        released=date(2026, 5, 16),
        title="Speedcubing-News-Card im Dashboard live",
        highlights=[
            "Neue Karte „📰 Speedcubing-News\” im Dashboard, direkt neben "
            "der WCA-Turniere-Card (zweispaltig ab Tablet-Breite, "
            "Mobile gestapelt).",
            "Pro News-Item: Titel als Link zur Quelle, Source-Badge "
            "(farb-kodiert: WCA = lila, r/Cubers = orange), Summary "
            "(2 Zeilen abgekuerzt), Relativ-Datum („vor 3h\”, „vor 2d\”).",
            "Beim Erst-Aufruf nach Deploy ist die DB noch leer — die "
            "Card zeigt einen Hinweis, dass der Hintergrund-Fetch "
            "dabei ist + bittet um Reload in einer Minute.",
            "Nächster Schritt: Phase C — Dashboard-Refactor mit "
            "eigener „Speedcubing-Welt\”-Sektion und neuer Story-"
            "Reihenfolge.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.news-backend",
        released=date(2026, 5, 16),
        title="Backend für „Speedcubing-News\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/news/`: RSS-Aggregator mit "
            "feedparser, persistente DB-Tabelle `news_items` (Dedup über "
            "RSS-Link-URL), on-demand-Refresh-Strategie (wenn letzter "
            "Fetch > 60min alt, sync re-fetch beim nächsten Endpoint-Call).",
            "Konfigurierte Sources (vorerst): WCA Posts (offizielle "
            "Announcements) + r/Cubers (Community-Reddit). Erweiterung "
            "später via `news/sources.py`.",
            "Endpoint `GET /news/latest?limit=10` mit Auth + 60/min-Rate-"
            "Limit. Liefert sortiert nach published_at DESC.",
            "Cleanup: Items > 60 Tage werden im selben Pass gelöscht — "
            "Tabelle bleibt schlank, kein Cron nötig.",
            "Frontend-Card folgt im nächsten Commit.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-comps-frontend",
        released=date(2026, 5, 16),
        title="WCA-Turniere-Card im Dashboard live",
        highlights=[
            "Neue Karte „🏆 WCA-Turniere\” im Dashboard (temporaer am "
            "Ende — Phase C wandert sie in eine eigene „Speedcubing-"
            "Welt\”-Sektion gemeinsam mit den geplanten News).",
            "Pro Turnier sichtbar: Name (Link zur WCA-Detailseite), "
            "Datum (Range-formatiert dt.), Stadt, Anzahl Events, "
            "Distanz in km von deiner Profil-PLZ (Luftlinie).",
            "Distanz-Selector: 100 / 300 / 500 / 1000 / 5000 km. Bei "
            "leerer Liste auf Default-300km: ein-Klick auf „Weltweit "
            "suchen\”.",
            "Empty-State wenn keine PLZ im Profil: Hint mit Pfad "
            "Verwaltung → Account zum Setzen.",
            "Daten direkt von der offiziellen WCA-API (1h Cache); "
            "Geocoding via OpenStreetMap-Nominatim (30 Tage DB-Cache).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-comps-backend",
        released=date(2026, 5, 16),
        title="Backend für „WCA-Turniere in der Nähe\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/wca/`: WCA-API-Client (mit 1h-In-"
            "Memory-Cache), Nominatim-Geocoding-Wrapper (mit persistentem "
            "DB-Cache, TTL 30 Tage), Haversine-Distance-Berechnung, "
            "Country-Detection aus PLZ-Struktur.",
            "Endpoint `GET /wca/competitions/upcoming`: liefert die "
            "nächsten Turniere im Land des Users (PLZ aus Profil), "
            "sortiert nach Datum + Distanz, mit `distance_km` pro Eintrag. "
            "Default: max 300km, 10 Einträge, 6 Monate Vorausschau.",
            "DB-Tabelle `postal_code_geo` (Composite-Key postal_code + "
            "country_iso2): persistenter Geocoding-Cache. Wenn 100 User "
            "dieselbe PLZ haben = nur 1 Nominatim-Call. PLZ-Geo ändert "
            "sich nie, TTL 30 Tage ist konservativ.",
            "Frontend-Card folgt im nächsten Commit.",
            "Hintergrund: User-Wunsch nach „Turniere in deiner Nähe\”. "
            "PLZ-Feld wurde dafür Mai 14 schon im Profil ergänzt — "
            "jetzt ist die andere Haelfte fertig.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-bigfile",
        released=date(2026, 5, 16),
        title="csTimer-Import: große Files (30k+ Solves) jetzt importierbar",
        highlights=[
            "Bug-Fix: JSON-Bomb-Pre-Check (Security-Layer K2) hatte das "
            "Limit auf 200.000 strukturelle JSON-Tokens — für csTimer-"
            "Exporte mit > ca. 30.000 Solves zu eng. Limit jetzt auf "
            "2.000.000 hoch, was ca. 300.000 Solves abdeckt.",
            "Sicherheit bleibt: 30MB-Upload-Hardcap macht echte JSON-Bombs "
            "(~30M Tokens) weiterhin unmöglich. Pre-Check greift bei 1/15 "
            "der theoretisch möglichen Token-Last.",
            "Error-Message verstaendlicher: vorher „Möglicher JSON-Bomb-"
            "Angriff\” (verwirrend für normale User), jetzt „Datei zu "
            "komplex — bei normalen csTimer-Exporten reicht das für ca. "
            "300.000 Solves\” plus Diagnose-Hinweis.",
            "Hintergrund: User-Report 2026-05-13 (csTimer-.txt-Datei "
            "scheiterte). Hypothese im STATUS-Memo war korrekt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-refresh",
        released=date(2026, 5, 16),
        title="Feature-Liste „Was kann cubetracker?” auf Stand gebracht",
        highlights=[
            "Solving: Scramble-Picker (WCA + Inoffiziell: Ivy, Gear, "
            "Redi, Master Pyraminx, Master Skewb, FTO) ergänzt — war "
            "in der Marketing-Liste nicht sichtbar, obwohl seit heute "
            "im Timer-Tab nutzbar.",
            "Solving: Drei-Modi-Picker (Text/WCA/Pragmatisch) + "
            "Trainings-Sets (5/12/25/50/100 + Set-Statistik + Coaching-"
            "Feedback) waren portiert aber nicht erwähnt — jetzt drin.",
            "Analyse: Mo3 in Best-Times-Aufzaehlung dazu (heute neu in "
            "den Tabellen). Best-Avg-Timestamps + Detail-Modal pro "
            "Solve waren portiert aber stumm — jetzt erwähnt.",
            "Trainer: „Algs-Trainer mit Visualisierung\” war "
            "überoptimistisch — gilt nur für OLL (57 Bilder). PLL-"
            "Bilder folgen noch, jetzt ehrlich kommuniziert.",
            "Account: Postleitzahl im Profil dazu (Vorbereitung für "
            "„WCA-Turniere in deiner Nähe\”).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.welle2-3-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach Welle 2 + 3",
        highlights=[
            "Race-Condition beim Speichern nach Cube-Wechsel behoben: "
            "wenn man unmittelbar nach Cube-Wechsel speicherte, konnte "
            "die alte (cube-fremde) Hardware persistiert werden, weil "
            "der Auto-Suggest noch nicht durch war. Jetzt: hardwareId "
            "wird beim Cube-Wechsel auf null gesetzt — worst case ist "
            "„ohne Hardware” statt „falsche Hardware”.",
            "Custom-Scramble-Generator (Ivy, Gear, …) hatte einen "
            "theoretischen Endlos-Loop wenn eine Spec nur 1 Base-Move "
            "gehabt hätte. Defensive Guard rein — bei <2 Bases "
            "deaktivieren wir den „kein-Wiederholen”-Filter automatisch, "
            "damit der Tab nicht hängt.",
            "Scramble-Picker bei Session-Vorgaben (z.B. „pll” aus einer "
            "PLL-Trainings-Session): Toggle/Dropdown würde inkonsistent "
            "wirken, weil pll weder in WCA noch in Inoffiziell ist. "
            "Jetzt: beide Toggle-Buttons un-highlighted, statt Dropdown "
            "ein Hinweis „Aus Session-Vorgabe: pll — Toggle wählen "
            "um zu ändern”. Klick auf einen Toggle wechselt sauber in "
            "die jeweilige Kategorie.",
            "Code-Hygiene: tote Props in ModeButton (disabled/disabled"
            "Title) raus, redundante mt-4 auf TouchTimerPad entfernt "
            "(space-y-4 des Parents reichte), eslint-disable-Kommentar "
            "in ScrambleCard erklärt (Identitaets-stabile Callback-Prop).",
            "Tests: „kein direktes Wiederholen”-Iterationen von 10 auf "
            "100 erhöht — kostet <50ms, schliesst Glueckstreffer bei "
            "kleinen Move-Sets (gear hat nur 3 Bases) aus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-picker",
        released=date(2026, 5, 16),
        title="Scramble-Picker: WCA + Inoffiziell (Ivy, Gear, Redi, …)",
        highlights=[
            "ScrambleCard hat jetzt einen Picker: Toggle WCA ↔ "
            "Inoffiziell + Dropdown mit den verfügbaren Typen. Default "
            "folgt weiterhin dem gewählten Cube-Type — bei Override "
            "erscheint ein „↺ auto”-Button um wieder zum Default zu "
            "springen.",
            "WCA-Liste: alle WCA-Cubes (3x3, 4x4, …, Pyraminx, Skewb, "
            "Square-1, Megaminx, Clock) — werden weiterhin von scrambow "
            "generiert (WCA-quality, Mindest-Distanz).",
            "Inoffizielle Cubes (User-Wunsch): Ivy Cube, Gear Cube, "
            "Redi Cube, Master Pyraminx, Master Skewb, FTO. FTO via "
            "scrambow, die anderen via eigenem Random-Move-Generator mit "
            "„kein direktes Wiederholen derselben Achse”-Filter — nicht "
            "WCA-quality, aber sauber fürs Casual-Training.",
            "Cube-Type-Wechsel resettet den Picker automatisch, sodass "
            "der neue Cube wieder seinen passenden Scramble bekommt — "
            "verhindert „Ivy-Scramble für 3x3”-Stolperfallen.",
            "Session.scramble_type (csTimer-Import + PLL/OLL-Trainings-"
            "Sessions) wird weiterhin respektiert — User-Picker schlägt "
            "es aber, falls man manuell ändern will.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-layout",
        released=date(2026, 5, 16),
        title="Mobile-Timer-Layout: Scramble direkt über Timer + Selektoren unten",
        highlights=[
            "Phone-Reihenfolge im Timer-Tab umgebaut: Scramble → Timer-"
            "Display → „Tippen & halten”-Pad → erst danach Cube-/Session-/"
            "Hardware-Selektoren + Timer-Modus. Damit ist beim Solven kein "
            "Scrollen mehr nötig — alles Wichtige sichtbar.",
            "BigTimerInput aufgeteilt: Selektoren leben jetzt in einer "
            "eigenen TimerControlsCard, das Timer-Display ist nur noch das "
            "Solving-Eingabefeld + Save. Klare Verantwortlichkeiten, "
            "leichter zu warten.",
            "hardwareId nach TimerTab hochgezogen — der Save-Pfad in "
            "BigTimerInput nutzt jetzt dieselbe Quelle wie der Selektor-"
            "Block, kein State-Auseinanderdriften mehr möglich.",
            "Desktop unverändert: Live-Solves links (420px), Solving "
            "rechts. Nur die Reihenfolge innerhalb des Solving-Spalts "
            "folgt jetzt der mobile-Logik (Selektoren unten).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mo3-ao100",
        released=date(2026, 5, 14),
        title="Mo3 + AO100 in Solve-Tabellen + Mobile-Scroll",
        highlights=[
            "Tabellen-Spalten erweitert: Solvenummer, Zeit, Mo3, AO5, "
            "AO12, AO100, Cube, Hardware — alle sortierbar per Spaltenkopf-"
            "Klick",
            "Mo3 = arithmetisches Mittel der letzten 3 Solves (kein Trim, "
            "DNF macht Mo3 ungültig) — WCA-Standard für Big-Cubes (6x6, "
            "7x7) wo nur 3 Solves pro Round zählen",
            "AO100 = trimmed mean über 100er-Fenster, WCA-konform (5er-"
            "Trim pro Seite, 90er-Mittel)",
            "Mobile: in der LastSolves-Sidebar passen die 6 Avg-Spalten "
            "nicht — horizontaler Scroll greift jetzt sauber (min-w + "
            "overflow-x-auto), Spalten werden nicht mehr gequetscht",
            "Performance: AO100 rechnet auf bis zu 199 Solves pro "
            "Tabellen-Render — sliding-window in <50ms, keine spuerbare "
            "Verzoegerung",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-qa",
        released=date(2026, 5, 14),
        title="Mobile-Refactor QA-Fixes",
        highlights=[
            "Timer-Tab: DOM-Reihenfolge korrigiert — Tab-Taste + Screenreader "
            "folgen jetzt der visuellen Reihenfolge (Timer zuerst, dann "
            "Historie). Vorher tabbte man auf Phone erst durch die "
            "Solve-Historie.",
            "Tab-Leisten: snap-proximity statt snap-mandatory — kein "
            "Ruckeln mehr beim Antippen halb sichtbarer Tabs auf Touch.",
            "Info-Popover: z-Index auf 40 angehoben (sauber zwischen "
            "UserMenu und Modals) + Close-Button (×) im Phone-Bottom-Sheet, "
            "weil Outside-Tap als alleinige Schliess-Mechanik duenn war.",
            "QA-Sub-Agent-Review: Tabellen-Spalten-Konsistenz + alle "
            "Regressionen (Abstaende, Sub-Tab-State, Event-Listener) sauber.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-fixes",
        released=date(2026, 5, 14),
        title="Mobile-Fixes nach Phone-Test",
        highlights=[
            "Info-Button-Popover (ⓘ) ragte auf Phone teilweise über den "
            "Bildschirmrand. Jetzt: auf Phone als Bottom-Sheet (klebt unten, "
            "full-width minus Rand) — ragt nie mehr über. Ab Tablet wie "
            "bisher als Popover neben dem Button.",
            "Bestenliste + Solve-Liste: das min-w aus dem ersten Versuch "
            "blaehte die Tabelle kuenstlich auf (Leerraum rechts wirkte "
            "abgeschnitten). Jetzt: kein min-w — auf Phone sind durch die "
            "Spalten-Priorisierung eh nur 4 Spalten sichtbar, die passen "
            "via w-full in jeden Screen. Lange Display-Names werden "
            "abgeschnitten (truncate) statt die Tabelle zu sprengen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-polish",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 4: Header + Padding + Abschluss",
        highlights=[
            "Header-Logo auf Phone gefixt — war h-40 (160px Höhe = "
            "~410px Breite) und sprengte jeden Phone-Screen. Jetzt "
            "responsiv gestaffelt: h-16 Phone → h-28 sm → h-52 Desktop "
            "(2.5x-Wunsch bleibt für große Screens)",
            "Container-Padding p-3 auf Phone (war p-6 = 24px, zu viel auf "
            "360px-Screens), p-6 ab Tablet",
            "Charts (Trends/Verteilung/Aktivität) waren bereits responsive "
            "(ResponsiveContainer), Filter-Bars haben flex-wrap — kein Fix "
            "nötig. Mobile-First-Refactor damit abgeschlossen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-tables",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 3: Tabellen phone-tauglich",
        highlights=[
            "Analyse → Solves: auf Phone zeigt die Tabelle nur noch #, "
            "Zeit, AO5, Aktionen — AO12/Cube/Hardware ab Tablet-Breite "
            "(Details immer über den ℹ-Button erreichbar)",
            "Bestenliste: auf Phone nur Rang, User, Best Single, Best AO5 "
            "— Best AO12/Aktuelle AO5/Solves/Zuletzt ab Tablet-Breite",
            "Timer → Letzte Solves: AO12-Spalte auf Phone ausgeblendet "
            "(Sidebar ist eng), Solvenummer/Zeit/AO5 bleiben",
            "Keine Funktion geht verloren — nur visuelle Priorisierung "
            "der wichtigsten Spalten auf kleinen Screens",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-nav",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 1+2: Navigation + Timer-Layout",
        highlights=[
            "Neue ScrollableTabBar-Komponente: auf Phone horizontal "
            "scrollbar (snap-scroll), auf Desktop wie bisher gleichmäßig "
            "verteilt — kein Umbrechen/Quetschen mehr bei 6 Top-Tabs",
            "Top-TabBar + Verwaltung-Sub-Tabs + Community-Sub-Tabs nutzen "
            "alle das gleiche Pattern",
            "Timer-Tab auf Mobile: Solving-Bereich (Scramble + Timer) "
            "kommt jetzt ZUERST, die Letzte-Solves-Historie darunter — "
            "vorher musste man auf dem Phone erst durch die Historie "
            "scrollen. Auf Desktop unverändert (Historie links).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.postal-code",
        released=date(2026, 5, 14),
        title="Postleitzahl im Profil — Vorbereitung für Turnier-Nähe",
        highlights=[
            "Neues Profil-Feld 'Postleitzahl' in Verwaltung → Einstellungen "
            "→ Account → Profil (optional, multi-country-Format)",
            "Backend: User.postal_code (max 16 Zeichen) + Migration "
            "(idempotent via ALTER TABLE ADD COLUMN IF NOT EXISTS)",
            "PATCH /auth/me Whitelist erweitert — postal_code änderbar",
            "Vorbereitung für kommendes Feature: „Nächste WCA-Turniere "
            "in deiner Nähe\” — Daten werden bewusst jetzt schon gesammelt "
            "damit das Feature später direkt nutzbar ist",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.touch-text-mode",
        released=date(2026, 5, 14),
        title="Touch-Devices: Text-Eingabe erlaubt + WCA als Default",
        highlights=[
            "Auf Phone/Tablet ist Text-Eingabe-Modus jetzt wählbar (war "
            "vorher zwangsgespertt). Sinnvoll wenn man z.B. Bluetooth-"
            "Keyboard hat oder ohne Inspection-Countdown solven will.",
            "Frische Touch-User starten direkt mit WCA-Spacebar als "
            "Default — kein „erst Settings finden\”-Detour mehr.",
            "Bestehende User behalten ihre gespeicherten Settings unangetastet.",
            "Tipp-Hinweis-Text passt sich an: auf Touch + Text-Modus "
            "wird darauf hingewiesen dass Soft-Tastatur mühsam sein "
            "kann; auf Desktop + Text-Modus wird zum Spacebar-Timer "
            "eingeladen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.info-buttons-everywhere",
        released=date(2026, 5, 14),
        title="Info-Buttons in allen Karten",
        highlights=[
            "ⓘ-Buttons in 20+ Komponenten ergänzt — jede groessere Card "
            "hat jetzt einen Hover-/Klick-Tooltip mit Erklaerungstext",
            "Dashboard: Statistiken, Activity, Reminders, Challenges-Mini, "
            "Erfolge-Mini, Vergleich",
            "Analyse: Solve-Liste, Trends, Verteilung, Aktivitäts-Chart, "
            "Hardware-Vergleich",
            "Verwaltung: Sessions, Hardware-Inventar, Backup, csTimer-"
            "Import, csTimer-Export, Outliers, Account, Spacebar-Settings",
            "Trainer: Algorithm-Trainer, Erfolge, Tages-Challenges",
            "Community: Bestenliste, Freunde-Suche",
            "Admin: Statistiken, User-Liste, Bulk-Mail",
            "SettingsPanel Section-Helper erweitert — kann optional einen "
            "InfoButton-Slot rendern (Pattern für weitere Sub-Sektionen)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-mode-picker",
        released=date(2026, 5, 14),
        title="Timer-Modus direkt am Timer auswaehlbar (WCA / Pragmatisch / Text)",
        highlights=[
            "Drei-Button-Modus-Picker oben im Timer-Tab — vorher musste man "
            "sich durch Verwaltung → Einstellungen klicken um Spacebar-Modus "
            "anzuschalten, war nicht discoverable",
            "Ein Klick wechselt sowohl spacebar_enabled als auch "
            "inspection_mode konsistent (WCA vs Pragmatisch)",
            "Info-Button erklärt die drei Modi: Text-Eingabe / WCA / "
            "Pragmatisch mit konkretem User-Verhalten",
            "Wenn Text-Modus aktiv (Desktop): Tipp-Hinweis weist auf den "
            "Spacebar-Timer hin",
            "Auf Touch-Geräten ist Text-Modus disabled (Soft-Keyboard ist "
            "mühsam) — nur die zwei Spacebar-Varianten klickbar",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.user-menu",
        released=date(2026, 5, 14),
        title="User-Menu oben rechts (klassisches Account-Dropdown)",
        highlights=[
            "Klick auf Email/Avatar oben rechts öffnet jetzt ein Dropdown-"
            "Menu mit den Standard-Aktionen: Mein Account, Patch Notes, "
            "Was kann diese App, Logout",
            "Avatar mit Initialen (Display-Name oder Email-Anfangsbuchstaben), "
            "ADMIN-Badge wenn du Admin bist",
            "„Mein Account & Einstellungen\” springt direkt zum richtigen "
            "Sub-Tab in der Verwaltung (Settings inkl. AccountSettingsPanel)",
            "Patch Notes + Features-Modal sind dadurch über 3 Wege "
            "erreichbar: Version-Badge oben rechts, User-Menu, Footer-Link",
            "Alter Email-Text + nackter Logout-Link entfernt — UserMenu "
            "ersetzt beides",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-kor",
        released=date(2026, 5, 14),
        title="Korrigiertes Logo eingespielt",
        highlights=[
            "Neues Logo cubetracker_kor.png — auf das tatsaechliche Motiv "
            "zugeschnitten, kein toter Whitespace mehr im Bild",
            "Wirkt im Header + auf Login deutlich praesenter, weil bei "
            "gleicher Anzeigegroesse mehr Pixel auf das Logo entfallen",
            "Favicons + Apple-Touch-Icon neu generiert (Cube-Crop aus dem "
            "korrigierten Bild) — Browser-Tab-Icon ist jetzt klarer",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-bigger",
        released=date(2026, 5, 14),
        title="Logo größer (Header 2.5× / Login 1.5×)",
        highlights=[
            "App-Header-Logo von 64-80px auf 160-208px Höhe "
            "(Faktor ~2.5×) — viel praesenter als Marke",
            "Login-Seite: Card-Breite max-w-md (448px) → max-w-[600px], "
            "Logo waechst proportional mit (~1.5×)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-info",
        released=date(2026, 5, 14),
        title="Logo prominenter + Info-Buttons in Karten",
        highlights=[
            "App-Header: Logo ersetzt den separaten „cubetracker\”-"
            "Schriftzug + Tagline (war doppelt — das Logo enthält beides). "
            "Logo-Höhe 64-80px, klickbar zum Dashboard-Tab, mit Hover-"
            "Effekt. H1-Tag bleibt screenreader-only für SEO.",
            "Anmeldeseite: Logo nimmt jetzt die volle Card-Innenbreite ein "
            "(war zu klein im Verhaeltnis zum Whitespace) — Card-Breite "
            "etwas erhöht.",
            "Neue InfoButton-Komponente (ⓘ-Icon) mit Klick-/Hover-Popover. "
            "Schliesst bei Klick ausserhalb oder Esc.",
            "Info-Buttons platziert in: LIVE-Karte, Letzte-Solves-Tabelle, "
            "Trainings-Set, Scramble — erklärt die wichtigsten Begriffe "
            "(AO5/AO12/Form-Vergleich/WCA-Scramble-Notation).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-page",
        released=date(2026, 5, 14),
        title="App-Beschreibung + Feature-Liste",
        highlights=[
            "Anmeldeseite zeigt jetzt prominent „Was ist cubetracker?\” + "
            "Highlights neben dem Login-Formular — Besucher ohne Account "
            "verstehen sofort worum's geht",
            "Feature-Liste in 7 Kategorien (Solving, Analyse, Trainer, "
            "Community, Hardware, Daten, Account+Sicherheit)",
            "Innerhalb der App: Footer-Link „Was kann diese App?\” öffnet "
            "die selbe Feature-Liste als Modal",
            "Layout: Desktop 2-spaltig (Form links + Features rechts), "
            "Mobile gestapelt — Form bleibt prominent oben",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.community-tab",
        released=date(2026, 5, 14),
        title="Tab-Konsolidierung: Community ersetzt Freunde + Bestenliste",
        highlights=[
            "7 Top-Tabs → 6: Freunde + Bestenliste zusammengelegt in "
            "neuen Tab „Community\” 🤝",
            "Innerhalb von Community: Sub-Tab-Bar mit „Freunde\” und "
            "„Bestenliste\” — gleicher Stil wie Verwaltung-Sub-Tabs",
            "Backward-Compat: alte URL-Hashes (#friends, #leaderboard) "
            "landen automatisch auf Community + richtigem Sub-Tab — "
            "Bookmarks bleiben funktional",
            "Trainer + Verwaltung bleiben eigenständig (konservative "
            "Konsolidierung — Trainer-Sub-Tabs Heute/Algs/Erfolge sind "
            "konzeptionell zu eigenständig für Zerlegung)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo",
        released=date(2026, 5, 14),
        title="Neues Logo eingebunden",
        highlights=[
            "Logo (Cube mit lila/cyan-Gradient + Time-Bar-Linie) prominent "
            "auf der Anmeldeseite",
            "Cube-Icon klein neben dem 'cubetracker'-Schriftzug im Header",
            "Browser-Tab-Favicon zeigt den Cube — endlich kein Default-Icon mehr",
            "Apple-Touch-Icon für Homescreen-Install (vorab für PWA-Setup)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ux-quickwins",
        released=date(2026, 5, 14),
        title="UX-Quick-Wins nach Audit",
        highlights=[
            "Patch Notes raus aus Verwaltung — sind jetzt ein Modal das "
            "via Klick auf den Versions-Badge oben rechts aufgeht "
            "(natuerlicherer Ort für Versions-Info)",
            "Discoverability-Card in Freunde-Tab konsolidiert — "
            "Display-Name jetzt inline editierbar, kein Verweis mehr "
            "nach Verwaltung → Einstellungen nötig",
            "Cleanup: hidden refreshMe-Button + stale Footer-String entfernt",
            "Verwaltung-Sub-Tabs reduziert: 7 → 6 (Patch Notes raus)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.solvelist-hardware",
        released=date(2026, 5, 14),
        title="Analyse → Solves: Hardware statt Notiz in Tabelle",
        highlights=[
            "Notiz-Spalte raus aus der Solve-Tabelle (Notiz bleibt im "
            "Detail-Modal über den ℹ-Button verfügbar)",
            "Hardware-Spalte stattdessen — zeigt den Hardware-Namen "
            "für jeden Solve, oder „—\” wenn keine zugeordnet",
            "Cube-Spalte vereinfacht (Hardware-Sub-Zeile entfernt — "
            "wird ja jetzt eigenständig gezeigt)",
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
            "(default inaktiv) — kein Import-Button mehr nötig",
            "Lifespan-Backfill: bestehende User ohne Hardware kriegen die "
            "Liste beim nächsten Cold-Start nachgepflegt",
            "Pro Cube-Type-Gruppe: Checkbox 'alle markieren' + Bulk-Buttons "
            "(aktivieren, deaktivieren, löschen)",
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
            "ergänzt für sauberen Pip-Install",
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
            "Analyse → Solves: zusätzlich Solvenummer-Spalte + Sortierung "
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
            "Anfragen-Workflow: schicken, annehmen, ablehnen, zurücknehmen",
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
            "Manual-Trigger über Actions-Tab",
            "BACKUP.md mit Restore-Anleitung",
        ],
        commit="29074ba",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-2",
        released=date(2026, 5, 13),
        title="Admin User-Management + Ad-hoc-Mail + Bulk-Announcement",
        highlights=[
            "User-Liste mit Solve-Count + Aktivität, Deaktivieren/Aktivieren",
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
        title="Touch-Timer für Phone + F19-Race-Fix",
        highlights=[
            "Auf Touch-Devices erscheint im Timer-Tab ein großer Tap-Pad",
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
            "UTC-aware datetimes für Postgres-Kompatibilitaet",
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

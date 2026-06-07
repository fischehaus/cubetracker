# CLAUDE.md — cubetracker

## Was ist das?

App fuer Speedcubing-Solve-Tracking. **Zwei Varianten im selben Repo:**
- **`webapp/`** — Multi-User-Web-Variante, **LIVE auf cubetracker.de**
  (Hetzner Cloud + Coolify). Das ist die aktive Produktarbeit.
- **`backend/` + `frontend/`** — ältere Single-User-Desktop-Variante (SQLite,
  PyInstaller-Installer), parallel intakt, aber nicht mehr aktiv erweitert.

Features: csTimer-Import/Export, WCA-Profil-Lookup, Statistiken inkl.
Multi-Cube-Performance-Vergleich, PB-Tracking, Trainer (PLL/OLL),
Achievements, Friends/Leaderboard, Hardware-Analyse.

## Tech-Stack

### Backend (`backend/`)
- Python 3.14
- FastAPI 0.110+ (REST-API)
- SQLAlchemy 2.0 (ORM)
- Alembic (DB-Migrations)
- Pydantic 2 (Validierung)
- SQLite (lokale Datei-DB, kein Server)
- httpx (HTTP-Client fuer WCA-API)
- BeautifulSoup4 (Webseiten-Scraping bei Bedarf)
- pytest (Tests)

### Frontend (`frontend/`)
- React 18
- Vite (Build-Tool)
- TypeScript (strict mode)
- Tanstack Query (API-State)
- Recharts (Charts)
- Tailwind CSS (Styling)
- Vitest (Tests)

### Tooling
- Black, Ruff (Python-Format/Lint)
- Prettier, ESLint (TS-Format/Lint)
- pre-commit (Hooks vor Commit)

## Permission-Modes (Claude-Code-Workflow)

Permission-Modes via **Shift+Tab** wechseln. Empfehlung pro Use-Case:

| Mode | Wann nutzen |
|------|------|
| `default` | Standard, jeder Tool-Call wird gefragt |
| `acceptEdits` | Iteratives Codieren in bekanntem Pfad — Edit/Write ohne Prompt |
| `plan` | Major-Refactors, Architektur-Spikes — Claude plant, fragt vor Execution |

**Project-Permissions** in `.claude/settings.json` decken die wiederkehrenden
Workflow-Patterns ab (`gh api repos/cs0x7f/*`, `npm test`, `python -c`,
`git tag`, etc.). **Deny-Liste** schützt gegen `rm -rf /*`, force-push
auf main, `.git/**`-Edits.

## Tooling-Autonomie (User-Anweisung 2026-06-07, verbindlich)

**Installiere selbstständig, was du für die Aufgabe brauchst** — Dependencies,
CLI-Tools, System-Software. Nicht vorher fragen, einfach installieren und
weitermachen (der User hat das ausdrücklich angewiesen). Auf Windows:
`winget` ist da (z.B. `winget install --id <Pkg> -e --silent
--accept-package-agreements --accept-source-agreements --disable-interactivity`),
npm-Deps via `npm install` (kein UAC nötig). Bei System-Installs ggf. Sandbox
aus (`dangerouslyDisableSandbox`).

⚠️ **Lesson 2026-06-07 (UAC):** `winget --silent` umgeht die Windows-UAC-Abfrage
NICHT — ein System-Install wartet im Hintergrund UNSICHTBAR auf den UAC-Klick des
Users (sieht aus wie „hängt", kein Output, msiexec läuft mit eingefrorenem
Speicher). Darum bei System-Installs dem User VORHER sagen: „gleich kommt eine
UAC-Abfrage, bitte bestätigen" — nicht blind im Hintergrund warten. Und einen
fremden/SYSTEM-Install-Prozess NICHT hart killen (Safety-Block + Installer-State-
Risiko). (LibreOffice am 2026-06-07 so nachinstalliert — fürs docx→PDF/Bild-
Rendering im docx-Skill via LibreOffice + PyMuPDF.)

## Code-Disziplin

→ Siehe `.claude/rules/discipline.md` — wird automatisch geladen bei
Arbeit an Python- oder TypeScript-Files (Path-scoped). Enthält:
- Edit statt Write
- Type-Hints durchgehend
- Tests vor Merge
- Modul-Check (Layout / Datensicherung / Cross-Modul) vor Bau
- QA-Sub-Agent-Pflicht nach wesentlichen Änderungen
- Sub-Agent-Nutzungs-Konventionen

## Sub-Agents

Eigene Sub-Agent-Files unter `.claude/agents/`:
- `qa-reviewer.md` — strukturierte QA-Reviews nach wesentlichen Änderungen

Built-in Sub-Agents via `Agent`-Tool: `general-purpose`, `Plan`, `Explore`,
`claude-code-guide`.

## QA-Audit-Trail

Wesentliche Welle-Reviews:
- W.2 (Auth-Skeleton, 2026-05-10): 14 Findings, 3 KRITISCH gefixt
- W.5 (Backup/csTimer, 2026-05-10): 7 KRITISCH+SOLLTE gefixt
- W.8 (User-Management, 2026-05-11): 5 KRITISCH gefixt
- W.admin-workflow (2026-05-17): 2 KRITISCH + 4 SOLLTE + 2 NICE gefixt
- W.cstimer-more-puzzles (2026-05-17): 1 KRITISCH + 5 SOLLTE gefixt

## Branching-Strategie

> ⚠️ **Ist-Zustand (Web-Variante, Stand 2026-05-27):**
> **`feature/W-api-prefix`** ist der live-deployte Branch UND die
> **EINE Wahrheit** für Code *und* Doku (Code, Roadmap, NEXT_SESSION, alle .md).
> **GitHub-Default-Branch zeigt seit 2026-05-27 auch hierhin** (vorher
> noch auf den eingefrorenen `feature/W-multi-user-web`).
> **`feature/W-multi-user-web` ist EINGEFROREN** — nur noch Render-Rollback bis
> Phase 6, dort **NICHT mehr committen/pushen** (jeder Push würde Render neu
> deployen). **Auto-Deploy ist live** via GitHub-Action (`.github/workflows/deploy.yml`):
> ein Push auf `feature/W-api-prefix` deployt gezielt die geänderte App über Coolifys
> per-App-Deploy-API — Frontend `uuid=pcixgncs671tifdx9e3rxr7h`, Backend
> `uuid=w3dw05zc8nv2izxa3v2qi911` (Token = GH-Secret `COOLIFY_TOKEN`). Kein manueller
> Redeploy mehr nötig. Branch-Endspiel (→ `main`, alten Branch löschen, Render
> abbauen, GitHub-Default auf `main`) in Phase 6 (~2026-06-05). Das generische
> Modell unten gilt erst nach der Konsolidierung.

- `main`: immer deployable, nur gemergte Features
- `feature/<name>`: pro Feature ein eigener Branch
- Tags: `v0.1` nach Phase 1 (MVP), `v0.2` nach Phase 2, etc.

Ablauf:
```
git checkout -b feature/f1-datenmodell
# … arbeiten, committen, testen …
git checkout main
git merge feature/f1-datenmodell
# nach Phase 1 abgeschlossen:
git tag v0.1
```

## Rollback-Mechanik

- Letzten Commit rueckgaengig: `git reset --soft HEAD~1`
- Spezifisches Feature rausnehmen: `git revert <commit-sha>`
- Zu altem Tag: `git checkout v0.1` (detached HEAD, dann
  `git switch -c hotfix-from-v0.1`)
- Branch komplett wegwerfen: `git branch -D feature/<name>`

## Datenmodell (Kern, MVP-Stand)

```python
class Solve:
    id: int
    time_ms: int           # 12340 = 12.34 Sekunden
    cube_type: str         # "3x3", "4x4", "OH", "Pyra", ...
    scramble: str | None
    notes: str | None
    timestamp: datetime
    plus_two: bool         # +2 Strafe
    dnf: bool              # Did Not Finish
    session_id: int | None  # Phase 3
    hardware_id: int | None  # Phase 4 (Multi-Hardware-Tracking)
```

Spaetere Phasen erweitern via Alembic-Migrations:
- Phase 3: `Session` + `session_id` FK
- Phase 4: `Hardware` + `hardware_id` FK

## Externe Datenquellen

- **WCA**: https://www.worldcubeassociation.org/api/v0/ (offizielle API)
- **csTimer-CSV**: Standard-Export-Format der gaengigen Solve-Tracking-Webseite
- **Optional Scraping**: cubingcontests.com fuer Turnier-Ergebnisse,
  falls WCA-API nicht reicht

## Ports (Default)

- Backend: `localhost:8000` (FastAPI mit uvicorn)
- Frontend: `localhost:5173` (Vite-Dev-Server)
- API-Calls: Frontend → `http://localhost:8000`

## Session-Workflow (verbindlich)

**Bei Session-Ende:** der User kann jederzeit `/abschluss` aufrufen, um eine
8-Punkte-Checkliste laufen zu lassen (Git-Status, Patch-Notes, Tags,
features-data.ts, Doku, Todos, Backend-Smoke). Skill liegt in
`.claude/commands/abschluss.md`. Wenn der User sagt **„Session beenden"**,
**„das wars für heute"**, **„ich höre auf"** oder ähnlich → ruf den Skill
proaktiv auf, bevor du dich verabschiedest.

**Stop-Hook (Mini-Backstop):** läuft automatisch 1× pro Session (siehe
`.claude/hooks/stop-mini-check.sh`). Meldet uncommitted Änderungen +
unpushed Commits. Greift als Backup falls der User vergisst `/abschluss`
aufzurufen.

**ntfy-Push bei Fragen (User-Wunsch 2026-05-31, verbindlich):** Der
`stop-ntfy-notify.sh`-Hook pingt bei JEDEM Turn-Ende das Topic `jjY2OjY`
(mechanischer git-Fallback, wenn keine Override-Datei da ist). **Wenn du
dem User eine Frage stellst oder auf seine Entscheidung/Rückkehr wartest:**
schreib VOR dem Turn-Ende eine aussagekräftige „du bist dran"-Nachricht
nach `.tmp/last-ntfy-message.txt` (optional Title in
`.tmp/last-ntfy-title.txt`) — der Hook nutzt sie als Push-Body (Single-Use,
danach gelöscht). So weiß der User **wann + wofür** er zurückkommen soll.
Gilt auch nach Kompaktierung/Modell-Wechsel — diese Zeile ist die
Erinnerung, die die Gewohnheit überlebt.

**Klickbare Fragen (`AskUserQuestion`) pingen separat (W.ntfy-ask-question,
2026-06-06):** Der Stop-Hook feuert NUR am Turn-Ende — `AskUserQuestion` ist
aber ein Tool-Call mitten im Turn (der Turn endet nicht) → pingte früher
nicht. Jetzt feuert `pre-ask-question-ntfy.sh` (PreToolUse-Matcher
`AskUserQuestion`) direkt beim Stellen der Frage: nutzt
`.tmp/last-ntfy-message.txt` falls vorhanden, sonst baut er den Push-Body
automatisch aus Fragetext + Option-Labels. Für klickbare Fragen musst du also
NICHTS mehr vorab schreiben (für eine reichere Nachricht kannst du es weiter).
Prosa-Fragen + „fertig" laufen unverändert über den Stop-Hook.

**Roadmap-Abruf (`/roadmap` + Session-Start):** die Live-Roadmap (inkl.
interner Items) wird via `.claude/hooks/roadmap-fetch.py` geholt. Zwei
Auth-Pfade:

  1. **Bevorzugt (langlebig, W.roadmap-export-key):** Secret aus ENV
     `ROADMAP_EXPORT_KEY` (Coolify) bzw. `.tmp/roadmap-export-key`
     (gitignored, gleicher Wert). Endpoint `GET /api/roadmap/export` mit
     Header `X-Roadmap-Key`. Auch `--mark-done` läuft darüber
     (`POST /api/roadmap/export/done`). **Kein Ablauf**, kein Refresh
     nötig. Endpoint ist deaktiviert (404) solange die ENV-Var nicht
     gesetzt ist — safe-by-default.
  2. **Fallback (kurzlebig):** Admin-`cubetracker_access_token` aus dem
     Browser-localStorage in `.tmp/admin-token` (gitignored). Läuft
     stündlich ab.

Der SessionStart-Hook zeigt automatisch neue Items + Items die nur live (im
Admin-Panel) existieren, nicht im Code-Seed. Manuell + ausführlich:
`/roadmap` (Skill `.claude/commands/roadmap.md`). Reihenfolge pflegt der
Admin im App-Tab „Verwaltung → Admin → Roadmap" per ▲/▼ (oben zuerst);
Sichtbarkeit per „Öffentlich"-Toggle. Der Code-Seed
(`webapp/seeds/roadmap.py`) ist nur Cold-Start-Bootstrap.

**Roadmap-Item erledigt → auf „done" setzen (verbindlich, nicht nur
erinnern):** Wenn eine `feat(W.X)`/`fix(W.X)`-Welle ein Roadmap-Item
abschließt, das Item danach auf done setzen:
`python .claude/hooks/roadmap-fetch.py --mark-done "<title_de exakt>" [...]`
(matcht per title_de, idempotent, mehrere Titel möglich). Braucht einen
gültigen Admin-Token in `.tmp/admin-token`; bei „kein Admin (abgelaufen)"
→ User um frischen `cubetracker_access_token` bitten, dann erneut. Hält
die Live-Roadmap akkurat, ohne dass der Admin manuell nachklicken muss.

**Patch-Notes-Konvention:** jeder `feat(W.X)`/`fix(W.X)`-Commit braucht
einen PatchNote-Eintrag in `webapp/changelog/data.py` mit
`version="2.0.0-alpha.W.X"`. Plus Git-Tag `v2.0.0-alpha.W.X` nach Push.
Der `post-git-commit.sh`-Hook erinnert daran.

**Bei User-facing-Features:** Bullet in `webapp/frontend/src/lib/features-data.ts`
ergänzen (zeigt sich auf Login-Seite + im „Was kann diese App?"-Modal).
Wird im `/abschluss`-Check explizit kontrolliert. Plus: der
`post-git-commit.sh`-Hook warnt nach jedem `feat(W.X)`-Commit, wenn weder
`features-data.ts` noch ein neuer `features.*`-Locale-Key dabei war — es
sei denn `W.X` matched ein bekanntes Backstage-Pattern (qa, fix,
hardening, tsbuild, deps, hotfix, ...). Damit kein Marketing-Bullet mehr
wochenlang im Drift hängt (Audit 2026-05-29: 7 Lücken in features-data
aufgedeckt — Mehrsprachigkeit, Voice-Alerts, Multi-Cube-Compare,
Outlier-Pflege, Feedback-Workflow, Roadmap-/Patch-Notes-Modal).

## Context-Management & Session-Resume

**Bei langer Session / drohender Kompaktierung:** mit `/context` die aktuelle
Context-Auslastung prüfen. Bei hoher Auslastung ODER vor einem geplanten Stopp:
`/compact` mit Fokus (z.B. `/compact konzentrier dich auf den aktuellen Task`)
ODER NEXT_SESSION.md aktualisieren, BEVOR der Context kippt. Kontext-Verlust ist
am 2026-05-20 real passiert (Session aus Auto-Kompaktierung gestartet, Stand
musste aus einem manuell gespeicherten Protokoll rekonstruiert werden).

**Automatischer Backstop:** der `pre-compact-checkpoint.sh`-Hook (PreCompact-Event)
friert vor JEDER Kompaktierung den git-Stand nach `.tmp/last-compact-checkpoint.md`
ein (gitignored). Ehrliche Grenze: erfasst nur git-Stand, nicht die Konversation.

**Session-Wiederaufnahme (nach Kompaktierung / Crash / neuer Session):**
1. `.tmp/last-compact-checkpoint.md` lesen (mechanischer git-Stand, falls vorhanden)
2. `NEXT_SESSION.md` lesen (inhaltliche State-Übergabe — die Single-Source)
3. `CLAUDE.md` ist beim Start schon geladen (Disziplin + Konventionen)

→ Prompt-Vorlage: „Lies `.tmp/last-compact-checkpoint.md` + `NEXT_SESSION.md` und gib mir den Stand."

**Memory-Konsolidierung (Ritual):** gelegentlich (z.B. beim `/abschluss` oder
monatlich) die User-Memory `~/.claude/projects/.../memory/MEMORY.md` durchsehen:
Duplikate mergen, veraltete Fakten korrigieren, Index ausdünnen. Der Skill
`/consolidate-memory` automatisiert diesen Pass.

## Lessons-Archive

Spezifische Bug-Events / Postmortems / Architektur-Lessons liegen in
`docs/lessons-archive.md` (chronologisch, neueste zuerst). Klassiker:
- Browser-Polyfill-Risiko bei Node-Globals (cstimer_module-Crash 2026-05-16)
- Bash-Heredoc-Quote-Bug (mehrfach 2026-05-16)
- Pre-Commit-Tag-Falle (mehrfach 2026-05-17)
- Auto-Mode-Classifier-Blocks + Permission-Allowlist-Pflege

## Sichtbarkeits-Matrix (Wer sieht was?)

`docs/permissions-matrix.md` ist die **Single-Source-of-Truth** für die
Frage „wer sieht welche Daten?". 5 Rollen (anonym / user / friend /
tester / admin), alle Datenmodelle + API-Endpoints + UI-Tabs + Privacy-
Details (z.B. „was Admin NICHT sieht" → Plaintext-Passwörter, andere
User-Backups, Solves anderer User außer in Aggregat-Stats). Auch
Anti-Tracking-Audit (kein GA/Mixpanel/Hotjar etc., nur 1 funktionales
Cookie). Stand 2026-05-28.

**Pflicht-Lesen bei:** neue Endpoints, Auth-Code, Cross-User-Filter,
Privacy-Texten auf Login-/Datenschutz-Seite, Tester-/Admin-Rolle-
Änderungen. Bei Schema-/Endpoint-Änderung: Matrix mit-aktualisieren
(sonst Single-Source verlogen).

## Audit-Log (Setup-Reviews)

- `docs/audit-2026-05-20.md` — Doku-vs-Setup-Audit. Welle 1: 10 Quick-Wins +
  Phase-D P3/H2/S2 (Pre-Tag-Hook, Push-Failure-Diagnose, patch-notes-writer).
  Welle 2: Context-Mgmt / Slash-Commands / Skills / Background-Tasks auditiert;
  Bundle umgesetzt (`/audit`-Command, CM2/CM5-Doku, PreCompact-Checkpoint-Hook,
  ntfy-Stop-Hook). Audit jetzt reproduzierbar via `/audit <sektion>`.
  Offen: mcp, output-styles, status-line, plugins (+ M4, S3 zurückgestellt).

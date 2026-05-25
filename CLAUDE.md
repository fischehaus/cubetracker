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

> ⚠️ **Ist-Zustand (Web-Variante, 2026-05):** Der live-deployte Branch ist
> **`feature/W-api-prefix`** (Hetzner/Coolify, NICHT gemergt, NICHT `main`).
> `feature/W-multi-user-web` ist der frühere Render-Branch (jetzt Doku/Rollback,
> hier liegt NEXT_SESSION.md). Coolify deployt das **Frontend** automatisch bei
> Push auf `feature/W-api-prefix`; reine Backend-Änderungen brauchen einen
> manuellen „Redeploy"-Klick. Branch-Konsolidierung ist für Phase 6
> (~2026-06-05) geplant. Das generische Modell unten gilt für die
> Desktop-Variante / nach der Konsolidierung.

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

**Patch-Notes-Konvention:** jeder `feat(W.X)`/`fix(W.X)`-Commit braucht
einen PatchNote-Eintrag in `webapp/changelog/data.py` mit
`version="2.0.0-alpha.W.X"`. Plus Git-Tag `v2.0.0-alpha.W.X` nach Push.
Der `post-git-commit.sh`-Hook erinnert daran.

**Bei User-facing-Features:** Bullet in `webapp/frontend/src/lib/features-data.ts`
ergänzen (zeigt sich auf Login-Seite + im „Was kann diese App?"-Modal).
Wird im `/abschluss`-Check explizit kontrolliert.

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

## Audit-Log (Setup-Reviews)

- `docs/audit-2026-05-20.md` — Doku-vs-Setup-Audit. Welle 1: 10 Quick-Wins +
  Phase-D P3/H2/S2 (Pre-Tag-Hook, Push-Failure-Diagnose, patch-notes-writer).
  Welle 2: Context-Mgmt / Slash-Commands / Skills / Background-Tasks auditiert;
  Bundle umgesetzt (`/audit`-Command, CM2/CM5-Doku, PreCompact-Checkpoint-Hook,
  ntfy-Stop-Hook). Audit jetzt reproduzierbar via `/audit <sektion>`.
  Offen: mcp, output-styles, status-line, plugins (+ M4, S3 zurückgestellt).

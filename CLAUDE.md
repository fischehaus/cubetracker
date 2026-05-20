# CLAUDE.md — cubetracker

## Was ist das?

Web-App fuer Speedcubing-Solve-Tracking. Single-User, lokal
laufend, mit Browser-Frontend. Importiert/exportiert CSV (csTimer-
Format), kann WCA-Profile lesen, generiert Statistiken inkl.
Multi-Cube-Performance-Vergleich, Verbesserungs-Tracking,
Trainings-Reminder und Hardware-Performance-Analyse.

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

## Lessons-Archive

Spezifische Bug-Events / Postmortems / Architektur-Lessons liegen in
`docs/lessons-archive.md` (chronologisch, neueste zuerst). Klassiker:
- Browser-Polyfill-Risiko bei Node-Globals (cstimer_module-Crash 2026-05-16)
- Bash-Heredoc-Quote-Bug (mehrfach 2026-05-16)
- Pre-Commit-Tag-Falle (mehrfach 2026-05-17)
- Auto-Mode-Classifier-Blocks + Permission-Allowlist-Pflege

## Audit-Log (Setup-Reviews)

- `docs/audit-2026-05-20.md` — Doku-vs-Setup-Audit (10 Quick-Wins implementiert,
  4 Präsentations-Items + 1 Strategie-Item offen)

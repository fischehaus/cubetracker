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

## Disziplin (verbindlich)

1. **Edit statt Write.** Bei Aenderungen an bestehenden Files immer
   `Edit`-Tool mit praezisem Anker. NIEMALS `Write` ueber eine
   bestehende Datei.

2. **Type-Hints durchgehend.** Python: alle Funktions-Signaturen
   typisiert. TypeScript: kein `any`, strict-mode aktiv.

3. **Tests vor Merge.** Jedes Feature braucht mindestens
   Unit-Tests fuer die Kernlogik. Pre-commit muss gruen sein.

4. **DB-Migrations sauber.** Jede Schema-Aenderung als Alembic-
   Revision. Keine direkten DB-Mutationen.

5. **Bei Tooling-Ausfall, Quellen-Widerspruch oder Architektur-
   Schnitt-Frage:** nicht eigenmaechtig pivotieren, sondern fragen.

## Sub-Agent-Nutzung

Bei spezialisierten Aufgaben **bevorzuge Sub-Agents** mit
`context: fork`:
- Neue API-Endpoint schreiben → `code-writer`
- Test-Suite generieren → `test-writer`
- Code-Review vor Commit → `reviewer`
- Docstrings/README-Update → `doc-writer`

Bei kleinen Edits, kurzen Frage-Antwort-Loops oder wenn der
Kontext minimal ist: direkt im Hauptkontext, ohne Sub-Agent.

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

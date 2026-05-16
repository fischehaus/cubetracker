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

6. **Modul-Check vor Bau.** Bei jedem neuen Modul / jeder neuen
   Funktion / jeder Anpassung VOR dem Code drei Dimensionen explizit
   durchdenken — nicht ueberspringen, auch wenn das modul "klein"
   wirkt:

   a) **Layout-Impact**: Wo erscheint das Modul? Braucht es einen
      neuen Reiter? Passt es in eine bestehende Sektion? Aendert
      sich die Tab-Anzahl oder Sub-Tab-Struktur?

   b) **Datensicherung + Export**: Aendert sich das DB-Schema
      (neue Tabelle, neue Spalte)? Muessen Backup-Routinen
      angepasst werden? Wenn JSON-Export existiert: muss das neue
      Modul mit-exportiert werden? Idempotent bei Re-Import?

   c) **Cross-Modul-Auswirkung**: Triggert das neue Modul
      Aenderungen in anderen Modulen (z.B. Solve-Save loest
      Achievement-Check aus)? Reagieren bestehende Endpoints/
      Komponenten anders? Brauchen Mutation-Hooks zusaetzliche
      Cache-Invalidierung?

   Ergebnis dieser Ueberlegung wird in der Antwort an User
   sichtbar dokumentiert (z.B. „Layout: neuer Tab", „Backup:
   neue Tabelle muss in /export aufgenommen werden", etc.) —
   und bei strittigen Punkten wird gefragt, nicht eigenmaechtig
   entschieden.

## Sub-Agent-Nutzung

Bei spezialisierten Aufgaben **bevorzuge Sub-Agents** mit
`context: fork`:
- Neue API-Endpoint schreiben → `code-writer`
- Test-Suite generieren → `test-writer`
- Code-Review vor Commit → `reviewer`
- Docstrings/README-Update → `doc-writer`

Bei kleinen Edits, kurzen Frage-Antwort-Loops oder wenn der
Kontext minimal ist: direkt im Hauptkontext, ohne Sub-Agent.

## QA nach jeder wesentlichen Aenderung (verbindlich seit 2026-05-11)

**User-Anweisung 2026-05-11:** Nach JEDER wesentlichen Aenderung
einen Security-Sub-Agent-Review starten — nicht erst am Ende einer
Phase.

**Was ist "wesentlich"** (Trigger fuer QA-Pass):
- Neue API-Endpoints (POST/PATCH/DELETE die DB schreiben)
- Schema-Aenderung (neue Tabelle, neue Spalte, neue FK)
- Auth- oder Permission-relevanter Code (Login, Token, current_user-
  Dep, Cross-User-Filter)
- File-Upload oder External-Service-Integration (Email, Storage,
  Payment, ...)
- Bulk-Operations (Import, Backup-Restore, Achievement-Recheck)
- Komplette Sub-Phase abgeschlossen (z.B. W.4, W.5, W.8)

**Was ist NICHT wesentlich** (kein QA-Pass noetig):
- UI-/Styling-Polish
- Doku-/README-Updates
- Tippfehler-/Kleinst-Fixes
- ENV-Var-Aenderungen ohne Code

**QA-Workflow:**
1. Code committed (oder push-bereit)
2. Sub-Agent (general-purpose oder spezialisiert) mit klarem
   Review-Auftrag starten, structured Findings
   (🔴 KRITISCH / 🟡 SOLLTE / 🟢 NICE / ✅ Positiv)
3. KRITISCH-Findings sofort fixen vor Live-Deploy
4. SOLLTE-Findings dokumentieren + priorisieren (oft vor v2.x)
5. NICE-Findings nur falls billig

**Bisherige QA-Findings + Fixes (Audit-Trail):**
- W.2 (Auth-Skeleton, 2026-05-10) -> 14 Findings, 3 KRITISCH gefixt
  (HttpOnly-Cookie, token_version, Rate-Limit)
- W.5 (Backup/csTimer, 2026-05-10) -> 7 KRITISCH+SOLLTE-Findings
  gefixt (Upload-DoS, Achievement-Recheck-Cap, Snapshot-Size etc.)
- W.8 (User-Management, 2026-05-11) -> 5 KRITISCH-Findings gefixt
  (BackgroundTask gegen Email-Enumeration, atomare Token-Claims,
  Mass-Assignment-Whitelist, atomares token_version-Increment)

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

**Kein Bash-Heredoc mit deutschen Anführungszeichen** in Patch-Notes:
`„...""` (U+201E + U+0022) zerschießt Python-Strings → Render-Deploy-
Crash. Stattdessen: nur ASCII-Quotes oder Heredoc-Output via Python-
Script regenerieren.

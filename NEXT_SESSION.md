# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.
>
> **Letzter Stand:** 2026-05-02, abends. Phase 1 MVP fertig, Tag `v0.1`
> gesetzt. User wollte App vor naechstem Feature anschauen.

---

## TL;DR fuer den User beim Wiedereinstieg

Du musst beim naechsten Mal:

1. **Backend-Terminal oeffnen** (PowerShell):
   ```powershell
   cd D:\Projekte\cubetracker\backend
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload
   ```
   → laeuft auf `http://localhost:8000`

2. **Frontend-Terminal oeffnen** (zweites PowerShell-Fenster):
   ```powershell
   cd D:\Projekte\cubetracker\frontend
   npm run dev
   ```
   → laeuft auf `http://localhost:5173`

3. **Browser:** `http://localhost:5173` aufmachen.

4. **Claude Code starten** (drittes Terminal oder VS Code), Repo-Root
   `D:\Projekte\cubetracker`. Erster Prompt:
   > „Lies `NEXT_SESSION.md` und gib mir den aktuellen Stand."

---

## Was beim App-Walkthrough zu pruefen ist

### Funktionale Checks (sollten alle gruen sein)

- [ ] **Backend-Badge** oben rechts zeigt „Backend v0.1.0" gruen
- [ ] **Solves-Liste** zeigt 6202 Solves (paginiert auf letzte 100)
- [ ] **Cube-Filter-Dropdown** rechts oben in der Liste — Auswahl
      „3x3" filtert sowohl Liste ALS AUCH StatsCard links
- [ ] **Session-Switcher** links oben — Auswahl filtert Liste + Stats
- [ ] **PB-Marker** beim besten Solve: ★ + goldener Hintergrund + gelber
      Zeitwert (z.B. bei Cube=3x3 sollte 7.85s markiert sein)
- [ ] **+2-Toggle** auf einem normalen Solve klicken → Zeit aendert sich
      um +2s, Best-Marker bleibt korrekt
- [ ] **DNF-Toggle** klicken → Zeit zeigt „DNF", Solve faellt aus Stats
      raus
- [ ] **Neuen Solve eintragen** (Form links) — taucht oben in Liste
      auf, Stats aktualisieren sich
- [ ] **Solve loeschen** (🗑) — verschwindet, Stats aktualisieren sich
- [ ] **csTimer-Re-Import** mit derselben Datei → 0 neue, 6201 dupliziert

### Was du eventuell vermissen wirst (potentielle naechste Features)

- **Keine Charts** — nur Zahlen. Histogramm + Trends-Verlauf kommen in
  Phase 2.
- **Keine Inline-Edits** fuer Scramble/Notes — nur +2/DNF/Loeschen.
- **Pagination ist hart auf 100** — keine „mehr laden"-Button.
- **Keine Tag/Wochen-Aggregation** — z.B. „heute 47 Solves".
- **Kein Multi-Cube-Vergleich** — Hauptwunsch vom 2026-05-02, kommt in
  Phase 2/3.
- **Keine Suche/Filter nach Datum** oder Notiz-Inhalt.
- **Cube-Filter ist Dropdown mit fixer Liste** (`COMMON_CUBE_TYPES`) —
  exotische Cube-Types aus deinem Import (z.B. „Gear", „Ivy") fehlen
  evtl. im Dropdown, sind aber in der DB.

### Bekannte Schoenheits-Aspekte (kein Bug, nur Beobachtung)

- Stats-Card unten links wirkt evtl. „leer" bei wenigen Solves — bei
  Filter auf seltene Cube-Types (z.B. „7x7" mit nur 9 Solves) sind
  Avg100 = null.
- Zeit-Formatierung im Form: „12.34" oder „1:23.45" — beides
  akzeptiert.

---

## Was als naechstes ansteht (nach App-Walkthrough)

User-Entscheidung steht aus. Letzter Vorschlag von Claude:

**Empfehlung:** Phase 2 als „Visualisierung" definieren statt urspr.
WCA-Integration. Konkret:

1. **F8 Trends-Chart** (Avg5/12/100-Verlauf ueber Zeit, Recharts) —
   nutzt 6202 Datenpunkte, hoher Wow-Faktor.
2. **F-neu Histogramm** (Solve-Zeit-Verteilung) — zeigt
   Form-Konsistenz.
3. **F11 Multi-Cube-Vergleich** („wo bist du gerade am besten?") —
   expliziter User-Hauptwunsch vom 2026-05-02.

→ Tag `v0.2` nach diesen drei.

User wollte aber zuerst die App benutzen, um zu sehen, was wirklich
fehlt. Die obige Reihenfolge kann sich also noch aendern.

**Bewusst NICHT als naechstes:**
- WCA-API-Integration (F9/F10) — externe Abhaengigkeit, hoher Aufwand
- Hardware-Tracking (Phase 4) — DB-Schema-Erweiterung, spaeter
- Backup/Sync (F20) — SQLite-Datei kopieren reicht

---

## Repo-Stand (Snapshot)

- **Branch:** `main` (sauber, alle Features gemerged)
- **Tags:** `v0.0` (Skeleton), `v0.1` (MVP komplett)
- **Letzter Commit:** `49ff1f9` — merge feature/f5-stats into main
- **Tests:** 77/77 gruen (`backend/.venv/Scripts/python.exe -m pytest -q`)
- **Lint:** Pre-commit-Hooks (Black + Ruff) sauber
- **Build:** `npm run build` im frontend laeuft sauber durch
- **DB:** `backend/data/solves.db` mit 6202 Solves + 22 Sessions +
  13 Cube-Types (3x3: 1818, 2x2: 1505, Skewb: 741, Pyraminx: 629,
  OH: 592, Square-1: 252, 4x4: 235, Clock: 131, Gear: 119, 5x5: 97,
  Ivy: 44, Megaminx: 30, 7x7: 9)
- **Live-PBs:** 3x3 PB 7.85s, current Avg100 10.89s, best Avg100 10.85s

---

## Files-Map (nach Phase 1)

```
cubetracker/
├── CLAUDE.md                  # Disziplin, Tech-Stack, Branching
├── ROADMAP.md                 # F1-F20, Phase 1 = done, Rest pending
├── NEXT_SESSION.md            # diese Datei
├── backend/
│   ├── api/
│   │   ├── solves.py          # CRUD-Endpoints
│   │   ├── sessions.py        # GET-Endpoints
│   │   ├── stats.py           # GET /stats (F5)
│   │   └── import_cstimer.py  # POST /import/cstimer (F4)
│   ├── stats/
│   │   └── calc.py            # WCA-Trimmed-Mean, pure functions (F5)
│   ├── importers/
│   │   └── cstimer.py         # JSON-Parser + Cube-Type-Mapping (F4)
│   ├── db/
│   │   ├── models.py          # Solve + Session
│   │   └── session.py         # SQLAlchemy-Setup
│   ├── alembic/               # Migrations
│   ├── tests/                 # 77 Tests
│   ├── data/solves.db         # SQLite-DB mit echten Daten
│   └── main.py                # FastAPI-App
└── frontend/
    └── src/
        ├── App.tsx                       # MainLayout + cubeFilter-State
        ├── components/
        │   ├── HealthBadge.tsx           # (in App.tsx inline)
        │   ├── SessionSwitcher.tsx       # F4
        │   ├── ImportPanel.tsx           # F4
        │   ├── SolveForm.tsx             # F3
        │   ├── SolveList.tsx             # F3 + PB-Marker (F5)
        │   └── StatsCard.tsx             # F5
        └── lib/
            ├── api.ts                    # axios + tanstack-query Hooks
            ├── format.ts                 # Zeit-Format + Cube-Liste
            └── types.ts                  # Solve, Session, etc.
```

---

## Wenn etwas nicht startet

| Problem | Loesung |
|---|---|
| `uvicorn: command not found` | `.venv` nicht aktiviert. `.\.venv\Scripts\Activate.ps1` |
| `npm: command not found` | Node.js nicht im PATH. PowerShell neu oeffnen. |
| Backend-Badge bleibt rot | Backend-Terminal pruefen, ob uvicorn laeuft. Port 8000 frei? |
| Frontend zeigt nur weisse Seite | F12 → Console pruefen. Meist API-CORS oder Backend down. |
| Pre-commit failt beim Commit | `pre-commit run --all-files` fuer Detail-Output |
| Tests failen | `cd backend && .venv\Scripts\python.exe -m pytest -v` |

---

## Cross-Reference

- **Cross-Projekt-Status:** `D:\Claude-Projekte\STATUS.md`
- **Code-Orchestrator-Befunde:** noch zu schreiben unter
  `D:\Claude-Projekte\code-orchestrator\01_phase_D_befunde_cubetracker.md`
  (fuer V5-Code-Schwester-Projekt)
- **Memory:** `~/.claude/projects/.../memory/MEMORY.md`

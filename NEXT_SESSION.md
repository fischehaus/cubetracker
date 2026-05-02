# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.
>
> **Letzter Stand:** 2026-05-03 nachts. Phase 2 fertig, Tag `v0.2`
> gesetzt. User hat F11 (Multi-Cube-Vergleich) live gesehen — naechster
> Schritt offen.

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

### Funktionale Checks (Phase 2 neu)

- [ ] **MultiCubeCompareCard** ganz oben in der Hauptspalte: ranked Liste
      aller Cubes mit Form-Faktor (▼ gruen / ▲ rot)
- [ ] **TrendsChart** darunter: ao5/ao12/ao100-Linien, Window-Selector
      (100…Alle), Singles optional
- [ ] **HistogramChart** darunter: Verteilung mit Auto-Bin-Breite
- [ ] **OutlierCard** im Aside: amber-farben, listet verdaechtige
      Solves pro Cube mit Quick-Actions DNF/Loeschen
- [ ] **Limit-Selector** in SolveList (50/100/200/500/1000/Alle)
- [ ] **ao5/ao12 als Sub-Zeile** unter jeder Solve-Zeit
- [ ] **Datum als Tooltip** auf der Solve-Zeit
- [ ] **csTimer-Stackmat-Eingabe**: `945` -> 9.45s, `15102` -> 1:51.02
- [ ] **Sofort-Update**: +2/DNF/Loeschen/Create aktualisiert ALLE
      sichtbaren Werte (Stats, Charts, MultiCube, Outlier) sofort

### Funktionale Checks (Phase 1 — sollten weiterhin gruen sein)

- [ ] Backend-Badge gruen
- [ ] Cube-Filter-Dropdown filtert Liste + Stats + Charts synchron
- [ ] Session-Switcher filtert alles synchron
- [ ] PB-Marker (★ + gold) auf der besten Zeit des aktuellen Filters
- [ ] csTimer-Re-Import: alle als Duplikate erkannt

### Was du jetzt eventuell vermissen wirst (Phase-3-Kandidaten)

- **Form-Faktor fuer Lernkurve verzerrt**: bei kontinuierlicher
  Verbesserung ist current_ao5 immer < mean — das misst eher
  Lernkurve als Tagesform. Alternative: Bezug auf letzte 100 Solves.
- **Keine Inline-Edits** fuer Scramble/Notes/time_ms
- **Keine Tag/Wochen-Aggregation** („heute 47 Solves")
- **Kein Trainings-Reminder** (lange-nicht-gemacht-Banner)
- **Kein Hardware-Tracking** (Welcher Wuerfel war benutzt?)
- **WCA-Profil-Verknuepfung** ist verschoben — nicht in Roadmap-
  Hochprio.

---

## Was als naechstes ansteht (nach App-Walkthrough)

Phase 2 ist mit Tag `v0.2` abgeschlossen. User hat alle Komponenten live
gesehen und bestaetigt, dass sie funktionieren.

**Offene Diskussionspunkte aus Phase-2-Use:**
1. **Form-Faktor-Metrik** in MultiCubeCompareCard misst eher Lernkurve
   als Tagesform — bei dauerhaft besser werdenden Cubern ist
   current_ao5 IMMER < gesamt-mean. Eventuell auf „letzte 100 Solves
   als Bezug" umstellen.
2. **Outliers haben dem User noch nicht alle Beweggrunde** — Verdacht
   bei 2x2-Solves um 0.67-0.78s ist echt grenzwertig (WR 0.43s).
   Schwellwerte ggf. cube-spezifisch definieren.

**Phase-3-Kandidaten (bewusst noch nicht angefangen):**

aus User-Wuenschen vom 2026-05-02:
- **F12 Verbesserungs-Tracking** — letzte 50 vs. davor pro Cube,
  „wo wirst du am staerksten besser?"
- **F13 Trainings-Reminder** — banner bei „lange nicht gemacht"
- **F14 Sessions** — eigenes Konzept (existiert schon als FK, aber
  keine eigene UI fuer Trainingsgruppierung)
- **F15 Tag/Wochen-Statistiken** — „heute 47 Solves, Wochen-Avg 11.2s"

Quality-of-Life-Wuensche:
- **Inline-Edit** fuer Scramble + Notes + time_ms (F7-Vorzug)
- **Form-Faktor** alternativ als Bezug auf letzte 100

**Bewusst NICHT als naechstes:**
- WCA-API-Integration (F9/F10) — externe Abhaengigkeit, hoher Aufwand
- Hardware-Tracking (Phase 4) — DB-Schema-Erweiterung, spaeter
- Backup/Sync (F20) — SQLite-Datei kopieren reicht

---

## Repo-Stand (Snapshot)

- **Branch:** `main` (sauber, alle Phase-2-Features gemerged)
- **Tags:** `v0.0`, `v0.1`, **`v0.2`** (aktuell)
- **Tests:** 82 backend + 55 frontend = **137 gruen**
  - backend: `cd backend && .venv\Scripts\python.exe -m pytest -q`
  - frontend: `cd frontend && npm test`
- **Lint:** Pre-commit-Hooks (Black + Ruff) sauber
- **Build:** `npm run build` clean (Bundle ~200kB gzipped wegen Recharts)
- **DB:** `backend/data/solves.db` mit 6202 Solves + 22 Sessions +
  13 Cube-Types (3x3: 1818, 2x2: 1505, Skewb: 741, Pyraminx: 629,
  OH: 592, Square-1: 252, 4x4: 235, Clock: 131, Gear: 119, 5x5: 97,
  Ivy: 44, Megaminx: 30, 7x7: 9)
- **Live-Form (von by-cube):** Square-1 aktuell beste Form (22% des
  Schnitts), gefolgt von Gear, dann 3x3

---

## Files-Map (nach Phase 1)

```
cubetracker/
├── CLAUDE.md                  # Disziplin, Tech-Stack, Branching
├── ROADMAP.md                 # Phase 1 + 2 done, Phase 3-4 pending
├── NEXT_SESSION.md            # diese Datei
├── backend/
│   ├── api/
│   │   ├── solves.py          # CRUD-Endpoints (cap le=100k)
│   │   ├── sessions.py        # GET-Endpoints
│   │   ├── stats.py           # GET /stats + GET /stats/by-cube (F11)
│   │   └── import_cstimer.py  # POST /import/cstimer (F4)
│   ├── stats/
│   │   └── calc.py            # WCA-Trimmed-Mean, pure functions (F5)
│   ├── importers/cstimer.py   # JSON-Parser (F4)
│   ├── db/                    # models, schemas, database
│   ├── alembic/               # Migrations
│   ├── tests/                 # 82 Tests
│   └── data/solves.db         # SQLite mit 6202 Solves
└── frontend/
    └── src/
        ├── App.tsx                            # Layout + cubeFilter-State
        ├── components/
        │   ├── SessionSwitcher.tsx            # F4
        │   ├── ImportPanel.tsx                # F4
        │   ├── SolveForm.tsx                  # F3 (mit Stackmat-Parser)
        │   ├── SolveList.tsx                  # F3+F5+F5.1 (limit, ao5/12)
        │   ├── StatsCard.tsx                  # F5
        │   ├── TrendsChart.tsx                # F6 (Phase 2)
        │   ├── HistogramChart.tsx             # F6 (Phase 2)
        │   ├── OutlierCard.tsx                # F7 (Phase 2)
        │   └── MultiCubeCompareCard.tsx       # F11 (Phase 2)
        └── lib/
            ├── api.ts             # axios + tanstack-query Hooks
            ├── format.ts          # Zeit-Format + Cube-Liste + Stackmat-Parser
            ├── types.ts           # Solve, Session
            ├── rolling.ts         # WCA-Trimmed-Mean (TS-Port von calc.py)
            ├── histogram.ts       # Bin-Berechnung + Sturges
            └── outliers.ts        # Cube-spezifische Outlier-Erkennung
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

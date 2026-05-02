# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.
>
> **Letzter Stand:** 2026-05-03 nachts. **Phase 3 fertig, Tag `v0.3`
> gesetzt.** Drei Phase-3-Branches autonom durchgezogen + gemerged:
> Form-Faktor v2 + Tag/Wochen-Stats, Verbesserungs-Tracking + Reminder,
> Inline-Edit.

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

### Funktionale Checks (Phase 3 neu)

- [ ] **TodayWeekCard** ganz oben in der Hauptspalte: 2 Slices
      „Heute" + „Diese Woche" mit Counts, Mean, ao5, Cube-Breakdown
- [ ] **MultiCubeCompareCard** zeigt jetzt **Tagesform** statt
      Lifetime-Schnitt (Banner sagt „Aktuell deine beste Tagesform")
- [ ] Bei Cubes mit ≥100 Solves: kleine **Trend-Zeile** „Trend -X.X%"
      (gruen) oder „+X.X%" (rot) zeigt Verbesserung letzte 50 vs davor
- [ ] **ReminderCard** (blau) im Aside: Cubes, die du ≥7 Tage nicht
      gemacht hast, sortiert „laengste Pause zuerst"
- [ ] **Inline-Edit**: Click auf Zeit-Zelle in der Solves-Liste →
      Input. Click auf Notiz → Input. Enter speichert, Esc bricht ab.

### Funktionale Checks (Phase 2)

- [ ] MultiCubeCompareCard, TrendsChart, HistogramChart, OutlierCard
- [ ] Limit-Selector (50…Alle) + ao5/ao12 als Sub-Zeile
- [ ] Datum als Tooltip auf der Solve-Zeit
- [ ] csTimer-Stackmat-Eingabe: `945` -> 9.45s, `15102` -> 1:51.02
- [ ] Sofort-Update aller Werte bei Mutations

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

Phase 3 ist mit Tag `v0.3` abgeschlossen. Phase-2-Diskussionspunkte
(Form-Faktor v2 + cube-spezifische Outlier-Schwellen) sind teilweise
abgehandelt: Form-Faktor v2 ist drin, Outlier-Schwellen sind noch das
gleiche 30%/5×-Schema (cube-spezifisch waere noch ein
Detail-Refinement).

**Phase-4-Kandidaten:**

Hardware-Tracking (urspruenglich Phase 4 in der Roadmap):
- **F16 Hardware-Inventar** — CRUD fuer Cube-Modelle (MGC v3, RS3M,
  GAN 13, …)
- **F17 Hardware pro Solve** — `hardware_id` FK aktivieren via
  Alembic-Migration, Frontend-Auswahl beim Eintragen
- **F18 Hardware-Performance-Vergleich** — „mit MGC bist du 0.8s
  schneller als mit RS3M"
- **F19 Aktive-Hardware-Empfehlung** pro Event

Plus aus Wuensche vom 2026-05-02 noch nicht erledigt:
- **WCA-Profil-Verknuepfung** (F9/F10) — externe API
- **Backup/Sync** (F20) — Drive oder lokaler Export

Quality-of-Life-Restposten:
- **Outlier-Schwellen cube-spezifisch** (z.B. 2x2 grosszuegiger als 3x3)
- **Trends-Chart Y-Achse** auto-zoom (bei sehr kurzen Cubes wie 2x2 ist
  derzeit der Massstab unguenstig)
- **Cube_type editierbar** in der Liste (derzeit read-only)

---

## Repo-Stand (Snapshot)

- **Branch:** `main` (sauber, alle Phase-3-Features gemerged)
- **Tags:** `v0.0`, `v0.1`, `v0.2`, **`v0.3`** (aktuell)
- **Tests:** 91 backend + 55 frontend = **146 gruen**
  - backend: `cd backend && .venv\Scripts\python.exe -m pytest -q`
  - frontend: `cd frontend && npm test`
- **Lint:** Pre-commit-Hooks (Black + Ruff) sauber
- **Build:** `npm run build` clean (Bundle ~200kB gzipped wegen Recharts)
- **DB:** `backend/data/solves.db` mit 6202 Solves + 22 Sessions +
  13 Cube-Types
- **Phase-3-Highlights aus Live-Daten:** Form-Faktor v2 zeigt jetzt
  echte Tagesform statt Lernkurve. Verbesserungs-Trend pro Cube
  (letzte 50 vs davor 50). Reminder-Card flaggt vergessene Cubes.

---

## Files-Map (nach Phase 1)

```
cubetracker/
├── CLAUDE.md                  # Disziplin, Tech-Stack, Branching
├── ROADMAP.md                 # Phase 1-3 done, Phase 4 pending
├── NEXT_SESSION.md            # diese Datei
├── backend/
│   ├── api/
│   │   ├── solves.py          # CRUD-Endpoints (cap le=100k)
│   │   ├── sessions.py        # GET-Endpoints
│   │   ├── stats.py           # /stats, /stats/by-cube, /stats/temporal
│   │   └── import_cstimer.py  # POST /import/cstimer (F4)
│   ├── stats/calc.py          # WCA-Trimmed-Mean, pure functions
│   ├── importers/cstimer.py   # JSON-Parser
│   ├── db/                    # models, schemas, database
│   ├── alembic/               # Migrations
│   ├── tests/                 # 91 Tests
│   └── data/solves.db         # SQLite mit 6202 Solves
└── frontend/
    └── src/
        ├── App.tsx                            # Layout + cubeFilter-State
        ├── components/
        │   ├── SessionSwitcher.tsx            # F4
        │   ├── ImportPanel.tsx                # F4
        │   ├── SolveForm.tsx                  # F3 (mit Stackmat-Parser)
        │   ├── SolveList.tsx                  # F3+F5+F5.1+F7 (Inline-Edit)
        │   ├── StatsCard.tsx                  # F5
        │   ├── TrendsChart.tsx                # F6 (Phase 2)
        │   ├── HistogramChart.tsx             # F6 (Phase 2)
        │   ├── OutlierCard.tsx                # F7 outlier (Phase 2)
        │   ├── MultiCubeCompareCard.tsx       # F11 + FF2 + F12-Trend
        │   ├── ReminderCard.tsx               # F13 (Phase 3)
        │   └── TodayWeekCard.tsx              # F15 (Phase 3)
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

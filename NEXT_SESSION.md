# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.
>
> **Letzter Stand:** 2026-05-03. **Phase 8.3 fertig, Tag `v0.13`
> gesetzt.** PB-Konfetti — visueller Effekt bei neuem Personal Best:
> - Backend X-PB-Achieved-Header (single/ao5/ao12)
> - canvas-confetti + PbConfettiOverlay + Toast-Banner
> - Single = burst, Double = 2 bursts, Triple = 2s storm
> - 332 Tests gruen (220 backend + 112 frontend)
>
> **Phase 8.2 (Tag `v0.12`)** war Speedcubing-Timer mit Spacebar +
> WCA-Inspection (Mode-Toggle WCA/Pragmatisch) + Sound + Multi-Phase-
> Splits (Variante A) + Settings-Panel. Solve.split_times_ms-Spalte
> + Migration; csTimer-Import/Export unveraendert.
>
> **Bisheriger Phase-8.2-Header (zur Kontext-Erhaltung):**
> - useSpacebarTimer-Hook: WCA-State-Machine
>   (idle → inspection → ready → running → stopped)
> - Inspection 15s default, Sound bei 8s + 12s, Penalty +2/DNF
> - Multi-Phase: jeder Spacebar-Press = Split, beim N-ten Press stop
> - SettingsPanel als 5. Sub-Tab in VERWALTUNG
> - Solve.split_times_ms-Spalte + Migration 593bfa59e08b
> - csTimer-Importer/Exporter unveraendert (compat-test gruen)
> - 327 Tests gruen (215 backend + 112 frontend), Bundle 846kB / 248kB
>
> **Phase 8.1 (Tag `v0.11.1`)** war UX-Quick-Wins (csTimer-Mapping
> fix + Outlier-Toggle + DrillCard-Solve-Liste).
>
> **Phase 8 (Tag `v0.11`)**: Scramble im TIMER + PLL/OLL-Trainer
> (alg_case-Schema, /stats/by-alg-case-Endpoint, AlgTrainerPanel
> mit DrillCard, scrambow vendor-patched). Snapshots vor Phase 8 +
> 8.1 jeweils als tag + legacy-branch verfuegbar.
>
> **Phase 7 (Tag `v0.10`)** war Personal Trainer Teil 1+2 (Achievements
> + Daily Challenges). **Phase 7a (Tag `v0.9`)** war Teil 1 mit
> 18 Achievements + Live-Backfill 17/18.
>
> **Snapshot v0.6 Layout** weiter verfuegbar: tag `v0.6` + branch
> `legacy/v0.6-classic-layout`.

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

### Funktionale Checks (Phase 4 neu — UI/UX)

- [ ] **3 Tabs oben gross**: TIMER / DASHBOARD / ANALYSE (h-14, lila aktiv)
- [ ] **Tab-Wahl persistiert** in localStorage (Reload landet wieder dort)
- [ ] **TIMER-Tab**: grosse zentrale Eingabe (text-7xl), auto-focus,
      Enter speichert + re-focus. Live-card rechts: Letzter Solve text-4xl,
      ao5/ao12 text-3xl, Form-vergleich fuer ao5+ao12+ao100 mit
      Window-Selector (letzte 100/500/alle), Mini-Liste mit Quick-Delete
- [ ] **DASHBOARD-Tab**: 3 Quick-Cards top (Today/Week/Reminders),
      darunter MultiCube + Stats voll-breit
- [ ] **ANALYSE-Tab**: FilterBar oben (Cube-Filter zentral),
      TrendsChart full-width mit Y-Achsen-Smart-Skala + manuell,
      Histogramm + Outlier nebeneinander, SolveList full-width,
      Stats + Import unten
- [ ] **Y-Achse Trends**: standardmaessig P2..P98 (Outlier weggeklippt,
      Verlauf gross sichtbar). Manuell ueberschreibbar via min/max-Inputs
      in Sekunden („10" oder „1:30"). Reset bei Filter-Wechsel.
- [ ] **OutlierCard session-aware**: bei aktiver Session-Wahl im Header
      werden nur diese Session-Outliers gezeigt
- [ ] **SessionSwitcher** sitzt im Header (App-weit)
- [ ] Schriften deutlich groesser ueberall (Headlines 2xl, Body base)

### Funktionale Checks (Phase 1-3 — sollten weiterhin gehen)

- [ ] csTimer-Stackmat-Eingabe: `945` → 9.45s, `15102` → 1:51.02
- [ ] csTimer-Re-Import erkennt alle als Duplikate
- [ ] Inline-Edit in SolveList (Click auf Zeit/Notiz)
- [ ] Sofort-Update aller Werte bei Mutations
- [ ] Backend-Badge gruen, ao5/ao12 als Sub-Zeile in der Liste

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

## Was als naechstes ansteht

Phase 8 + 8.1 + 8.2 + 8.3 abgeschlossen. Geplante Reihenfolge bis v1.0:

**Phase 8.3.1 — 2D-Algorithm-Visualisierung** (~1 Tag):
- 2D-Cube-State-Bilder im AlgTrainerPanel + DrillCard
- Lib `sr-visualizer` oder selbst-gebaute SVG aus state-pattern
- KEIN Hotlinking auf jperm.net (urheberrechtlich)

**Phase 9 — Distribution** (Tag `v1.0`, ~2-3 Tage):
- F21-F25 in ROADMAP (PyInstaller, %LOCALAPPDATA%, Inno-Setup, …)

Bewusst skippt: Light-Mode (User-Entscheidung — Speedcubing-Timer
sind standardmaessig dark).

---

### Historische Notizen aus frueheren Phasen (zur Kontext-Einordnung)

Phase 4 (Visualisierungs-Refactor) ist mit Tag `v0.4` abgeschlossen.
Hardware-Tracking ist nach Phase 5 verschoben.

**Phase 5 — Hardware-Tracking** (Seed liegt in
`docs/hardware-inventory-seed.md`, ~35 physische Cubes vom 2026-05-03):

- **F16 Hardware-Inventar** — CRUD fuer Cube-Modelle. Schema-Frage:
  Hardware m:n cube_types (ein Modell fuer mehrere events nutzbar)?
  Oder 1:1 mit Wiederholungen?
- **F17 Hardware pro Solve** — `hardware_id` FK aktivieren via
  Alembic-Migration, Default-Hardware pro cube_type, Auswahl im
  BigTimerInput
- **F18 Hardware-Performance-Vergleich** — „mit Weilong v11 bist du
  0.8s schneller als mit Gan 15 auf 3x3"
- **F19 Aktive-Hardware-Empfehlung** pro Event
- **F20 Custom-Reports + Backup/Sync**

**Phase 7 — Personal Trainer MVP** (neu geplant 2026-05-04):

User-Wunsch nach Gamification-Modul. Aufgeteilt in zwei branches:

- **7a Achievements**: ~15 vordefinierte achievements (Volume,
  Speed-PBs, Variety, Hardware), Auto-Check nach jedem Solve,
  AchievementsCard im DASHBOARD mit unlocked/locked-grid
- **7b Daily Challenges**: 3 challenges pro tag generiert basierend
  auf user-stats (Volume / Speed / Comeback / Diversity / Consistency),
  fortschritts-tracking, expiry am tagesende, Card im DASHBOARD

aufwand-schaetzung: ~1 tag MVP komplett.

**Phase 8 — Distribution** (Tag `v1.0`, neu hinzugefuegt 2026-05-03):

App als Windows-Installer fuer fremde Rechner — User-Wunsch, damit
die App z.B. an Familien-/Freunde-Test verteilbar ist.

- **F21 Backend serviert Frontend statisch** (`npm run build` +
  StaticFiles in FastAPI)
- **F22 PyInstaller-Bundle + Auto-Browser-Open** (eine .exe, ~70 MB)
- **F23 Persistenz auf %LOCALAPPDATA%** (DB ueberlebt updates)
- **F24 Inno-Setup-Installer** (start-menue, uninstaller,
  optional code-signing gegen Defender-FP)
- **F25 Auto-Update** (optional, github-releases-API)

Aufwand ~1 tag POC, ~2-3 tage poliert. **Bewusst nach Phase 5**, weil
sich vorher das DB-Schema (hardware_id) noch bewegt.

Plus offene Wuensche:
- **WCA-Profil-Verknuepfung** (F9/F10) — externe API, niedrige Prio
- **Outlier-Schwellen cube-spezifisch** (2x2 grosszuegiger als 3x3)
- **Cube_type editierbar** in der Liste (derzeit read-only)
- **„Into Cube"-Klaerung** beim Phase-5-Bau (siehe Seed-doku)
- **Bundle-Splitting** fuer Recharts (heute ~200kB gzipped, koennte
  mit code-splitting halbiert werden) — wird Pflicht spaetestens
  in Phase 6

---

## Repo-Stand (Snapshot)

- **Branch:** `main` (sauber, alle Phase-8.3-Features gemerged)
- **Tags:** `v0.0` … `v0.12`, **`v0.13`** (aktuell)
- **Tests:** 220 backend + 112 frontend = **332 gruen**
  - backend: `cd backend && .venv\Scripts\python.exe -m pytest -q`
  - frontend: `cd frontend && npm test`
- **Lint:** Pre-commit-Hooks (Black + Ruff) sauber
- **Build:** `npm run build` clean (Bundle ~200kB gzipped wegen Recharts)
- **DB:** `backend/data/solves.db` mit 6202 Solves + 22 Sessions +
  13 Cube-Types
- **Phase-4-Highlights:** 3-Tab-Architektur, BigTimerInput mit text-7xl
  Eingabe + auto-focus, Form-vergleich fuer alle ao*, Y-Achse smart-skaliert,
  einheitliche grosse Schriften ueberall, Dead-Code (SolveForm,
  TodayWeekCard) entfernt.

---

## Files-Map (nach Phase 1)

```
cubetracker/
├── CLAUDE.md                  # Disziplin, Tech-Stack, Branching
├── ROADMAP.md                 # Phase 1-4 done, Phase 5 pending
├── NEXT_SESSION.md            # diese Datei
├── docs/
│   └── hardware-inventory-seed.md  # Phase-5-Seed
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
        ├── App.tsx                            # Tab-Routing + State
        ├── components/
        │   ├── TabBar.tsx                     # 3 Modi (Phase 4)
        │   ├── SessionSwitcher.tsx            # F4
        │   ├── ImportPanel.tsx                # F4
        │   ├── BigTimerInput.tsx              # TIMER-Tab Eingabe (Phase 4)
        │   ├── LastSolvesPreview.tsx          # TIMER-Tab Live-card
        │   ├── ActivityCard.tsx               # DASHBOARD Today/Week
        │   ├── ReminderCard.tsx               # F13 + emptyMode
        │   ├── MultiCubeCompareCard.tsx       # F11 + FF2 + F12-Trend
        │   ├── StatsCard.tsx                  # F5
        │   ├── AnalyseFilterBar.tsx           # ANALYSE Cube-Filter
        │   ├── TrendsChart.tsx                # F6 + Y-Achsen-Smart (Phase 4)
        │   ├── HistogramChart.tsx             # F6 (Phase 2)
        │   ├── OutlierCard.tsx                # F7 outlier + sessionId
        │   └── SolveList.tsx                  # F3+F5+F5.1+F7 (Inline-Edit)
        └── lib/
            ├── api.ts             # axios + tanstack-query Hooks
            ├── format.ts          # Zeit-Format + Cube-Liste + Stackmat-Parser
            ├── types.ts           # Solve, Session
            ├── rolling.ts         # WCA-Trimmed-Mean (TS-Port von calc.py)
            ├── histogram.ts       # Bin-Berechnung + Sturges
            ├── outliers.ts        # Cube-spezifische Outlier-Erkennung
            └── chart-utils.ts     # Y-Domain (Phase 4)
```

---

## Layout-Rollback (Phase 5b → v0.6 = klassisches 3-Tab-Layout)

Falls das neue 4-Tab-Layout (Phase L) nicht gefaellt, drei Wege zurueck:

```powershell
# Option 1: zum Tag wechseln (detached HEAD)
git checkout v0.6

# Option 2: zum legacy-branch wechseln (mutable HEAD, kann commits aufnehmen)
git checkout legacy/v0.6-classic-layout

# Option 3: main zurueck-rollen (DESTRUKTIV — verwirft neue Commits)
git checkout main && git reset --hard v0.6
```

Empfohlen: **Option 1** (`git checkout v0.6`) zum bloss-anschauen. Vite-
Restart + Browser-Refresh, dann siehst du die alte UI. Mit
`git checkout main` kommst du zur neuen UI zurueck — ohne Datenverlust,
da die SQLite-DB unter `backend/data/solves.db` von der Layout-Aenderung
nicht beruehrt wird.

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

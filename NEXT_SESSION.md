# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.
>
> **WICHTIG (User-Festlegung 2026-05-03):** Phase 9 (Distribution → v1.0)
> ist KEIN End-Punkt. **Nach v1.0 wird weiter an der App gebaut.**
> Phase 9 ist nicht-destruktiv: Source-Code aenderungen sind minimal
> (StaticFiles-Mount, %LOCALAPPDATA% statt backend/data/, PyInstaller-
> spec). Dev-Workflow `uvicorn --reload` + `npm run dev` bleibt parallel
> zur ausgerollten App nutzbar. Neue Phasen 10/11/... werden danach
> normal weitergebaut und als Updates ausgerollt. KEIN feature-freeze
> nach v1.0.
>
> **TODO fuer spaeter (User-Notiz 2026-05-03):** Code-Orchestrator-
> Plan vs. Cubetracker-Praxis ehrlich vergleichen. Cubetracker wurde
> ohne strikte Anwendung des Code-Orchestrator-Workflows gebaut, hat
> aber organisch sehr aehnliche Disziplinen entwickelt (Snapshots vor
> Phasen, Modul-Check vor Bau, ROADMAP-/NEXT-SESSION-Pflicht-Updates,
> Test-Pyramide pure→service→api). Vor naechstem Projekt: `project_
> code_orchestrator.md` lesen + Diff zwischen Plan und unserer Praxis
> erstellen, um den Plan auf Basis der Erfahrung nachzuschaerfen.
>
> **Parallel-Betrieb Dev + Prod auf demselben Rechner (User-Anforderung):**
> Phase 9 muss so konfiguriert werden, dass die ausgerollte App OHNE
> Konflikt parallel zur Dev-Umgebung laeuft. Saubere Trennung erforderlich:
> - **Port**: Dev=8000, Prod=8765 (Default, falls belegt nächster freier)
> - **DB**: Dev=backend/data/solves.db, Prod=%LOCALAPPDATA%\cubetracker\solves.db
>   — getrennt via `CUBETRACKER_DB_PATH`-Env oder Code-Default
> - **localStorage**: automatisch getrennt durch unterschiedliche Origins
>   (Browser isoliert per Origin)
> - **Versions-Badge im Header** zeigt klar welche Variante laeuft
>   (z.B. `v0.16-dev` vs `v1.0-installed`)
> - **Datenuebertragung Dev↔Prod via Backup/Restore-Endpoint** (Pflicht
>   in Phase 9)
>
> **LETZTER STAND (2026-05-17 nachts, Session-Ende via /abschluss):**
> Multi-User-Web-Variante (webapp/) ist live auf cubetracker.de.
> Heute deployed: **kompletter Quick-Wins-Sprint P1.1-P1.4** + QA-Fixes:
>   - **P1.1 Voice-Alert** (`3928aaf`, tag `voice-alert`): WCA-Inspection
>     spricht "acht"/"zwoelf" (DE) oder "eight"/"twelve" (EN) statt
>     Sinus-Beep. Cascade-Setting in SettingsPanel: beep / de / en / off.
>   - **P1.2 Penalty-Quick-Buttons** (`fe3b1e8`, tag `penalty-quick`):
>     Nach jedem Save erscheinen +2 / DNF / Loeschen direkt unter dem
>     Timer — kein Weg mehr ueber die Letzte-Solves-Sidebar.
>   - **P1.3 Custom-Scramble-Input** (`2551a2d`, tag `custom-scramble`):
>     Edit-Button in der ScrambleCard. Eigenen Scramble eintippen
>     (z.B. Wettkampf-Scramble), Enter speichert, Esc bricht ab.
>   - **P1.4 Roadmap-Frontend** (`2050e74`, tag `roadmap-frontend`):
>     RoadmapModal mit P1-P6, Status-Badges, ✓-Markern fuer erledigte
>     Items. Trigger via Footer-Link + User-Menu.
>   - **QA-Fixes** (`3263f47`, tag `qa-fixes-p1`): 3 HIGH + 2 MEDIUM
>     aus Sub-Agent-Review gefixt:
>       - speechSynthesis.cancel() raus (Screen-Reader-safe)
>       - Safari iOS TTS-Priming via 0-Volume-Dummy-Utterance
>       - "Letzter Solve (3x3):" mit cube_type-Label
>       - DNF-Button-Tooltip benennt WCA-Auto-+2-Entfernung explizit
>       - Loeschen: window.confirm() raus, 2-Klick-Pattern mit 5s-Timeout
>
> **Tag-Stand:** v2.0.0-alpha.W.voice-alert, penalty-quick,
> custom-scramble, roadmap-frontend, qa-fixes-p1 — alle 5 lokal + remote.
>
> **Infra-Setup heute:** ntfy.sh als trusted endpoint in
> `~/.claude/settings.json` (User-Level). Permission-Pattern:
> `Bash(curl * https://ntfy.sh/*)`. ntfy-Topic: `jjY2OjY` (persoenlich).
>
> **WAS DU PARALLEL ANGEFANGEN HAST (untracked):**
> - `scripts/render_pll.py` — PIL-basierter PLL-Renderer im OLL-Stil
>   (700x500, gleiche Sticker-/Pill-/Arrow-Geometrie wie OLL).
> - `webapp/frontend/src/assets/pll/PLL_Ua.png` — erstes generiertes Bild
>   (Ua-Perm). Sieht visuell sauber aus, Indikatoren korrekt platziert.
> - Klarer Fortschritt zu **P5 "PLL-Bilder einbinden (analog OLL)"** aus
>   der Roadmap (~30 Min wenn alle 21 fertig).
>
> **OFFENE USER-AUFGABEN:**
> - Phone-Re-Test der P1-Items: Voice-Alert (8s/12s), Penalty-Quick-Buttons
>   (Tap-Targets ausreichend gross?), Custom-Scramble (Mobile-Keyboard OK?),
>   Loeschen-2-Klick-Confirm (Animation sichtbar?).
> - PLL-Renderer fertig machen: restliche 20 Permutationen
>   (Aa, Ab, E, F, Ga-d, H, Ja, Jb, Na, Nb, Ra, Rb, T, Ub, V, Y, Z),
>   dann `frontend/src/lib/pll-images.ts` analog OLL anlegen.
> - RESEND_API_KEY rotieren (alter Chat-Key revoken).
>
> **NAECHSTE Schritte (P1-Sprint-Restplan):**
> - **P1.5 Scramble-Bild 2D-Net** (~1 Woche, hoechster Visual-Impact aus
>   P1) — Standard-Erwartung an Speedcubing-Timer. Pflicht-Item.
> - **P1.6 PWA-Setup** (~1 Tag) — Manifest + Service-Worker fuer Phone-
>   Homescreen-Install. Konsequenz aus dem Mobile-First-Refactor.
> - Danach P2 Hetzner-Migration (Mitte Juli, vor Postgres-90d-Limit).
>
> **INFRASTRUKTUR:**
> - Mitte Juli: Hetzner-Migration (vor Render-Postgres-90d-Limit
>   ~2026-08-08). Coolify-basiertes Setup.
>
> **WORKFLOW-NEU:**
> - Beim Start: SessionStart-Hook gibt Repo-Stand-Snapshot aus.
> - Bei jedem Bash-Aufruf: pre-bash-dev-server.sh blockt uvicorn/npm
>   run dev/vite (User-Override CUBETRACKER_ALLOW_LOCAL_DEV=1).
> - Nach git commit: Push-Reminder + Tag-Reminder.
> - Nach Edit von .ts/.tsx: localhost-Hardcode-Warner.
> - Bei "Session beenden": /abschluss-Skill ruft 8-Punkte-Check auf.
> - Stop-Hook (1x/Session): Mini-Backstop.
>
> ---
>
> **ARCHIV-ABSCHNITT (Stand 2026-05-04, Desktop-Phase 9):**
> Distribution-faehig + ausgerollt + live verifiziert.
> v1.0 hatte einen API-baseURL-Bug (hardcoded localhost:8000) — in v1.0.1
> behoben (relative URL via `import.meta.env.DEV`-check).
>
> **Lesson learned (Klassiker-Bug)**: bei SPA-mit-Backend in der
> ausgerollten App IMMER Frontend-API-baseURL durch env-vars steuern,
> NIE hardcoden. Faellt erst beim Distribution-Test auf, nicht im Dev.
>
> **Wie ein neuer Installer gebaut wird:** siehe `backend/BUILD.md`
> (3 Schritte: npm run build → PyInstaller → Inno Setup Compiler).
>
> **Naechster Strang: Phase 8.3.2 — PLL-Visualisierung.** User hat
> festgelegt dass die 21 PLL-Bilder im naechsten Rollout kommen.
> Implementierung analog zu OLL.
>
> **Phase 8.5 (Tag `v0.15`)** war 14 neue Volume/Speed/Streak-
> Achievements + Backfill (6 neu unlocked):
> - Volume-Tages-Patterns separat pro Event (3x3/2x2/4x4/5x5/OH × 100er-Tag)
> - Marathon-Tag (200 any cube), Wochen-Disziplin (7 Tage je 100+ 3x3)
> - Speed-Schwellen sub_30, sub_22.95, sub_6_66 (Hex-Master)
> - Streaks 7/30/100 Tage (neue Category „consistency")
> - Sanity-Floor 1000ms im Speed-Check schuetzt vor degenerierten Daten
> - 349 Tests gruen (237 backend + 112 frontend)
>
> **Phase 8.4 (Tag `v0.14`)** war Trainings-Sets + Schrift-Slider +
> Best-Avg-Timestamps. **Phase 8.3 (Tag `v0.13`)** war PB-Konfetti.
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

Phase 8 + 8.1 + 8.2 + 8.3 + 8.4 + 8.5 abgeschlossen. Geplante Reihenfolge:

**Phase 9 — Distribution + Restore → v1.0** (~2-3 Tage):
- POST /backup/restore Endpoint + UI im BackupPanel
- Backend serviert Frontend statisch (StaticFiles)
- DB nach %LOCALAPPDATA%, Migrations beim ersten Start
- PyInstaller-Bundle, Inno-Setup-Installer
- Achievement-Trigger nach Import explizit verifizieren

**Phase 8.3.2 — PLL-Visualisierung** (Aufwand ~30min nach Bild-Lieferung):
User-Festlegung 2026-05-04: Bilder fuer alle 21 PLLs kommen im
naechsten Rollout. Implementierung analog zu OLL:
- PNGs nach `frontend/src/assets/pll/` kopieren
- `lib/pll-images.ts` mit 21 statischen Vite-Imports + `getPllImage()`
- `CubeStateView.tsx` `getPllImage()`-call ergaenzen (PLL-Pfad)
- evtl. groessere Drill-Bilder weil PLL-Cycle-Diagramme detailreicher
  sind als OLL-Orientation-Diagramme

**Phase 11 — WCA-Ranking** (optional):
Hardcoded WR-Tabelle pro Event, Anzeige „Du waerst Top X% weltweit"
in StatsCard.

**Nach v1.0**:
- Phase 11 — WCA-Ranking-Lookup (hardcoded WR-Tabelle, „Top X% weltweit")
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

- **Branch:** `main` (sauber)
- **Tags:** `v0.0` … `v1.0`, **`v1.0.1`** (aktuell, Hotfix)
- **Tests:** 260 backend + 112 frontend = **372 gruen**
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

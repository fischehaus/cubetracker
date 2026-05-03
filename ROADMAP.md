# ROADMAP — cubetracker

## Phase 1 — MVP (5 Features, Tag `v0.1`)

Ziel: App lauffaehig auf localhost, manuelle Solve-Erfassung +
csTimer-CSV-Import + Basis-Stats.

- [x] **F1: Solve + Session-Datenmodell + DB-Setup** ✅ done
  - SQLAlchemy-Models `Solve` + `Session` (Session vorgezogen aus
    F14, weil csTimer-Import sie als Konzept braucht)
  - Alembic-Migrations-Setup, erste Revision `1cbfe3113a0f`
  - SQLite-Datei in `backend/data/solves.db`
  - 8 Unit-Tests, alle gruen
- [x] **F2: API: Solves + Sessions CRUD** ✅ done
  - 5 Solve-Endpoints (list/create/get/patch/delete) mit Filter
    (cube_type, session_id) + Pagination (limit/offset)
  - 2 Session-Endpoints (list/get) — POST/PATCH/DELETE in F14
  - 20 API-Tests (alle Endpoints + Validation + Edge-Cases)
  - Live-Smoketest gegen laufenden Backend gruen
- [x] **F3: Frontend: Solves-Liste + Eintragen** ✅ done
  - `SolveForm`: Zeit-Eingabe ("12.34" oder "1:23.45"),
    Cube-Type-Dropdown (mit „Custom"-Option), +2/DNF-Toggles,
    optional Scramble + Notes
  - `SolveList`: Tabelle mit Cube-Filter, Pagination, Inline-
    Toggle fuer +2/DNF, Loeschen mit Confirm
  - `lib/api.ts`: Tanstack-Query-Hooks fuer alle CRUD-Operationen,
    Auto-Invalidate nach Mutationen
  - `lib/format.ts`: Zeit-Formatierung (csTimer-Stil),
    Standard-Cube-Type-Liste
  - Health-Badge oben rechts mit Auto-Refresh alle 30s
- [x] **F4: csTimer-JSON-Import** ✅ done
  - Backend: `importers/cstimer.py` (Parser, Cube-Type-Mapping fuer
    18 scrType-Codes, Dedup-Check via timestamp+time_ms+session,
    Session-Upsert via cstimer_session_id)
  - API: `POST /import/cstimer` (multipart upload), liefert
    Statistik-Dict zurueck
  - Frontend: `ImportPanel` (File-Upload mit Status), `SessionSwitcher`
    (Dropdown alle Sessions)
  - 24 Tests (15 Unit + 5 API + 4 weitere) alle gruen
  - **Real-Lauf: 6201 Solves + 22 Sessions importiert in einem Schwung,
    Re-Import erkennt alle 6201 als Duplikate** ✅
- [x] **F5: Basis-Statistiken + Rekorde-Markierung** ✅ done
  - Backend: `stats/calc.py` (pure Funktionen, WCA-Trimmed-Mean,
    Avg5/12/100, Best/Worst/Mean, Sliding-Window fuer Best-Avg),
    `api/stats.py` (`GET /stats?cube_type=X&session_id=Y`)
  - Stats-Response inkl. `best_solve_id` fuer PB-Marker
  - Frontend: `StatsCard` (Counter Solves/Valide/DNF, Singles,
    Aktuelle + Beste Averages), `SolveList` mit goldenem PB-Marker
    (★ + `bg-yellow-500/5`)
  - 25 neue Tests (19 unit + 6 API), gesamt 77 Tests gruen
  - **Live-Verifikation: 3x3 PB 7.85s, Avg100 10.89s aus 1818 echten
    3x3-Solves** ✅

## Phase 2 — Visualisierung + Multi-Cube-Insights (Tag `v0.2`) ✅

Neudefinition 2026-05-03: ursprueglich „WCA-Integration" → ersetzt durch
Visualisierung der echten 6202 Solves, weil hoeherer direkter Nutzen.

- [x] **F5.1: UX-Polish** ✅ done
  - Limit-Selector (50/100/200/500/1000/Alle) in SolveList
  - Rolling ao5/ao12 als Sub-Zeile unter jeder Solve-Zeit
  - Datum als Tooltip (Spalte gespart)
  - csTimer-Stackmat-Parser im SolveForm (`945` → 9.45s, etc.)
  - **Bug-Fix:** Mutations invalidieren auch `['stats']` —
    StatsCard war veraltet nach +2/DNF-Toggle
- [x] **F6: Charts** (Trends + Histogramm) ✅ done
  - `TrendsChart`: Linien-Chart mit ao5/ao12/ao100 + optional Singles,
    Window-Selector fuer 6000+ Solves
  - `HistogramChart`: Bar-Chart der Zeit-Verteilung,
    Sturges-Bin-Breite + Snap-to-Round
  - Recharts dark-themed, 8 unit-tests fuer Bin-Logik
- [x] **F7: Outlier-Helper** ✅ done (kam aus Real-Use-Befund)
  - `lib/outliers.ts`: pure Funktion, cube-spezifischer Median
  - `OutlierCard`: amber-Card im Aside, Quick-Actions DNF/Loeschen
  - Schwellen: `< 30%` Median = zu schnell, `> 5×` Median = zu langsam
  - 9 unit-tests
- [x] **F8: Backend-Limit-Bump** ✅ done (Hotfix)
  - `/solves` cap von `le=1000` auf `le=100_000` — sonst 422 bei
    Histogramm + „Alle" mit > 1000 Solves
- [x] **F11: Multi-Cube-Vergleich** ✅ done
  - Neuer Endpoint `GET /stats/by-cube`: pro Cube current_ao5,
    mean_ms, best_ms, form_factor (= current_ao5 / mean_ms)
  - `MultiCubeCompareCard`: ranked Liste + Highlight „aktuell beste
    Form" + ▼/▲-Marker mit Prozent-Abweichung
  - 5 neue API-Tests
  - **User-Hauptwunsch vom 2026-05-02 erledigt**: „in welchem Wuerfel
    bist du gerade am besten?"
- **Verschoben** (urspruenglich Phase 2):
  - F9 WCA-Profil-Verknuepfung — externe API, geringerer Direkt-Nutzen
  - F10 WCA-Turnier-Import per ID — analog

## Phase 3 — Coaching + Insights (Tag `v0.3`) ✅

User-Wuensche vom 2026-05-02 + Phase-2-Befunde:

- [x] **F11: Multi-Cube-Performance-Vergleich** ✅ (in Phase 2 vorgezogen)
- [x] **Form-Faktor v2** ✅ done — Tagesform statt Lernkurve
  - `form_factor_recent` = current_ao5 / mean(letzte 100)
  - Lifetime-Form bleibt als Fallback bei <20 Solves
  - Bessere Antwort auf „wo bin ich aktuell am besten" — vorher
    war es nur „wo lerne ich am steilsten"
- [x] **F12: Verbesserungs-Tracking** ✅ done
  - Pro Cube: `improvement_ms` (mean letzte 50 - mean davor 50)
  - In MultiCubeCompareCard als kleine Trend-Zeile (gruen/rot)
  - Bracht mind. 100 valide Solves im Cube
- [x] **F13: Trainings-Reminder-System** ✅ done
  - `last_solve_at` + `days_since_last` pro Cube im /by-cube-Endpoint
  - `ReminderCard` (blau) im Aside, listet Cubes mit ≥7 Tagen Pause
  - Sortiert „laengste Pause zuerst"
  - Card rendert null wenn alle Cubes frisch sind
- [x] **F14: Sessions** ✅ (in Phase 1 als Datenmodell + UI fertig)
- [x] **F15: Tages-/Wochen-Statistiken** ✅ done
  - Endpoint `GET /stats/temporal` liefert today + week slices
  - `TodayWeekCard` als Header der Hauptspalte
  - Pro Slice: count, count_per_cube (top 3), mean, current_ao5
  - Kalender-Tag (UTC), ISO-Woche (Mo-So)
- [x] **F7: Inline-Edit** ✅ done (kam aus Phase-2-Outlier-Use)
  - Click-to-edit fuer Zeit + Notizen direkt in SolveList
  - Enter speichert, Esc bricht ab, onBlur speichert auch
  - Nutzt existing `parseTimeInput` → akzeptiert csTimer-Stackmat
    Format wie im SolveForm**

## Phase 4 — Visualisierungs-Refactor + UX-Polish (Tag `v0.4`) ✅

Neudefinition 2026-05-03: ursprunglich „Hardware-Tracking", aber im
realen Use zeigte sich vor Hardware ein viel groesseres UX-Problem:
die App war zu dicht, zu klein, zu eindimensional fuer die drei
realen Nutzungs-Modi (Solving, Live, Analyse). Hardware-Inventar
ist parkt fuer Phase 5.

- [x] **A: Y-Achsen smart-skaliert + manuell** ✅ done
  - `lib/chart-utils.ts` mit `computeYDomain` (P2..P98 + Padding)
  - manuelle min/max-Inputs ueber TrendsChart, Reset bei Filter-Wechsel
  - 13 unit-tests
- [x] **B: Tab-Routing** ✅ done
  - `TabBar` (3 Tabs gross, lila aktiv-state, h-14)
  - 3 Modi: TIMER / DASHBOARD / ANALYSE
  - SessionSwitcher in Header gehoben (App-weit)
  - localStorage-persistenz fuer Tab-Wahl
- [x] **C: TIMER-Tab Redesign** ✅ done
  - `BigTimerInput`: text-7xl/5rem zentrale Eingabe, auto-focus +
    auto-re-focus, csTimer-stackmat-format
  - `LastSolvesPreview`: Live-card (letzter solve text-4xl, ao5/ao12
    text-3xl, form-vergleich vs window) + mini-list mit quick-delete
- [x] **D: DASHBOARD-Tab Polish** ✅ done
  - 3-Spalten-Top: ActivityCard (Heute) + ActivityCard (Woche) +
    ReminderCard
  - MultiCube-Vergleich + StatsCard auf voller Breite
  - groessere Zahlen (text-5xl Counts)
- [x] **E: ANALYSE-Tab Polish** ✅ done
  - `AnalyseFilterBar` zentralisiert Cube-Filter
  - TrendsChart full-width
  - HistogramChart (2/3) + OutlierCard (1/3) nebeneinander
  - SolveList full-width mit inline-edit
  - Stats + Import 1/2 + 1/2 unten
- [x] **F: Globaler Font + Padding Pass + Cleanup** ✅ done
  - einheitliche Stufung (h2 2xl, h3 xl, body base, sub sm)
  - Card-padding p-5 -> p-6
  - dead code entfernt (SolveForm + TodayWeekCard)
- [x] **Bonus tweaks aus user-feedback** ✅ done
  - OutlierCard akzeptiert sessionId-prop
  - Mini-Liste delete pro Solve
  - Form-Vergleich fuer ao5+ao12+ao100 mit gemeinsamem Window-Selector
    (letzte 100/500/alle)

## Phase 5b — Quick-Wins + Stats-Bundle (Tag `v0.6`) ✅

User-feedback-runde nach phase 5. Bewusst als eigene minor-version
markiert, weil mehrere related features in stats + sessions/hardware-
verwaltung dazugekommen sind.

- [x] **Quick-Wins**:
  - „Aktivität" mit umlaut (ActivityChart-headline + loading-text)
  - X-Achse kompakt: pro Tag „03" statt „2026-05-03", pro Woche
    „W18" statt „2026-W18"
  - Backend-Version zentralisiert (`__version__` in main.py) und auf
    `0.6.0` gebumpt — vorher hartkodiert „0.1.0" an zwei stellen
  - Hardware-Name editierbar in HardwareList (war nur notes editierbar)
- [x] **5c: Sessions Merge + Delete-Migration**
  - Backend: `POST /sessions/{id}/merge?target_id=Y` (atomic: solves
    umlegen, notes appenden, source loeschen)
  - Backend: `DELETE /sessions/{id}?move_solves_to=Y` — solves
    optional auf andere session verschieben statt verwaisen
  - Frontend: SessionList mit Modals fuer beide aktionen
  - 9 neue api-tests
- [x] **5d: Hardware-Performance-Vergleich**
  - Backend: `GET /stats/by-hardware?cube_type=X` — pro hardware:
    count, mean, best, ao5; sortiert nach pb
  - „Ohne Hardware" als pseudo-gruppe fuer csTimer-importe
  - Frontend: HardwareCompareCard im ANALYSE-tab (nur sichtbar wenn
    cube-filter gesetzt — ohne filter waere vergleich bedeutungslos)
  - 6 neue api-tests
- [x] **6: Dashboard Cube/Session-Vergleich + Hardware-Drilldown**
  - Backend: `GET /stats/by-session` analog zu by-cube
  - Frontend: neue MultiCompareCard mit toggle [Cube|Session]
    - mode-wechsel schliesst aktive drilldowns
    - klick auf cube-zeile → inline hardware-vergleich (mit ★ pb-marker)
    - klick auf session-zeile → inline cubes-in-session-tabelle
  - alte MultiCubeCompareCard.tsx ersetzt + geloescht
  - 5 neue api-tests

**Tests gesamt:** 146 backend + 68 frontend = 214 gruen.

## Phase 5 — Hardware-Tracking + Session-Aware Timer (Tag `v0.5`) ✅

Seed-Daten in `docs/hardware-inventory-seed.md` (37 physische Cubes
ueber 11 Cube-Types). Im Verlauf erweitert um Session-Verwaltung
(User-Wunsch 2026-05-04 fuer Session-Selektor im Timer).

- [x] **F16: Hardware-Inventar (CRUD)** ✅ done
  - Hardware-Model + Alembic-Migration (FK Solve.hardware_id mit
    ondelete=SET NULL via batch_alter_table fuer SQLite)
  - REST-API: GET/POST/PATCH/DELETE /hardware + /seed
  - Seed-Modul: 37 Cubes vom 2026-05-03 als Python-Daten
  - Frontend: HardwareList im ANALYSE-Tab (gruppiert pro cube_type,
    inline-edit notes, aktiv-toggle, seed-button bei empty-state)
- [x] **F17: Hardware-Tracking pro Solve** ✅ done
  - hardware_id-FK ist jetzt echte ForeignKey (Phase-1-Vorsicht
    aufgehoben)
  - GET /hardware/suggest?cube_type=X liefert most_used / first_active
  - BigTimerInput: Hardware-Selektor mit Auto-Pick + ★auto-tag
  - SolveList: Hardware-Name als sub-zeile unter cube_type
- [x] **F-NEU: Session-Aware Timer** ✅ done
  - Session.notes Feld + Alembic
  - POST/PATCH/DELETE /sessions endpoints
  - GET /sessions/suggest?cube_type=X (analog zu hardware-suggest)
  - BigTimerInput: Session-Selektor mit Auto-Pick + Inline-„Neue
    Session anlegen"
  - SessionList im ANALYSE-Tab (Liste, edit name+notes, loeschen)
  - TimerTab managed eigenen sessionId-state, sodass
    LastSolvesPreview parallel auf dieselbe Session filtert

**Verschoben in spaetere Phase:**
- F18: Hardware-Performance-Vergleich (eigener Endpoint /stats/by-hardware)
- F19: Aktive-Hardware-Empfehlung pro Event (kann auf F17-Daten aufbauen)
- F20: Custom-Reports + Backup/Sync

## Phase 6 — Distribution (Tag `v1.0`)

Aus User-Wunsch 2026-05-03: app als installer-paket fuer fremde
Windows-Rechner (z.B. fuer Familien-/Freunde-Test). **Bewusst nach
Phase 5**, weil sich vorher noch DB-Schema (hardware_id) und
Feature-Set bewegen.

- [ ] **F21: Backend serviert Frontend statisch**
  - `npm run build` -> `frontend/dist/`
  - FastAPI mountet `dist/` via StaticFiles
  - Production-mode: nur ein Prozess statt zwei (kein Vite mehr noetig)
- [ ] **F22: PyInstaller-Bundle + Auto-Browser-Open**
  - PyInstaller-spec: bundlet python-runtime + uvicorn + fastapi +
    sqlalchemy + alembic + frontend-dist + alle deps in eine .exe
  - Beim start: freier port suchen, uvicorn binden, default-browser
    auf `http://localhost:<port>` oeffnen
  - Erwartete .exe-groesse: ~50-80 MB
- [ ] **F23: Persistenz auf %LOCALAPPDATA%**
  - DB-pfad nicht mehr `backend/data/solves.db`, sondern
    `%LOCALAPPDATA%\cubetracker\solves.db` (ueberlebt updates)
  - Alembic-migrations laufen beim ersten start auf der user-DB
  - Optional: alte dev-DB auf migration ueber UI importierbar
- [ ] **F24: Inno-Setup-Installer**
  - Installer-script (.iss): start-menue-eintrag, desktop-icon,
    add/remove-programs, uninstaller
  - Icon-set (16/32/48/256 px) fuer .exe + installer
  - Versions-info (file-properties)
  - **Optional Code-Signing-Zertifikat** (~70-200€/jahr) gegen
    Defender-False-Positives
- [ ] **F25: Auto-Update (optional)**
  - Beim start: github-releases-API checken auf neuere version
  - User-prompt 'neue version verfuegbar — installieren?'
  - Squirrel oder eigener simpler updater

**Stolpersteine vorab dokumentiert:**
- Antivirus-False-Positives bei PyInstaller-exes (heuristisch),
  Loesung Code-Signing oder User-Toleranz
- Bundle-Groesse ~70 MB ist gross fuer eine Speedcube-app, aber
  fuer Solo-Einsatz akzeptabel
- DB-Migrationen muessen beim ersten installer-start sauber laufen
- Browser-Abhaengigkeit: jeder Windows hat Edge → kein Problem

**Aufwand-Schaetzung:** ~1 ehrlicher Arbeitstag fuer POC-Installer,
~2-3 Tage fuer poliertes Endprodukt mit Icon + Signing.

**Alternativen bewusst verworfen:**
- Tauri (Rust-Shell, ~10-20 MB): Python-Sidecar-Komplexitaet zu hoch
- Electron: ~150-200 MB Installer, overkill
- Portable ZIP: einfacher, aber kein 'echter' installer-eindruck

## Status-Tracking

- ✅ Phase 1 MVP: **fertig** (5/5 Features, Tag `v0.1`)
- ✅ Phase 2: **fertig** (Charts + Outlier + Multi-Cube, Tag `v0.2`)
- ✅ Phase 3: **fertig** (Coaching + Insights + Inline-Edit, Tag `v0.3`)
- ✅ Phase 4: **fertig** (Visualisierungs-Refactor + UX-Polish, Tag `v0.4`)
- ✅ Phase 5: **fertig** (Hardware-Inventar + Session-Aware Timer, Tag `v0.5`)
- ✅ Phase 5b: **fertig** (Quick-Wins + Sessions Merge + Hardware-Vergleich + Dashboard-Toggle, Tag `v0.6`)
- ⏸ Phase 7: pending (Personal Trainer — Achievements + Daily Challenges)
- ⏸ Phase 8: pending (Distribution / Installer → Tag `v1.0`)

## Tags

- `v0.0` — Skeleton (Setup, Tooling, leere App)
- `v0.1` — Phase 1 MVP komplett (Solves-CRUD, csTimer-Import,
  Session-Switcher, Basis-Stats + PB-Marker)
- `v0.2` — Phase 2: UX-Polish, Trends-Chart, Histogramm,
  Outlier-Helper, Multi-Cube-Vergleich
- `v0.3` — Phase 3: Form-Faktor v2, Tag/Wochen-Stats,
  Verbesserungs-Tracking, Trainings-Reminder, Inline-Edit
- `v0.4` — Phase 4: 3-Tab-Architektur, Y-Achse smart, BigTimerInput,
  Form-Vergleich, einheitliche Schriftgroessen + Padding
- `v0.5` — Phase 5: Hardware-Inventar (CRUD + Seed), Session-Aware
  Timer (Selektoren mit Auto-Pick + neue Session inline), SessionList
  + HardwareList im ANALYSE-Tab, ActivityChart pro Tag/Woche/Monat
- `v0.6` — Phase 5b: Quick-Wins (Umlaut, Tag-Achse, Backend-Version,
  HW-Rename), Session-Merge + Delete-Migration, Hardware-Performance-
  Vergleich, Dashboard-Toggle Cube/Session mit Hardware-Drilldown

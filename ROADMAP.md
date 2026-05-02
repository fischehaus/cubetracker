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

## Phase 4 — Hardware-Tracking + Performance-Vergleich (5, Tag `v0.4`)

NEU mit User-Wuenschen vom 2026-05-02:

- [ ] **F16: Hardware-Inventar**
  - Wuerfel-Modelle (z.B. MGC v3, RS3M 2020, GAN 13, etc.)
  - Pro Modell: Cube-Type, Anschaffungsdatum, Notizen
  - CRUD-API + Frontend-Liste
- [ ] **F17: Hardware-Tracking pro Solve**
  - `hardware_id` FK aktivieren (Migration)
  - Frontend: bei Solve-Eintrag optional Wuerfel auswaehlen
  - „Aktiver Wuerfel pro Cube-Type"-Default-Setting
- [ ] **F18: Hardware-Performance-Vergleich**
  - „Mit MGC bist du im Schnitt 0.8s schneller als mit RS3M auf 3x3"
  - Pro Cube-Type: Avg + Best pro Hardware-Modell
  - Visualisierung als Vergleichs-Chart
- [ ] **F19: Aktive-Hardware-Empfehlung pro Event**
  - „Fuer 3x3-Race nimm aktuell MGC" (basierend auf Avg5/Avg12 der letzten Solves)
  - Pro Cube-Type ein Recommend-Widget
- [ ] **F20: Custom-Reports + Backup/Sync**
  - Export-Reports nach Zeitraum, Cube-Type, Hardware
  - Backup als JSON/SQLite-Dump
  - Optional Cloud-Sync (Drive)

## Status-Tracking

- ✅ Phase 1 MVP: **fertig** (5/5 Features, Tag `v0.1`)
- ✅ Phase 2: **fertig** (Charts + Outlier + Multi-Cube, Tag `v0.2`)
- ✅ Phase 3: **fertig** (Coaching + Insights + Inline-Edit, Tag `v0.3`)
- ⏸ Phase 4: pending (Hardware-Tracking)

## Tags

- `v0.0` — Skeleton (Setup, Tooling, leere App)
- `v0.1` — Phase 1 MVP komplett (Solves-CRUD, csTimer-Import,
  Session-Switcher, Basis-Stats + PB-Marker)
- `v0.2` — Phase 2: UX-Polish, Trends-Chart, Histogramm,
  Outlier-Helper, Multi-Cube-Vergleich
- `v0.3` — Phase 3: Form-Faktor v2, Tag/Wochen-Stats,
  Verbesserungs-Tracking, Trainings-Reminder, Inline-Edit

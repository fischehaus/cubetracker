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

## Phase 2 — Cube-Vielfalt + Detail (5, Tag `v0.2`)
- [ ] **F6: Cube-Type-Filter** — Voraussetzung fuer Phase-3-Multi-Cube-Vergleiche
- [ ] **F7: Solve-Detail mit Scramble + Notizen**
- [ ] **F8: Trends-Chart** (Avg-Verlauf ueber Zeit, Recharts)
- [ ] **F9: WCA-Profil-Verknuepfung** (User-ID)
- [ ] **F10: WCA-Turnier-Import per ID**

## Phase 3 — Coaching + Multi-Cube-Analytics (5, Tag `v0.3`)

NEU mit User-Wuenschen vom 2026-05-02:

- [ ] **F11: Multi-Cube-Performance-Vergleich**
  - Pro Wuerfel: aktueller Avg5 vs. Gesamt-Durchschnitt
  - Output: „in welchem Wuerfel bist du gerade am besten?"
  - Dashboard-Widget mit Ranking der Wuerfel nach „Form-Faktor"
- [ ] **F12: Verbesserungs-Tracking**
  - Pro Wuerfel: Veraenderungs-Rate ueber Zeitfenster
    (z.B. letzte 50 vs. davor)
  - Output: „groesster Sprung: 4x4, -1.8s in den letzten 100 Solves"
  - Sortierung „wo verbesserst du dich am stuerksten gerade?"
- [ ] **F13: Trainings-Reminder-System**
  - Erinnerung bei „lange nicht gemacht" (z.B. >7 Tage)
  - Erinnerung bei „stagniert in letzter Zeit" (Verbesserung < Schwellwert)
  - Dashboard-Banner + optional Browser-Notification
- [ ] **F14: Sessions** (Trainings-Sessions gruppieren, `session_id` aktivieren)
- [ ] **F15: Plus/Minus/DNF-Markierung + Tages-/Wochen-Statistiken**

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
- ⏸ Phase 2-4: pending

## Tags

- `v0.0` — Skeleton (Setup, Tooling, leere App)
- `v0.1` — Phase 1 MVP komplett (Solves-CRUD, csTimer-Import,
  Session-Switcher, Basis-Stats + PB-Marker)

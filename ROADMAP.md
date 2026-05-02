# ROADMAP — cubetracker

## Phase 1 — MVP (5 Features, Tag `v0.1`)

Ziel: App lauffaehig auf localhost, manuelle Solve-Erfassung +
csTimer-CSV-Import + Basis-Stats.

- [ ] **F1: Solve-Datenmodell + DB-Setup**
  - SQLAlchemy-Model `Solve`
  - Alembic-Migrationen-Setup
  - SQLite-Datei in `backend/data/solves.db`
  - Felder vorgesehen fuer Phase 3+4: nullable `session_id`, `hardware_id`
- [ ] **F2: API: Solves CRUD**
  - GET /solves (mit Filter)
  - POST /solves
  - GET /solves/<id>
  - DELETE /solves/<id>
  - PATCH /solves/<id> (fuer plus_two/dnf-Toggle)
- [ ] **F3: Frontend: Solves-Liste + Eintragen**
  - SolveList-Component (Tabelle)
  - SolveForm-Component (Eintrag)
  - Tanstack Query fuer API-State
- [ ] **F4: CSV-Import (csTimer-Format)**
  - POST /import/cstimer (multipart upload)
  - Parser fuer csTimer-CSV
  - Frontend: Upload-Button mit Drop-Zone
- [ ] **F5: Basis-Statistiken**
  - GET /stats (avg5, avg12, avg100, best, worst, mean)
  - StatsCard-Component (Anzeige im Dashboard)

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

- ⏳ Phase 1: in Arbeit (Setup laeuft)
- ⏸ Phase 2-4: pending

## Tags

(noch keine — erster Tag `v0.0` nach Skeleton)

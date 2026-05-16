# cubetracker

Speedcubing-Solve-Tracking-App. Zwei Varianten parallel:

- **Web-Variante** — live unter **[cubetracker.de](https://cubetracker.de)**
  (Multi-User, eigene Accounts, PostgreSQL-DB).
- **Desktop-Variante** — Single-User, lokal laufend, SQLite-Datei, als
  Windows-Installer ausgerollt.

## Was kann's?

- WCA-konformer Timer (Spacebar + Touch-Modus), Inspection-Countdown,
  Penalty-Auto-Detect (+2 / DNF)
- Scrambles für alle WCA-Cubes (2x2 bis 7x7, Pyraminx, Skewb, Square-1,
  Megaminx, Clock) PLUS einige Inoffizielle (Ivy mit echtem
  Random-State-Solver, Gear, Redi, Master Pyraminx, Master Skewb, FTO)
- Solve-Statistiken: Single / Mo3 / AO5 / AO12 / AO100 — WCA-konform
  berechnet
- Charts: Trends, Verteilung, tägliche Aktivität
- Multi-Cube-Performance-Vergleich + Hardware-Performance-Vergleich
- Hardware-Inventar (welcher Cube wurde für welchen Solve genutzt)
- Trainings-Sets (5/12/25/50/100 Solves mit Coaching-Feedback)
- Algorithm-Trainer (PLL + OLL mit 57 Visualisierungen)
- Achievements + Daily Challenges
- WCA-Turniere in der Nähe (mit Distanz-Berechnung basierend auf
  Profil-PLZ + Land)
- Speedcubing-News (WCA Posts, SpeedCubing.org, r/Cubers)
- Friend-System mit Bestenliste
- csTimer-Import/-Export (kompletter Bestand)
- Voll-Backup als JSON + automatische Snapshots
- Multi-User-Isolation (Web-Variante)

Vollständige Feature-Liste in der App unter „Was kann diese App?"
(Footer-Link auf [cubetracker.de](https://cubetracker.de)).

## Feedback / Bug-Reports / Feature-Wünsche

Drei Wege:

1. **GitHub Issue** — [neues Issue erstellen](https://github.com/fischehaus/cubetracker/issues/new/choose).
   Templates für Bug-Report + Feature-Wunsch führen dich durch die
   wichtigen Fragen.
2. **In der App** — Footer-Link „💬 Feedback" → Modal mit GitHub-Link
   ODER Email-Form (für User ohne GitHub-Account, Backend sendet Email
   an den Entwickler).
3. **Bestehende Issues anschauen** — [Issues-Tab](https://github.com/fischehaus/cubetracker/issues)
   (kommentieren + Reaktionen zeigt was Community priorisiert).

## Tech-Stack

### Backend
- **Python 3.12+**, FastAPI, SQLAlchemy 2.0, Pydantic 2
- **DB**: PostgreSQL (Web prod) / SQLite (Desktop)
- **Auth**: Email + Password (bcrypt) + JWT (HS256) + HttpOnly-Refresh-Cookie
- **Email**: Resend (für Verifikation, Password-Reset, Feedback)

### Frontend
- **React 19** + Vite + TypeScript (strict mode) + Tailwind CSS
- Tanstack Query für API-State
- Recharts für Charts
- Vitest für Tests

### Hosting (Web-Variante)
- **Render.com** Free-Tier (Backend + Frontend Static-Site + PostgreSQL)
- **Domain** via INWX, SSL via Let's-Encrypt
- Hetzner-Migration geplant Mitte 2026 (vor Render-Postgres-90d-Limit)

## Projekt-Struktur

```
cubetracker/
├── backend/        — Desktop-Variante (Single-User, SQLite)
├── webapp/         — Web-Variante (Multi-User, PostgreSQL)
│   ├── api/        — FastAPI-Endpoints
│   ├── auth/       — JWT + Password-Hashing + Rate-Limiting
│   ├── db/         — SQLAlchemy-Models + Schemas
│   ├── stats/      — WCA-Trimmed-Mean + Statistik-Berechnung
│   ├── achievements/, challenges/, friends/, leaderboard/
│   ├── wca/        — WCA-API-Wrapper + Geocoding + Distance
│   ├── news/       — RSS-News-Aggregator
│   ├── emailing/   — Resend-Email-Templates
│   ├── importers/, exporters/  — csTimer
│   ├── backup/     — Snapshot + Restore
│   ├── changelog/  — Patch-Notes (Single-Source)
│   └── frontend/   — React-App
├── .claude/        — Claude-Code-Hooks + Slash-Commands (Workflow)
├── .github/        — Issue-Templates
├── ROADMAP.md      — Phasen-Historie + offene Items
├── CHANGELOG.md    — Tag-by-Tag-Doku
├── NEXT_SESSION.md — Wiederaufnahme-Punkte für Entwicklung
└── CLAUDE.md       — Tech-Stack + Disziplin + Konventionen
```

## Lizenz / Wiederverwendung

Aktuell kein expliziter Lizenz-Eintrag — bedeutet **all rights reserved** per
Default. Wenn du Teile des Codes nachnutzen willst (z.B. den
[Ivy-Cube-Random-State-Solver](webapp/frontend/src/lib/ivyScramble.ts)),
[öffne ein Issue](https://github.com/fischehaus/cubetracker/issues/new) und
wir klären's. Ich freue mich grundsätzlich über Open-Source-Wiederverwendung.

## Status

Web-Variante ist **Phase W in Bau** — täglich aktualisiert, kein Feature-Freeze.
Aktueller Stand: siehe Patch-Notes in der App
([https://cubetracker.de](https://cubetracker.de) → Versions-Badge oben rechts).

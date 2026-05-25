# Changelog

Notable changes only. Single-Dev-Projekt, kein striktes SemVer — wir nutzen
`v2.0.0-alpha.W.X` waehrend der Multi-User-Web-Phase. v2.0.0 = stable release
sobald das Feature-Set fuer Friends/Public-Profile komplett ist (die
Hetzner-Migration ist seit 2026-05-22 durch).

> **Single-Source-Hinweis:** Die maßgeblichen Per-Release-Patch-Notes liegen in
> `webapp/changelog/data.py` (in der App sichtbar). Dieser CHANGELOG erfasst die
> großen Meilensteine. Die Feature-Wellen zwischen W.10 und heute (Voice-Alert,
> Penalty-Quick-Buttons, Custom-Scramble, Roadmap-Modal, Scramble-Bild-2D-Net,
> GPL-Migration, csTimer-Vendor-Port, Admin-Workflow, Umlaut-Migration,
> PB-History) sind dort dokumentiert.

## Infra: Post-Migration-Cleanup + Auto-Deploy (2026-05-25)

**Commits**: `d2806b3`, `4d8872b` (Branch `feature/W-api-prefix`)

- Alle Render-Bezüge aus UI + Code-Kommentaren entfernt (Login-„Render-Free-
  schläft"-Tipp weg, Roadmap-Phase „Eigene Infrastruktur" auf erledigt/grün —
  neuer `done`-PhaseStatus).
- **Frontend-Auto-Deploy** via EINEM GitHub-Webhook: Push auf
  `feature/W-api-prefix` → Coolify deployt das Frontend. Backend-only-Änderungen
  weiterhin manueller „Redeploy" (Monorepo-Dedup: zwei Webhooks würden sich
  gegenseitig schlucken).
- Tägliche DB-Backups via Coolify aktiv; Hetzner-Server-Backup gebucht.

## Infra: Hetzner-Migration — LIVE (2026-05-22)

cubetracker.de läuft jetzt auf **Hetzner Cloud (CPX22) + Coolify v4** statt
Render. Auslöser: Render-Free-Postgres-90-Tage-Cutoff (~2026-08-08).

- Alle **13.590 Solves** + 13 Tabellen 1:1 migriert (`pg_dump` PG18 →
  `pg_restore` PG16, `transaction_timeout`-SET rausgefiltert), HTTPS via
  Let's-Encrypt/Traefik, am Handy verifiziert.
- **One-Domain-Architektur**: Frontend-nginx liefert die SPA + proxyt `/api`
  intern ans (private) Backend — kein CORS, Backend nicht öffentlich.
- Branch `feature/W-api-prefix` (live, nicht gemergt). Commits u.a. `8f69642`
  (/api-Prefix), `94cd1d5`/`fa956e4` (Dockerfiles + nginx-Proxy), `1abf8a2`
  (changelog-Doppelprefix-Fix + Regr.-Test), `3902c2f` (nginx-Resolver),
  `672d313` (health/changelog-Pfad-Fix).
- Render bleibt Rollback bis Phase 6 (~2026-06-05). Runbook + Execution-Post-
  Mortem: `docs/hetzner-migration-runbook.md`.

## v2.0.0-alpha.W.10 — Leaderboards (2026-05-13)

**Commit**: `8966715`

Neu — Cross-User-Vergleich mit accepted-Friends:
- Top-Tab **🏁 Bestenliste** mit Cube-Type-Picker
- Tabelle: Best Single, Best AO5, Best AO12, Aktuelles AO5, Solves (30d),
  Last Active
- Self optisch hervorgehoben + immer oben, Friends nach Best Single sortiert,
  Top-3 mit 🥇🥈🥉
- Nutzt `stats/calc.py:compute_stats()` (WCA: +2-Handling, AO5/AO12
  sliding-window-best mit DNF-Trim)

Backend:
- `leaderboard/service.py` + `api/leaderboard.py`
- 2 Endpoints: `GET /leaderboard?cube_type` + `GET /leaderboard/cube-types`
- Rate-Limit 60/min, KEINE Emails im Output, Display-Name-Fallback "User #ID"
- `_accepted_friend_ids` filtert hart auf `status='accepted'` (kein
  Stranger-Leak)
- Bonus: Backup-Pipeline `.github/workflows/db-backup.yml` daily 02:00 UTC

QA-Sub-Agent-Findings — 0 high, 3 medium gefixt:
- M3 Picker-Fallback bei leerer cube_types-Liste → COMMON_CUBE_TYPES
- M4 TZ-defensive `_aware()` gegen naive timestamps aus altem Import-Pfad
- L6 Empty-State-Race: friendsLoaded-Guard

## v2.0.0-alpha.W.9 — Friend-System (2026-05-13)

**Commit**: `d573b11`

Neu — Friend-System:
- Top-Tab **🤝 Freunde** mit Discoverability-Card, User-Suche (Display-Name
  + exakte Email), Eingehende/Ausgehende Anfragen, Friend-Liste
- Opt-In `users.is_discoverable` (Default false)
- DB-Tabelle `friendships` mit Functional UniqueIndex `(LEAST, GREATEST)` —
  Cross-Direction-Race-Schutz
- 6 API-Endpoints: list / search / lookup-email / request / accept / delete
- Rate-Limits: Display-Name-Search 60/min, Email-Lookup 30/min, Mutation 30/min
- Privacy: Email leakt nur bei accepted-Friends, kein Account-Probing via
  Email-Lookup (identische Antwort fuer "nicht da" + "inaktiv")

QA-Sub-Agent-Findings — alle gefixt (2 high + 3 medium):
- H1 Race → DB-functional UniqueIndex + IntegrityError-Retry
- H2 Auto-Accept-Email-Leak → Auto-Accept entfernt, explizite Inbox-Message
- M1 Email-Brute-Force → separate Rate-Limit-Pool 30/min
- M2 N+1 in /friends/search → Bulk-Friendship-Query
- M4 Outgoing-Pending UX → Cancel-Button im Search-Row

## v2.0.0-alpha.W.admin-2 — Admin User-Mgmt (2026-05-13)

**Commit**: `faedeec`

Admin-Tab in Verwaltung, sichtbar nur fuer `is_admin === true` (env-driven):
- User-Liste mit Solve-Count, Last-Seen, Status-Badges
- Actions: Deaktivieren/Aktivieren, Email manuell verifizieren, DSGVO-Hard-Delete
  (Confirm-String Pflicht), Ad-hoc-Mail an einzelne User
- Bulk-Announcement an alle aktiv+verifiziert mit Dry-Run-Workflow, Cap 80
  Empfaenger (Worker-Timeout-Schutz)
- Token-Revocation bei is_active=false (bestehender Access-Token sofort tot)
- HTML-Escape im Mail-Body (XSS-Defense)

QA-Sub-Agent-Findings (3 medium):
- M1 Subject-CRLF-Sanitize (Header-Injection-Defense)
- M2 Bulk-Mail-Worker-Block-Cap (>80 → BG-Job-Setup faellig)
- M3 dry_run-Mismatch (`setLastResult(null)` bei subject/body-Edit)

## v2.0.0-alpha.W.admin-1 — Admin-Stats-Panel (2026-05-13)

**Commit**: `1a64bcb`

- `GET /admin/stats` Frontend-Card: User-Kacheln, Volume, Top-Cubes, Storage
- `is_admin: bool` in `UserRead` (computed aus `ADMIN_EMAILS`-Env)
- Bonus QA-Fix: React-Query-Cache wird bei Login/Logout/Logged-Out-Event
  geleert (verhinderte Daten-Leak zwischen Sessions)

## v2.0.0-alpha.W.touch — Touch-Timer fuer Phone (2026-05-13)

**Commit**: `f9491e5`

- `useIsTouchDevice` via `matchMedia("(pointer: coarse)")`
- `TouchTimerPad` dispatched synthetische Space-KeyboardEvents → existierender
  `useSpacebarTimer`-Hook reagiert identisch
- Auf Touch-Device automatisch Spacebar-Modus (kein Settings-Detour fuer
  Phone-User)
- Race-Fix F19-Aktive-Hardware-Empfehlung: `cube_type === cubeType`-Gate
  gegen stale Suggest-Response bei schnellem Cube-Wechsel

## v2.0.0-alpha.W.5-ux — UX-Trennung Import/Backup (2026-05-13)

**Commits**: `c11362b`, `6ffb44b`

- VerwaltungTab Daten: Reihenfolge + Aufmacher-Banner trennt klar
  csTimer-Import (Migration) von Cubetracker-Backup-Restore (beide .json)
- Auto-Detect-400: falsches Format → klare Fehlermeldung mit Hinweis
- `csTimer-Import` 500-Crash bei Integer-Session-Namen behoben
  (`str(session_name)` defensiv)

## v2.0.0-alpha.W.5-perf+QA — Performance + Security (vor 2026-05-13)

**Commits**: `789deaa`, `5792e0a`, `0c657fa`, `c2c373f`

- csTimer-Import "Network Error" bei 6000+ Solves behoben:
  Doppel-Import (dry-run+real) raus, Snapshot+Achievement-Recheck via
  `BackgroundTasks` → sofort 200 OK
- Security-Sub-Agent fuer Import/Export: 3 KRITISCH + 4 SOLLTE/NICE gefixt
  (JSON-bomb-Pre-Check, Final-Commit-Recovery, Chunked-Upload-Read,
  Snapshot-Delete-Rate-Limit)
- Admin-Endpoint `GET /admin/stats` (anonyme Aggregate, DSGVO-konform)

## v2.0.0-alpha.W.8 — User-Management + Email (vor 2026-05-13)

**Commits**: `df02a71`, `21f18a0`, `6c780d1`, `73934ad`, `561dbe7`

- Email-Verification + Password-Reset via Resend
- Display-Name optional + Email-Change-Flow (mit Re-Verify)
- `token_version`-Revocation-Pattern: alle aktiven Tokens invalidierbar
- Security-Sub-Agent: 5 kritische Findings gefixt (token-bump bei
  password-change, atomic conditional UPDATE+RETURNING, etc.)
- Live-Migration: `ADD COLUMN IF NOT EXISTS` im Lifespan fuer
  `email_verified` + `display_name`

## v2.0.0-alpha.W.5 — Backup + Snapshots (vor 2026-05-13)

**Commit**: `5c26646`, `ba733d8`, `b5531f3`

- `/backup/json` Voll-Export pro User
- `/backup/restore` mit `mode=merge|replace`, `confirm=DELETE_ALL_MY_DATA`
- Snapshots (manuell + auto vor Restore), max 2 pro User
- BackupPanel-Frontend mit Confirm-Dialog
- csTimer-Import + -Export per User

## v2.0.0-alpha.W.4 — Trainer per User (vor 2026-05-13)

**Commits**: `2f61dc4`, `1317ed2`, `b83c9df`

- Achievements + Challenges + Stats umgebaut auf `user_id`-Filter
- UTC-aware datetimes fuer Postgres-Kompatibilitaet

## v2.0.0-alpha.W.3 — CRUD Multi-User (vor 2026-05-13)

**Commit**: `c225979`

- Solve/Session/Hardware-Endpoints mit `user_id`-Filter aus `current_user`

## v2.0.0-alpha.W.0-W.2 — Auth-Skeleton (vor 2026-05-13)

**Commits**: `85a2af8`, `b791e36`, `e890dc5`

- JWT-Auth (Access-Token + HttpOnly-Refresh-Cookie + Single-Flight-Refresh)
- Register/Login/Logout/Delete-Me
- Render-Blueprint mit Postgres-Free-Tier + Backend-Service + Frontend-Static-Site
- Security-Sub-Agent: 6 KRITISCH-Findings vor Live-Deploy gefixt

## v1.0.1 — Desktop-Stand (2026-05-04)

Letzter Desktop-Tag vor dem Multi-User-Web-Pivot.

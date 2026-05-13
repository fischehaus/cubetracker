# Changelog

Notable changes only. Single-Dev-Projekt, kein striktes SemVer — wir nutzen
`v2.0.0-alpha.W.X` waehrend der Multi-User-Web-Phase. v2.0.0 = stable
release sobald Hetzner-Migration durch + Feature-Set fuer Friends/Public
Profile komplett.

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

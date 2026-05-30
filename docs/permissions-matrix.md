# Sichtbarkeits-Matrix — Wer sieht was?

**Stand:** 2026-05-31 (nach IA-Umbau W1–W3 — Navigation neu, Daten-
Sichtbarkeit unverändert)
**Geltungsbereich:** `webapp/` (cubetracker.de Multi-User-Web-Variante)
**Single-Source:** Diese Datei ist die verbindliche Antwort auf "Wer
sieht welche Daten?". Bei Konflikten zwischen Doku und Code gilt der
Code — Diese Matrix muss dann nachgezogen werden.
**Last-Audit-Commit:** `7a86c40` (`feat(W.ia-admin-bereich): Admin +
Tester eigener UserMenu-Bereich, Verwaltungs-Tab entfernt`, 2026-05-31).
Der IA-Umbau (W1–W3) hat NUR die UI-Navigation verändert (Abschnitt 4);
die Endpoint-/Feld-/Rollen-Sichtbarkeit (Abschnitte 2, 3, 5, 6) ist
identisch geblieben.

---

## 1. Rollen-Hierarchie

```
anonym  →  user  →  friend  →  tester  →  admin
```

| Rolle | Definition | Auth-Marker |
|-------|------------|-------------|
| `anonym` | Kein gültiges JWT, kein Refresh-Cookie | kein `Authorization: Bearer`-Header |
| `user` | Eingeloggter App-User, `is_active=True` | gültiger Access-Token mit passender `token_version` |
| `friend` | `user` + andere Seite einer `Friendship`-Row mit `status='accepted'` | siehe oben + Friendship-Lookup |
| `tester` | `user` + `users.is_tester=True` (DB-Spalte) | siehe oben + DB-Flag |
| `admin` | `user` + `users.is_admin=True` (DB-Spalte) | siehe oben + DB-Flag |

**Erbschaft:** Jede Rolle erbt vollständig vom links stehenden Level.
`admin > tester > user > anonym`. `friend` ist orthogonal zu
`tester`/`admin` (auch ein `admin` ist nur dann „friend von X", wenn
eine accepted Friendship mit X existiert).

**Tester vs. Admin:** Admin sieht alles, was Tester sieht (Tester-
Privilegien sind eine Untermenge der Admin-Privilegien). Im Frontend
(seit W.ia-admin-bereich, 2026-05-31) erreicht ein Tester `is_tester &&
!is_admin` einen eigenen Tester-Bereich über das UserMenu (🧪) mit nur
Live-Tests + Roadmap-Pflege; ein Admin erreicht den Admin-Bereich über
das UserMenu (🛡), der die Tester-Funktionen mit-enthält und zusätzlich
Stats / User-Management / Feedback-Inbox / Announcements. Beide Bereiche
sind rollensichtbar (Render-Gate + UserMenu-Eintrag + Routing-Guard) und
NICHT mehr in der Haupt-TabBar.

**Auth-Dependencies im Code** (`webapp/auth/deps.py`,
`webapp/api/admin.py`):
- `get_current_user` — 401 bei fehlendem/invalidem Token. Pflicht für
  fast alle Endpoints.
- `get_current_user_optional` — gibt `None` zurück statt 401.
  Nur in `api/changelog.py` und `api/roadmap.py` benutzt.
- `require_admin` — fail-closed mit generischem 404 (kein 403!), kein
  Endpoint-Probing möglich.
- `require_admin_or_tester` — fail-closed mit generischem 404.

---

## 2. Datenmodelle pro Tabelle

Quelle: `webapp/db/models.py` (SQLAlchemy) +
`webapp/db/schemas.py` (Pydantic-API-Surface).

Legende:
- ✓  Wird der Rolle ausgeliefert
- ✗  Wird der Rolle NICHT ausgeliefert
- ⚠  Bedingung in der Anmerkung

### 2.1 `users` (User)

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id` | int PK | ✗ | ✓ | ✓ | ✓ | ✓ | Friend sieht's via `FriendUserBrief.id`; Admin via `AdminUser.id`. |
| `email` | string unique | ✗ | ✓ | ⚠ | ✗ | ✓ | Friend sieht Email **nur** bei `friendship.status=='accepted'` (siehe `api/friends.py:_to_friendship_read`). Bei pending: `None`. Search-Result und Email-Lookup leaken Email NIE. |
| `hashed_password` | string | ✗ | ✗ | ✗ | ✗ | ✗ | bcrypt-Hash, NIE im API-Output. Auch Admin sieht keinen brauchbaren Wert (bcrypt nicht reversibel). |
| `is_active` | bool | ✗ | ✓ | ✗ | ✗ | ✓ | Admin via `AdminUser.is_active`. |
| `email_verified` | bool | ✗ | ✓ | ✗ | ✗ | ✓ | UI-Banner nur für Self; Admin via `AdminUser.email_verified`. |
| `display_name` | string nullable | ✗ | ✓ | ✓ | ✗ | ✓ | Search-Result + FriendUserBrief liefern's. Leaderboard rendert Fallback „User #ID" bei `None`. |
| `postal_code` | string nullable | ✗ | ✓ | ✗ | ✗ | ✗ | Nur in `UserRead` für Self. Nicht in `AdminUser`-Endpoint, nicht in Friend-Output. **(Postleitzahl ist sensible Lokationsdaten.)** |
| `country_iso2` | string(2) nullable | ✗ | ✓ | ✗ | ✗ | ✗ | Nur in `UserRead` für Self. |
| `wca_id` | string(10) nullable | ✗ | ✓ | ✗ | ✗ | ✗ | Nur in `UserRead` für Self. Beim Setzen wird das offizielle WCA-Profil daraus geladen (siehe Punkt 6). |
| `is_discoverable` | bool | ✗ | ✓ | ✗ | ✗ | ✗ | Opt-In für User-Suche per Display-Name. Self sieht's; sonst nicht im Output. |
| `token_version` | int | ✗ | ✗ | ✗ | ✗ | ✗ | Reines Server-Internum (JWT-Revocation). Nirgends im API-Output. |
| `is_admin` | bool | ✗ | ✓ | ✗ | ✗ | ✓ | Self sieht's via `UserRead` (Frontend nutzt es um Admin-Tab zu zeigen). Admin sieht es bei anderen Usern via `AdminUser`. |
| `is_tester` | bool | ✗ | ✓ | ✗ | ✗ | ✓ | Analog zu `is_admin`. |
| `created_at` | datetime | ✗ | ✓ | ✗ | ✗ | ✓ | Admin via `AdminUser.created_at`. |
| `solve_count` (aggregat) | int | ✗ | ⚠ | ⚠ | ✗ | ✓ | Admin: via `AdminUser.solve_count`. Friend: via Leaderboard `solve_count_total` für accepted-Friends nur. User-Self via Stats-Endpoints. |
| `last_solve_at` (aggregat) | datetime | ✗ | ⚠ | ⚠ | ✗ | ✓ | siehe `solve_count`. |

### 2.2 `sessions` (Session = csTimer-/Praxis-Session, **nicht** Auth-Session)

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id` | int PK | ✗ | ✓ | ✗ | ✗ | ✗ | Cross-User-Filter `Solve.user_id == current_user.id` in allen Endpoints. |
| `user_id` | int FK | ✗ | ✗ | ✗ | ✗ | ✗ | `SessionRead` enthält `user_id` **nicht** — Self braucht es nicht, kein Leak nach außen. |
| `name` | string | ✗ | ✓ | ✗ | ✗ | ✗ | Nur eigene Sessions. |
| `scramble_type` | string nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `cstimer_session_id` | int nullable | ✗ | ✓ | ✗ | ✗ | ✗ | Pro User unique (DB-Index), nicht global. |
| `notes` | text nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `created_at` | datetime | ✗ | ✓ | ✗ | ✗ | ✗ | – |

### 2.3 `solves`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id` | int PK | ✗ | ✓ | ✗ | ✗ | ✗ | Friend sieht **keine** Einzel-Solves, nur Leaderboard-Aggregate (best, ao5, ao12). |
| `user_id` | int FK | ✗ | ✗ | ✗ | ✗ | ✗ | `SolveRead` enthält kein `user_id`. |
| `time_ms` | int | ✗ | ✓ | ✗ | ✗ | ✗ | Friend sieht via Leaderboard nur Best-Times aggregiert. |
| `cube_type` | string | ✗ | ✓ | ⚠ | ✗ | ✓ | Friend bekommt Best/Ao5/Ao12 pro Cube-Type via Leaderboard. Admin sieht in `/admin/stats` aggregierte Top-10-Cube-Types über alle User. |
| `scramble` | text nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `notes` | text nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `timestamp` | datetime | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `plus_two` | bool | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `dnf` | bool | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `session_id` | int FK nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `hardware_id` | int FK nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `alg_case` | string nullable | ✗ | ✓ | ✗ | ✗ | ✗ | – |
| `split_times_ms` | text nullable | ✗ | ✓ | ✗ | ✗ | ✗ | JSON-Array als String. |
| `effective_time_ms` (computed) | int | ✗ | ✓ | ✗ | ✗ | ✗ | Property aus `time_ms + plus_two`. |

### 2.4 `hardware`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| Alle Felder | – | ✗ | ✓ | ✗ | ✗ | ✗ | Pure pro-User-Tabelle, kein Cross-Visibility. `HardwareRead` enthält kein `user_id`. |

### 2.5 `achievements`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| Definitionen (`code`, `name`, `description`, `category`, `icon`) | – | ✗ | ✓ | ✗ | ✗ | ✓ | Statisch aus `achievements/definitions.py` — selbe Definitionen für alle User. |
| `unlocked_at` (pro User) | datetime nullable | ✗ | ✓ | ✗ | ✗ | ⚠ | Self via `/achievements`. Admin sieht Aggregate (`/admin/stats.volume.achievements_unlocked`), aber keine pro-User-Liste. |

### 2.6 `challenges` (Daily Challenges)

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| Alle Felder | – | ✗ | ✓ | ✗ | ✗ | ✗ | Pure pro-User-Tabelle. |

### 2.7 `snapshots`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id`, `created_at`, `reason`, `counts.{solves,sessions,hardware}` | – | ✗ | ✓ | ✗ | ✗ | ⚠ | Self via `/backup/snapshots`. Admin sieht über `/admin/stats.storage` nur **aggregierte** Bytes/Counts, keine pro-User-Snapshots. |
| `payload_json` | text | ✗ | ⚠ | ✗ | ✗ | ✗ | Inhalt wird nur beim `POST /backup/snapshots/{id}/restore` clientseitig re-importiert, nicht direkt geliefert. |

### 2.8 `password_reset_tokens`, `email_verification_tokens`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `token` | string unique | ⚠ | ✗ | ✗ | ✗ | ✗ | Nur als Mail-Link in Email-Inbox des betreffenden Users (Resend-Mail). NIE im API-Output. Anon-Zugang nur durch tatsächlichen Mail-Inbox-Zugang. |
| Alle anderen Felder (`expires_at`, `used_at`, `new_email`, `user_id`) | – | ✗ | ✗ | ✗ | ✗ | ✗ | Reine Server-Tabellen, kein Endpoint liefert sie aus. |

### 2.9 `friendships`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id`, `status`, `direction`, `created_at`, `accepted_at` | – | ✗ | ✓ | ✓ | ✗ | ✗ | Self sieht eigene Friendships via `/friends/list`. Andere User sehen sie nicht. |
| `requester_id`/`target_id` | int | ✗ | ✗ | ✗ | ✗ | ✗ | Im API-Output zu `other` (FriendUserBrief) übersetzt, keine raw IDs der DB-Spalten. |

### 2.10 `news_items`

| Feld | Typ | Anon | User (self) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| Alle Felder | – | ✗ | ✓ | ✓ | ✓ | ✓ | Globale Tabelle (kein user_id). Public-ish, aber Endpoint `/news/latest` braucht Auth (`get_current_user`) → kein anonymer Aufruf-Spam. |

### 2.11 `feedback_messages` (Phase W.tester-role-db)

| Feld | Typ | Anon | User (eigene) | Friend | Tester | Admin | Anmerkung |
|------|-----|------|-------------|--------|--------|-------|-----------|
| `id` | int | ✗ | ✓ | ✗ | ✗ | ✓ | – |
| `user_id` | int FK SET NULL | ✗ | ✗ | ✗ | ✗ | ✓ | User-Endpoint nutzt slim `FeedbackMessageUserRead` (ohne `user_id`). Admin-Inbox nutzt voll `FeedbackMessageRead`. |
| `category` | string | ✗ | ✓ | ✗ | ✗ | ✓ | "general" / "bug" / "feature" / "other". |
| `message` | text | ✗ | ✓ | ✗ | ✗ | ✓ | – |
| `created_at` | datetime | ✗ | ✓ | ✗ | ✗ | ✓ | – |
| `status` | string | ✗ | ✓ | ✗ | ✗ | ✓ | – |
| `admin_response` | text nullable | ✗ | ✓ | ✗ | ✗ | ✓ | User sieht Antwort sobald gesetzt. |
| `admin_response_at` | datetime nullable | ✗ | ✓ | ✗ | ✗ | ✓ | – |
| `admin_response_by_user_id` | int FK SET NULL | ✗ | ✗ | ✗ | ✗ | ✓ | Slim-Schema versteckt es vor dem User (kein ID-Enumeration des antwortenden Admins). |
| `user_seen_response_at` | datetime nullable | ✗ | ✓ | ✗ | ✗ | ✓ | Wird gesetzt sobald der User die Antwort öffnet. |

**Tester sieht Feedback-Inbox NICHT** — Endpoint `/admin/feedback/*`
hängt an `require_admin` (nicht `require_admin_or_tester`), siehe
`webapp/api/admin.py` Zeile 963.

### 2.12 `roadmap_items` (Phase W.roadmap-db)

| Feld | Typ | Anon | User | Friend | Tester | Admin | Anmerkung |
|------|-----|------|------|--------|--------|-------|-----------|
| Alle Felder (außer `internal=True`-Items) | – | ✓ | ✓ | ✓ | ✓ | ✓ | `/roadmap`-Endpoint ist public (auth-optional). |
| Items mit `internal=True` | – | ✗ | ✗ | ✗ | ✓ | ✓ | Filter in `api/roadmap.py:list_roadmap`: nur wenn `current_user.is_admin OR is_tester` werden internals geliefert. |
| `is_admin`/`is_tester` Flags im Response | bool | ✓ | ✓ | ✓ | ✓ | ✓ | Werden mit-geliefert, damit Frontend Edit-Buttons rendert. Anon/Non-Admin sehen `false`. |

### 2.13 `postal_code_geo` (Geocoding-Cache)

| Feld | Typ | Anon | User | Friend | Tester | Admin | Anmerkung |
|------|-----|------|------|--------|--------|-------|-----------|
| Alle Felder | – | ✗ | ✗ | ✗ | ✗ | ✗ | Reines Backend-Cache. Wird intern beim WCA-Comp-Lookup verwendet, nirgendwo direkt ausgeliefert. |

### 2.14 `live_tests` (Phase W.live-tests)

| Feld | Typ | Anon | User | Friend | Tester | Admin | Anmerkung |
|------|-----|------|------|--------|--------|-------|-----------|
| Alle Felder (`title`, `description`, `status`, `user_response`, ...) | – | ✗ | ✗ | ✗ | ✓ | ✓ | Endpoint `/admin/live-tests` hängt an `require_admin_or_tester`. |
| `DELETE /admin/live-tests/{id}` | – | ✗ | ✗ | ✗ | ✗ | ✓ | Delete bleibt admin-only (siehe `api/admin.py` Zeile 806 — bewusste Einschränkung). |

---

## 3. API-Endpoints-Matrix

Notation: alle Pfade haben implizit den `/api/`-Prefix
(`webapp/main.py` wrappt jeden Router in `api_router = APIRouter(prefix="/api")`).

### 3.1 Auth (`webapp/api/auth.py`)

| Methode | Pfad | Auth-Dep | Cross-User-Filter | Rolle / Anmerkung |
|---------|------|----------|-------------------|-------------------|
| POST | `/auth/register` | – | n/a | anonym; Rate-Limit 5/min IP |
| POST | `/auth/login` | – | n/a | anonym; Konstante Response-Zeit (Timing-Attack-Defense) |
| POST | `/auth/refresh` | – (Cookie) | sub aus Cookie | jeder mit gültigem Refresh-Cookie |
| POST | `/auth/logout` | `get_current_user` | self | bumpt `token_version` → alle Tokens revoked |
| GET | `/auth/me` | `get_current_user` | self | `UserRead` für eingeloggten User |
| PATCH | `/auth/me` | `get_current_user` | self | Whitelist: `display_name`, `is_discoverable`, `postal_code`, `country_iso2`, `wca_id` |
| DELETE | `/auth/me` | `get_current_user` | self | DSGVO: cascade-löscht alle User-Daten |
| POST | `/auth/me/reset-solves` | `get_current_user` | `Solve.user_id == self` | Confirm-Magic-String |
| POST | `/auth/me/reset-tracking` | `get_current_user` | `*.user_id == self` | Confirm-Magic-String |
| POST | `/auth/change-password` | `get_current_user` | self | bumpt `token_version` |
| POST | `/auth/forgot-password` | – | n/a | anonym; konstant 204 (Email-Enumeration-Defense) |
| POST | `/auth/reset-password` | – (Token) | Token-Owner | atomic conditional UPDATE auf Token |
| POST | `/auth/verify-email` | – (Token) | Token-Owner | atomic conditional UPDATE |
| POST | `/auth/resend-verification` | `get_current_user` | self | – |
| POST | `/auth/change-email` | `get_current_user` | self | re-verification via neuer Adresse nötig |

### 3.2 Solves (`webapp/api/solves.py`)

Alle: `Depends(get_current_user)`, Filter `Solve.user_id == current_user.id`.

| Methode | Pfad | Response-Schema | Cross-Ref-Check |
|---------|------|------------------|-----------------|
| GET | `/solves` | `list[SolveRead]` | Filter via WHERE-Clause |
| POST | `/solves` | `SolveRead` | `_verify_session_ownership`, `_verify_hardware_ownership` |
| GET | `/solves/{id}` | `SolveRead` | `_get_solve_or_404` (404 auch bei fremder ID) |
| PATCH | `/solves/{id}` | `SolveRead` | dito; bei session_id/hardware_id-Change Cross-Ref-Check |
| DELETE | `/solves/{id}` | 204 | `_get_solve_or_404` |

Side-Effects (alle pro Self):
- `X-Achievements-Unlocked`-Header (Toaster im Frontend)
- `X-Challenges-Completed`-Header
- `X-PB-Achieved`-Header

### 3.3 Sessions (`webapp/api/sessions.py`)

| Methode | Pfad | Cross-User-Filter |
|---------|------|-------------------|
| GET | `/sessions` | `DbSession.user_id == self` |
| POST | `/sessions` | `user_id=self.id` beim INSERT |
| GET | `/sessions/suggest?cube_type=...` | `Solve.user_id == self` |
| GET | `/sessions/{id}` | `_get_or_404` mit user_id-Check |
| PATCH | `/sessions/{id}` | dito |
| DELETE | `/sessions/{id}?move_solves_to=Y` | source + target müssen demselben User gehören |
| POST | `/sessions/{id}/merge?target_id=Y` | dito |

### 3.4 Hardware (`webapp/api/hardware.py`)

| Methode | Pfad | Cross-User-Filter |
|---------|------|-------------------|
| GET | `/hardware` | `Hardware.user_id == self` |
| POST | `/hardware` | INSERT mit `user_id=self` |
| GET | `/hardware/suggest` | – |
| GET/PATCH/DELETE | `/hardware/{id}` | `_get_or_404` mit user_id |
| POST | `/hardware/seed?force=...` | Empty-Check + INSERT auf self |
| POST | `/hardware/bulk-update`, `/hardware/bulk-delete` | WHERE-Clause filtert fremde IDs **stillschweigend** (kein 404 → kein Existence-Leak) |

### 3.5 Stats (`webapp/api/stats.py`)

Alle 8 Endpoints (`/stats`, `/stats/pb-history`, `/stats/recent-pbs`,
`/stats/by-cube`, `/stats/temporal`, `/stats/activity`,
`/stats/by-hardware`, `/stats/by-session`, `/stats/by-alg-case`):
`Depends(get_current_user)`, Filter `Solve.user_id == current_user.id`
in **jeder** WHERE-Clause. Auch die Hardware-/Session-Namen-Lookups
sind auf `user_id == self` gefiltert (`api/stats.py` Zeilen 506, 562).

### 3.6 Achievements (`webapp/api/achievements.py`)

| Methode | Pfad | Filter |
|---------|------|--------|
| GET | `/achievements` | `Achievement.user_id == self` |
| POST | `/achievements/recheck` | dito |

### 3.7 Challenges (`webapp/api/challenges.py`)

Alle `Challenge.user_id == self`. 404 bei fremder ID (kein Probing).

### 3.8 Backup (`webapp/api/backup.py`)

| Methode | Pfad | Scope |
|---------|------|-------|
| GET | `/backup/json` | `export_user_data(user)` — **nur eigene Daten** |
| POST | `/backup/restore?mode=merge\|replace` | user_id im Payload wird IGNORIERT, überschrieben mit current_user |
| GET | `/backup/snapshots` | eigene |
| POST | `/backup/snapshots` | eigene |
| POST | `/backup/snapshots/{id}/restore` | `Snapshot.user_id == self` |
| DELETE | `/backup/snapshots/{id}` | dito |

**Wichtig:** Ein Backup-JSON enthält **nur** Daten des aufrufenden
Users — keine anderen User, keine Aggregat-Daten Dritter. Der Admin
hat **keinen** Endpoint, ein User-Backup-JSON eines fremden Accounts
abzuziehen.

### 3.9 Import/Export csTimer

| Methode | Pfad | Auth | Scope |
|---------|------|------|-------|
| POST | `/import/cstimer` | `get_current_user` | INSERT mit user_id=self |
| GET | `/export/cstimer` | `get_current_user` | `exporters.cstimer.export_to_cstimer(user.id, ...)` |

### 3.10 Friends (`webapp/api/friends.py`)

| Methode | Pfad | Auth | Privacy-Verhalten |
|---------|------|------|-------------------|
| GET | `/friends/list` | `get_current_user` | Email der „other"-Seite NUR bei `status=='accepted'`. |
| GET | `/friends/search?q=...` | `get_current_user` | Nur User mit `is_discoverable=true`; Email nie im Output. |
| POST | `/friends/lookup-email` | `get_current_user` | Exakter Email-Match; identische Response für not-found & inactive (Account-Existence-Probing-Defense). Email selbst wird NICHT im Output zurückgegeben. |
| POST | `/friends/request` | `get_current_user` | – |
| POST | `/friends/{id}/accept` | `get_current_user` | – |
| DELETE | `/friends/{id}` | `get_current_user` | – |

### 3.11 Leaderboard (`webapp/api/leaderboard.py`)

| Methode | Pfad | Auth | Scope |
|---------|------|------|-------|
| GET | `/leaderboard/cube-types` | `get_current_user` | Self + accepted-Friends |
| GET | `/leaderboard?cube_type=...` | `get_current_user` | dito; **KEINE Emails im Output** |

`LeaderboardRow` enthält `user_id`, `display_name`, `is_me` und
Aggregate (best_ms, best_ao5, best_ao12, current_ao5, current_ao12,
solve_count_total, solve_count_30d, last_solve_at) — keine
Einzel-Solves, keine Email, keine Hardware-Details.

### 3.12 Admin (`webapp/api/admin.py`)

Alle hängen an `require_admin` **oder** `require_admin_or_tester`.

| Methode | Pfad | Dep | Tester sieht? |
|---------|------|-----|---------------|
| GET | `/admin/stats` | `require_admin` | ✗ |
| GET | `/admin/users` | `require_admin` | ✗ |
| PATCH | `/admin/users/{id}` | `require_admin` | ✗ |
| DELETE | `/admin/users/{id}?confirm=DELETE_USER_{id}` | `require_admin` | ✗ |
| POST | `/admin/users/{id}/email` | `require_admin` | ✗ |
| POST | `/admin/announcement` | `require_admin` | ✗ |
| GET | `/admin/live-tests` | `require_admin_or_tester` | ✓ |
| POST | `/admin/live-tests` | `require_admin_or_tester` | ✓ |
| PATCH | `/admin/live-tests/{id}` | `require_admin_or_tester` | ✓ |
| DELETE | `/admin/live-tests/{id}` | `require_admin` | ✗ (siehe Code-Kommentar Zeile 814: bewusste Einschränkung — Delete ist destruktiv) |
| POST | `/admin/roadmap/items` | `require_admin_or_tester` | ✓ |
| PATCH | `/admin/roadmap/items/{id}` | `require_admin_or_tester` | ✓ |
| DELETE | `/admin/roadmap/items/{id}` | `require_admin_or_tester` | ✓ |
| GET | `/admin/feedback/messages` | `require_admin` | ✗ |
| GET | `/admin/feedback/stats` | `require_admin` | ✗ |
| PATCH | `/admin/feedback/messages/{id}` | `require_admin` | ✗ |
| DELETE | `/admin/feedback/messages/{id}` | `require_admin` | ✗ |

Fehlverhalten: `require_admin`/`require_admin_or_tester` liefern bei
fehlender Berechtigung **404 Not Found**, nicht 403 — kein
Endpoint-Probing möglich.

### 3.13 Feedback (User-Endpoints, `webapp/api/feedback.py`)

| Methode | Pfad | Auth | Schema |
|---------|------|------|--------|
| POST | `/feedback/messages` | `get_current_user` | Response: `FeedbackMessageUserRead` (slim, ohne user_id) |
| GET | `/feedback/me/messages` | `get_current_user` | nur eigene (`WHERE user_id == self`) |
| GET | `/feedback/me/unread-count` | `get_current_user` | nur eigene |
| POST | `/feedback/me/messages/{id}/seen` | `get_current_user` | 404 wenn `msg.user_id != self` |

### 3.14 Changelog (`webapp/api/changelog.py`)

| Methode | Pfad | Auth | Filter |
|---------|------|------|--------|
| GET | `/changelog` | `get_current_user_optional` | Non-Admin (inkl. anon): nur `internal=False`. Admin: alles inkl. `internal`-Flag im JSON. |

### 3.15 Roadmap (`webapp/api/roadmap.py`)

| Methode | Pfad | Auth | Filter |
|---------|------|------|--------|
| GET | `/roadmap` | `get_current_user_optional` | Non-Admin/Non-Tester (inkl. anon): nur `internal=False`. Admin/Tester: alles. Flags `is_admin`, `is_tester` im Response damit Frontend UI-Elemente schaltet. |

### 3.16 WCA (`webapp/api/wca.py`)

| Methode | Pfad | Auth | Voraussetzung |
|---------|------|------|---------------|
| GET | `/wca/competitions/upcoming` | `get_current_user` | Self braucht `postal_code` im Profil (422 sonst) |
| GET | `/wca/me/profile` | `get_current_user` | Self braucht `wca_id` im Profil (422 sonst). Daten kommen LIVE von WCA-API, nicht aus DB. |

### 3.17 News (`webapp/api/news.py`)

| Methode | Pfad | Auth |
|---------|------|------|
| GET | `/news/latest` | `get_current_user` |

(Auth Pflicht, damit anonyme Crawler den Fetcher nicht triggern.)

### 3.18 Health

| Methode | Pfad | Auth |
|---------|------|------|
| GET | `/api/health` | – (anon) — liefert `app`, `version`, `mode`. Keine User-Daten. |

---

## 4. UI-Tabs / Panels pro Rolle

Quelle: `webapp/frontend/src/components/TabBar.tsx`,
`webapp/frontend/src/components/UserMenu.tsx`,
`webapp/frontend/src/components/KontoDatenView.tsx`,
`webapp/frontend/src/components/AdminPanel.tsx`,
`webapp/frontend/src/components/TesterPanel.tsx`,
`webapp/frontend/src/pages/LoginPage.tsx`.

**IA-Umbau (W1–W3, 2026-05-30/31):** Die Haupt-Navigation wurde von 6
Tabs auf **4 Flow-Tabs** reduziert (Timer / Statistik / Training /
Community). Dashboard + Analyse sind zum **Statistik**-Tab verschmolzen
(Übersicht→Detail). „Konto & Daten" (ex-Verwaltung-Base), „Admin" und
„Tester" sind aus der TabBar gelöst und nur noch über das **UserMenu**
(oben rechts) erreichbar — rollensichtbar. Diese drei sind „Pseudo-Tabs":
gültige Routing-Zustände (Hash/localStorage), aber nicht in der Leiste.

### 4.1 Anonym (nicht eingeloggt)

| Route / Bereich | Inhalt |
|------------------|--------|
| `/` (Login-Page) | Login + Register + Forgot-Password (Mode-Switch im selben Panel). Plus: Feature-List-Panel (Tagline + heroHighlights), Sprach-Switcher. |
| `/impressum` | Statischer Markdown-Inhalt. |
| `/datenschutz` | Statischer Markdown-Inhalt. |
| `/verify-email?token=...` | Token-Submission an `/auth/verify-email`. |
| `/reset-password?token=...` | Neues Passwort setzen via `/auth/reset-password`. |
| `GET /api/changelog` | Liefert öffentliche Patch-Notes (Non-Internals). |
| `GET /api/roadmap` | Liefert öffentliche Roadmap (Non-Internals). |
| `GET /api/health` | Anonymer Health-Check. |

### 4.2 User (eingeloggt, kein Admin/Tester)

Top-Level-Tabs (`TabBar.tsx`) — **4 Flow-Tabs für alle Rollen**:

| Tab | Inhalt |
|-----|--------|
| TIMER (⏱) | Solving-Modus, Eingabe groß + zentriert |
| STATISTIK (📊) | Übersicht (Tagesform/Reminders, ex-Dashboard) + Detail (Charts + volle Solveliste, ex-Analyse) per Sub-Nav |
| TRAINER (🏆) | Achievements + Daily Challenges |
| COMMUNITY (🤝) | Friends + Leaderboard |

„Konto & Daten" — über **UserMenu** (👤), KEIN Tab mehr
(`KontoDatenView.tsx`, Sub-Nav identisch zur früheren Verwaltung):

| Sub-Tab | Inhalt |
|---------|--------|
| sessions (📁) | SessionList |
| hardware (🧊) | HardwareList |
| daten (📥) | MeineDatenCard, MyFeedbackPanel, BackupPanel, ImportPanel, CsTimerExportPanel, DangerZoneCard |
| outliers (⚠) | OutlierCard |
| settings (⚙) | SettingsPanel (Account + Settings) |

### 4.3 Tester (`is_tester=true`, `is_admin=false`)

Wie User, **plus** ein eigener Tester-Bereich über das **UserMenu** (🧪,
`TesterPanel.tsx`) — nicht in der TabBar, nur bei `is_tester && !is_admin`:
- `AdminLiveTestsPanel` (volles CRUD außer Delete; Status PASS/FAIL/SKIP/open + Notiz)
- `AdminRoadmapPanel` (volles CRUD inkl. Delete, da `require_admin_or_tester`)

**Bewusst NICHT enthalten:** Stats, User-Management, Feedback-Inbox,
Announcements. Diese sind admin-only.

Zusätzlich:
- Tester sieht im `/roadmap`-Endpoint **auch** `internal=true`-Items.
- Tester sieht im `/changelog`-Endpoint **keine** `internal=true`-Items
  (nur Admin — siehe `api/changelog.py` Zeile 38: `is_admin = user.is_admin`).

### 4.4 Admin (`is_admin=true`)

Wie User, **plus** ein eigener Admin-Bereich über das **UserMenu** (🛡,
`AdminPanel.tsx`) — nicht in der TabBar, nur bei `is_admin`. Seit
W.ia-admin-bereich hat er eine eigene **Sub-Navigation** (6 Bereiche,
vorher sequenziell gestapelt + langes Scrollen):

1. `AdminStatsPanel` (Cluster-Stats, anonymisierte Aggregate)
2. `AdminFeedbackInboxPanel` (alle Feedback-Items, Status setzen,
   antworten, löschen)
3. `AdminLiveTestsPanel` (volles CRUD inkl. Delete)
4. `AdminRoadmapPanel` (volles CRUD)
5. `AdminUsersPanel` (User-Liste, Patch is_active/email_verified/is_admin/is_tester, Delete mit Confirm-String, Email pro User schicken)
6. `AdminAnnouncePanel` (Bulk-Mail an alle aktiven verifizierten User, mit Dry-Run + Cap 80)

Zusätzlich:
- Admin sieht im `/roadmap` **alle** Items inkl. `internal`.
- Admin sieht im `/changelog` **alle** Patches inkl. `internal`-Flag.

---

## 5. Sensible Felder + Verschlüsselung

| Wert / Geheimnis | Speicherung | Reversibel? | Sichtbarkeit |
|------------------|-------------|-------------|--------------|
| `users.hashed_password` | bcrypt-Hash (work-factor 12) in Postgres | **Nein** | NIEMALS im API-Output. Auch Admin sieht nur den Hash in der DB-Konsole — nicht das Klartext-Passwort. |
| `JWT_SECRET` | ENV-Var (Coolify Secret) | n/a | Niemals in DB, niemals im Repo, niemals in einem API-Response. `auth/config.py:require_strong_secret()` checkt beim Prod-Start. |
| `JWT_ALGORITHM` | hardcoded `HS256` | n/a | Bewusst NICHT aus Env (sonst Algorithm-Confusion-Attack möglich, Security-Finding #5). |
| `RESEND_API_KEY` | ENV-Var | n/a | Nur im Email-Service genutzt. |
| `password_reset_tokens.token` | 288-bit `secrets.token_urlsafe(48)` | Hash-frei, aber single-use + 1h TTL | Nur als Mail-Link. Single-Use (atomic conditional UPDATE bei Verbrauch). |
| `email_verification_tokens.token` | dito, 7-Tage-TTL | dito | dito |
| Refresh-Token (JWT) | nur als HttpOnly-Cookie (`cubetracker_refresh`, Path `/api/auth`, Secure in Prod, SameSite=Lax) | n/a | **JavaScript kann nicht lesen** (XSS-resistant). Wird automatisch nur an `/api/auth/*` geschickt. |
| Access-Token (JWT) | Im Frontend in `localStorage` als `cubetracker_access_token` | n/a | XSS-leakbar — bewusster Trade-off, daher kurze Lifetime (15 min). Token-Revocation via `users.token_version`-Bump. |
| Backup-Datei (`/backup/json`) | JSON-Download im Browser | n/a | Scope = **nur** Daten des aufrufenden Users (eigene Solves, Sessions, Hardware, Achievements, Challenges). KEINE anderen User. |

---

## 6. Was Admin **NICHT** sieht

Das ist der „Trust-Block" — die explizit dokumentierte Grenze
zwischen Admin-Macht und User-Privacy.

1. **Plain-Text-Passwörter.** `hashed_password` ist ein bcrypt-Hash,
   work-factor 12, nicht reversibel. Auch ein DB-Dump zeigt nur den
   Hash. Es gibt **keinen** Endpoint und keine UI, die Passwörter
   irgendwo lesbar anzeigen.

2. **Andere User-Daten in einem User-Backup.** Das Backup-JSON ist
   strikt scope=eigener User (`backup/service.py:export_user_data`).
   Der Admin hat keinen Endpoint, ein User-Backup eines fremden Accounts
   herunterzuladen oder Cross-User-Backups zu generieren. Er kann nur
   den User löschen (DSGVO-Cascade) oder Status-Flags setzen.

3. **Einzel-Solves anderer User.** Es gibt keinen Endpoint, der
   Einzel-Solves eines fremden Users an einen Admin gibt. `/admin/stats`
   liefert nur Aggregate (Top-10-Cube-Types über alle User,
   Solve-Volumen total, Active-User-Counts).

4. **Email-Inbox-Inhalte.** Resend versendet Mails, speichert sie aber
   nicht zurück in unsere DB. Antworten landen direkt bei Admin/Support
   per Email-Reply — getrennt vom App-Service.

5. **Browser-History, IP-Adressen.** Es gibt keine Login-Audit-Log-
   Tabelle in unserem Schema. Coolify/Hetzner-Server-Logs enthalten IP
   + User-Agent (DSGVO Art. 6(1)(f), Logs-Retention via Provider),
   sind aber **nicht** über die App abrufbar.

6. **Telemetrie / Tracking.** Es gibt **keine** integrierte Analytics
   (Google Analytics, Mixpanel, PostHog, Segment, Hotjar, Sentry,
   Datadog, Plausible, Matomo — Grep im Frontend `webapp/frontend/src`
   bestätigt: 0 Treffer). Kein Cookie-Banner nötig, weil kein Tracking.

7. **WCA-Profil-Daten in unserer DB.** Wir speichern nur die `wca_id`
   als ID-Referenz. Die offiziellen Wettkampf-Historie + PRs + Avatar
   werden zur Anzeige-Zeit live von der WCA-API (`/api/v0/persons/{id}`)
   geholt und in einem 6h-Backend-Cache zwischengespeichert. Der Admin
   sieht in unserer DB **nur** die `wca_id`, nicht die abgeleiteten Daten.

8. **Nominatim-/OSM-Cache mit Lat/Lng des Users.** Wird in `postal_code_geo`
   gecacht, aber nicht user-bezogen — die Tabelle ist (PLZ, Country)→Lat/Lng,
   shared über alle User. Der Admin sieht keinen User-spezifischen Geocache.

9. **Klartext-Tokens (Reset/Verify).** Die DB-Spalte `token` enthält
   das URL-Safe-Token-Random-String — der Admin könnte theoretisch einen
   `password_reset_tokens.token` per DB-Konsole abziehen und einen Reset
   forcieren. Mitigation: short TTL (1h) + single-use + Bumpt
   `token_version` bei Verbrauch (alle Tokens des Users werden invalidiert).
   Eine echte Mauer wäre Token-Hash in DB; aktuell akzeptiertes Restrisiko
   für Phase W (Standard für die meisten Web-Apps).

10. **Einzelne `display_name`-Updates anderer User per Admin-API.**
    `AdminUserPatch` lässt nur `is_active`, `email_verified`, `is_admin`,
    `is_tester` zu — kein `display_name`-Edit-by-Admin. Recht des Users.

11. **Inhalt von Snapshots anderer User.** `/admin/stats.storage`
    liefert nur aggregierte Bytes-Zahl + Count. Kein Endpoint, den Inhalt
    eines fremden Snapshots zu öffnen.

12. **Einzelne Friendship-Beziehungen.** Es gibt keinen Admin-Endpoint
    zum Anzeigen aller Friendships. Admin kann nur User löschen → cascade.

---

## 7. Datenfluss-Diagramme

### 7.1 Auth-Flow

```
Browser                              Backend (FastAPI)              Postgres
   |                                       |                            |
   |--POST /api/auth/login {email,pw}----->|                            |
   |                                       |--SELECT user by email----->|
   |                                       |<--user row with bcrypt-----|
   |                                       |  verify_password() ✓       |
   |                                       |  create_token("access")    |
   |                                       |  create_token("refresh")   |
   |<--200 {access_token: "..."}-----------|                            |
   |    Set-Cookie: cubetracker_refresh=...; HttpOnly; Secure;          |
   |                Path=/api/auth; SameSite=Lax                        |
   |                                       |                            |
   |  [stores access_token in localStorage]                             |
   |                                       |                            |
   |--GET /api/solves                      |                            |
   |    Authorization: Bearer <access>     |                            |
   |    Cookie: cubetracker_refresh=... -->|                            |
   |                                       |  extract_user_id + ver     |
   |                                       |--SELECT user by id--------->|
   |                                       |  check token_version       |
   |                                       |--SELECT solves WHERE       |
   |                                       |   user_id == current.id--->|
   |<--200 [solves]------------------------|                            |
```

### 7.2 Backup-Flow (Browser-Download, kein Drittanbieter)

```
Browser                       Backend                       Postgres
   |--GET /api/backup/json---->|                                |
   |    Bearer <access>        |                                |
   |                           |--SELECT Solve/Session/         |
   |                           |   Hardware/Achievement/        |
   |                           |   Challenge WHERE              |
   |                           |   user_id == self------------->|
   |                           |<--rows-------------------------|
   |                           |  serialize as JSON             |
   |<--200 application/json----|                                |
   |    {solves: [...], sessions: [...], ...}                   |
   |                                                            |
   | [Frontend triggers browser-download via blob URL]          |
   | [Datei landet in User-Downloads-Folder, NIE auf Server]    |
```

### 7.3 WCA-Profil-Flow (External-Read, kein Speichern)

```
Browser              Backend                   WCA-API (worldcubeassociation.org)
   |--GET            |                          |
   |  /api/wca/me/   |                          |
   |  profile        |                          |
   |  Bearer <a>---->|                          |
   |                 | SELECT user.wca_id       |
   |                 |   (aus eigener DB)       |
   |                 | check 6h-Cache           |
   |                 |--GET /api/v0/persons/    |
   |                 |   {wca_id}-------------->|
   |                 |<--JSON profile-----------|
   |                 | cache 6h                 |
   |<--200 profile---|                          |
   |                                            |
   | NICHT gespeichert in cubetracker.db        |
   | (nur wca_id als ID-Referenz)               |
```

### 7.4 Feedback-Flow

```
User-Browser            Backend                Admin-Browser
   |--POST              |                       |
   |  /api/feedback/    |                       |
   |  messages          |                       |
   |  {cat, msg}------->|                       |
   |                    | INSERT FeedbackMessage|
   |                    |   user_id=current     |
   |                    |   status='new'        |
   |<--201 (slim)-------|                       |
   |  (ohne user_id)    |                       |
   |                    |                       |
   |                    |<--GET                 |
   |                    |  /api/admin/          |
   |                    |  feedback/messages    |
   |                    |  (Admin-only)         |
   |                    |--200 (full incl.----->|
   |                    |   user_id) ---------->|
   |                    |                       | [Admin sieht user_id +
   |                    |                       |  Email via /admin/users]
   |                    |<--PATCH               |
   |                    |  admin_response       |
   |                    |                       |
   |--GET               |                       |
   |  /api/feedback/    |                       |
   |  me/messages       |                       |
   |  (slim, kein       |                       |
   |   admin_response_  |                       |
   |   by_user_id)      |                       |
   |<--200--------------|                       |
```

---

## 8. Anti-Tracking-Audit

**Grep im Frontend `webapp/frontend/src` nach gängigen Tracking-SDKs:**

| Tool | Frontend-Treffer |
|------|-------------------|
| `google-analytics` / `gtag` | 0 (nur Erwähnung im i18n-Locale-Text "no trackers") |
| `mixpanel` | 0 |
| `segment` | 0 |
| `hotjar` | 0 |
| `fb-pixel` / `facebook` | 0 |
| `sentry` | 0 |
| `datadog` | 0 |
| `posthog` | 0 |
| `amplitude` | 0 |
| `matomo` | 0 |
| `plausible` | 0 (nur Test-File-Erwähnung "plausible Max-Länge") |

→ **Bestätigt: Keine Tracking-SDKs im Frontend.**

### Cookies / Browser-Storage im Detail

| Eintrag | Typ | Zweck | Wo gesetzt |
|---------|-----|-------|------------|
| `cubetracker_refresh` | HTTP-Cookie, HttpOnly, Secure (prod), SameSite=Lax, Path=`/api/auth` | Refresh-Token für Auth-Renewal | Backend `webapp/api/auth.py:_set_refresh_cookie` |
| `cubetracker_access_token` | localStorage | Access-Token (15 min Lifetime) | Frontend `lib/api.ts:setAccessToken` |
| `i18nextLng` | localStorage | UI-Sprache (de/en) | i18next `webapp/frontend/src/i18n/index.ts` |
| Tab-Wahl-Key (App.tsx, `TAB_STORAGE_KEY`) | localStorage | Zuletzt aktive Top-Level-Tab | `webapp/frontend/src/App.tsx` |
| Onboarding-Banner-Dismissal | localStorage | Banner-State per Browser | `OnboardingBanner.tsx` |
| Settings (`webapp/frontend/src/lib/settings.ts`) | localStorage | Client-only Settings (Theme, etc.) | `lib/settings.ts` |
| `cachedScr` | localStorage | Scramble-Cache des csTimer-Vendor-Bundles | `lib/cstimer-vendor/scramble.js` (Vendor-Bibliothek) |

**Keine Drittanbieter-Cookies. Kein Cookie-Banner nötig** (siehe
`DatenschutzPage.tsx` Zeilen 266–277 — TDDDG § 25 Abs. 2 + DSGVO
Art. 6(1)(f) als Rechtsgrundlage für das einzig technisch nötige
Refresh-Cookie).

### Web-Bluetooth (Smart-Cube-Pairing) — kein Server-Roundtrip

Phase W.gan-cube-mvp (2026-05-28) integriert die NPM-Library
`gan-web-bluetooth` für die Verbindung zu GAN-Smart-Cubes (GAN i4 et al.).

| Aspekt | Wer sieht / wo lebt das Datum |
|---|---|
| **Cube-Pairing** | Browser-native Permission-Prompt. **Kein Server**, kein Drittanbieter-Endpoint angesteuert. |
| **Geräte-Name + MAC** | Nur im Browser-Speicher des User-Tabs. Wird **nicht** ans Backend gesendet. |
| **Move-Events (z.B. "R", "U'")** | Frontend-State (`useSmartCube.lastMove`, `moveCount`). Werden in dieser Welle **nicht** persistiert. |
| **Battery-Level** | Nur Anzeige im SmartCubeConnect-Block, kein DB-Schreib-Pfad. |
| **Solve-Time** (kommt in W.gan-cube-auto-time) | Geht wie bei manueller Eingabe ans Backend `POST /solves`. Cube ist nur ein Eingabe-Pfad, kein neuer Datenkanal. |
| **Library-Code** | Open-Source (afedotov/gan-web-bluetooth, MIT). Per Tree-Shaking-Audit: kein `fetch`/`XMLHttpRequest`/`navigator.sendBeacon`/`window.location`-Aufruf in der Library. Pure BLE-Wrapper. |
| **Browser-Constraint** | Web-Bluetooth-API nur in Chrome / Edge / Brave / Opera (Desktop + Android). Safari (iOS/macOS) + Firefox haben kein Web-Bluetooth → SmartCubeConnect zeigt Hinweis statt Connect-Button. |

**Trust-Block-Kompatibilität:** die Aussage „Kein Tracking, keine
Drittanbieter-Cookies" auf der LoginPage bleibt korrekt — die
Library macht keinen Server-Call und installiert keine Cookies.
Der Browser fragt den User explizit nach Bluetooth-Erlaubnis pro
Pairing-Vorgang; nach Tab-Close oder Disconnect ist die Verbindung
weg.

---

## 9. Bekannte Privacy-by-Design-Spots

- **Slim-Schemas am User-Endpoint:** `FeedbackMessageUserRead` (statt
  `FeedbackMessageRead`) blendet `user_id` und `admin_response_by_user_id`
  aus, um ID-Enumeration zu verhindern.
- **`extra="forbid"` in `UserUpdate`, `AdminUserPatch`, `LiveTestCreate/Update`,
  `RoadmapItemCreate/Update`, `FeedbackMessageCreate/AdminUpdate`,
  `FriendRequestPayload`, `EmailLookupPayload`, `HardwareBulkUpdate/Delete`,
  `AdminEmailPayload`, `AdminAnnouncementPayload`** — Mass-Assignment-Defense.
- **fail-closed bei `require_admin`/`require_admin_or_tester`:**
  generischer 404 statt 403 → kein Endpoint-Probing.
- **Konstante Response für `/auth/forgot-password`** (Email-Enumeration-Defense).
- **Konstante Response für `/auth/login`** (Timing-Attack-Defense via
  Dummy-bcrypt-Hash).
- **Konstante Response für `/friends/lookup-email`** (Account-Existence-Probing-Defense).
- **Bulk-Hardware-Endpoints filtern fremde IDs stillschweigend** —
  kein 404 → kein Existence-Leak.
- **Admin kann sich nicht selbst per `/admin/users/{id}` ändern oder löschen**
  (Self-Lockout-Defense).
- **Letzter-Admin-Demotion-Schutz** mit `SELECT ... FOR UPDATE` (Race-Condition-frei).
- **Token-Revocation per `token_version`** — bei Logout / Password-Change /
  User-Deaktivierung werden ALLE Access- + Refresh-Tokens des Users sofort ungültig.

---

## 10. Pflege dieser Datei

Bei wesentlichen Änderungen in `webapp/db/models.py`, `webapp/db/schemas.py`,
`webapp/api/*.py` (neue Endpoints, neue Auth-Deps, neue Schemas, neue
Felder) → diese Matrix nachziehen. Vorgeschlagener Trigger: nach jeder
QA-relevanten Welle (siehe `CLAUDE.md` „QA-Audit-Trail"), einen Diff
gegen die letzte Version dieser Datei.

Nächstes Audit: spätestens vor v2.0-Release (Phase 6 Konsolidierung).

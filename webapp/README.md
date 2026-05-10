# cubetracker-webapp — Multi-User-Variante (Phase W)

> **Zweck**: parallel zur Single-User-Desktop-Version eine
> **Multi-User-Web-Variante** zum Online-Hosten. User koennen sich
> anmelden + ihre eigenen Solves tracken.
>
> **Status**: Phase W in Bau. Desktop-Version (`backend/`) bleibt
> parallel intakt + voll funktional.

---

## Architektur-Entscheidungen

### Stack (gleicher wie Desktop fuer Code-Wiederverwendung)
- **Backend**: Python 3.14 + FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic 2
- **DB**: PostgreSQL (Render-managed, später ggf. eigene Instanz)
- **Auth**: Email + Password mit `passlib[bcrypt]` Hashing + JWT-Tokens via `python-jose`
- **Frontend**: dasselbe React-Frontend wie Desktop, mit Auth-Wrapper drumrum
- **Hosting**: Render.com (Free-Tier zum Start, spaeter Migration auf VPS möglich)

### Was unterscheidet sich vom Desktop-Backend (`backend/`)

| Aspekt | Desktop (`backend/`) | Web (`webapp/`) |
|---|---|---|
| User-Konzept | keine, alles 1 User | jeder API-Call hat `user_id` aus JWT |
| DB | SQLite, 1 Datei | PostgreSQL, multi-tenant via `user_id`-FK |
| Auth | keine | Email+Password + JWT |
| Schema | Solve/Session/etc. ohne user_id | alle Tabellen + `user_id NOT NULL FK` |
| Deploy | PyInstaller + Inno-Setup | Render.com via `render.yaml` |
| Mode-Detection | dev/prod via env | dev/prod via env |

### Was bleibt identisch
- Pure-Logic-Layer (`stats/calc.py`, `achievements/check.py`, `achievements/patterns.py`,
  `challenges/generator.py`, `challenges/tracker.py`) — wird **kopiert oder importiert**
- API-Endpoints in der Form (nur mit `user_id`-Filter dazu)
- Frontend-Code (Components, Hooks) — Auth-Wrapper drumrum
- Backup/Restore-Endpoints
- csTimer-Import/-Export

---

## Verzeichnis-Struktur

```
webapp/
├── README.md              (dieses File)
├── pyproject.toml         (separate deps: passlib, python-jose, psycopg2-binary)
├── render.yaml            (Render-Deploy-Konfig)
├── alembic/               (DB-Migrations, separat vom Desktop)
├── alembic.ini
├── api/
│   ├── auth.py            (register / login / refresh / logout)
│   ├── solves.py          (analog Desktop, mit user_id-Filter)
│   ├── sessions.py
│   ├── stats.py
│   ├── hardware.py
│   ├── achievements.py
│   ├── challenges.py
│   ├── backup.py          (per-User Backup/Restore)
│   ├── import_cstimer.py  (importiert in Current-User)
│   └── export_cstimer.py
├── auth/
│   ├── jwt.py             (token create/decode)
│   ├── password.py        (bcrypt hash/verify)
│   └── deps.py            (FastAPI-Dependencies fuer current_user)
├── db/
│   ├── database.py        (PostgreSQL-Engine + session)
│   ├── models.py          (User-Model + alle anderen mit user_id-FK)
│   └── schemas.py         (UserCreate, UserRead, Token, etc.)
├── tests/
└── main.py                (App-Entry, includeRouter, CORS, etc.)
```

**Pure-Logic-Module wiederverwendet**: `stats/calc.py`,
`achievements/check.py`, `achievements/patterns.py`,
`achievements/definitions.py`, `challenges/generator.py`,
`challenges/tracker.py` — werden direkt aus `../backend/` importiert
(wir setzen `sys.path` entsprechend) oder als Symlink/git-subtree
synchronisiert. **Entscheidung folgt** im Implementations-Schritt.

---

## Auth-Konzept

### Endpoints
- `POST /auth/register` — Email + Password → User-Record + JWT
- `POST /auth/login` — Email + Password → JWT (access + refresh)
- `POST /auth/refresh` — Refresh-Token → neuer Access-Token
- `POST /auth/logout` — JWT invalidieren (Server-side blacklist optional)
- `GET /auth/me` — Aktueller User (basierend auf JWT)

### Token-Strategie
- **Access-Token**: kurz (15 min), in HTTP-Header `Authorization: Bearer <jwt>`
- **Refresh-Token**: lang (30 Tage), HTTP-only Cookie (XSS-sicher)
- **Algorithm**: HS256 mit `JWT_SECRET` aus Environment

### Password-Storage
- `passlib[bcrypt]` mit work-factor 12
- NIE im Plaintext gespeichert
- Min-Laenge 8 Zeichen, sonst keine harte Policy (User-Friction-Trade-off)

### Multi-Tenant-Sicherheit
- Jeder API-Call mit `current_user`-Dependency
- ALLE Queries: `WHERE user_id = current_user.id`
- KEINE Endpoint-Definition ohne Auth (ausser `/auth/register`, `/auth/login`,
  `/api/health`)
- ⚠️ Kritische Klippe: `/backup/restore` muss user_id beim Restore setzen,
  niemals fremde IDs uebernehmen.

---

## Deploy-Plan

### Render.com Free-Tier
- 1× Web Service (FastAPI via uvicorn)
- 1× PostgreSQL (Free, 1GB, 90-Tage-Limit ⚠️)
- Auto-Deploy via Git-Push auf `feature/W-multi-user-web` → spaeter `main`
- Custom Subdomain via DNS-CNAME (DomainFactory)

### Env-Variables (nicht im Repo!)
- `DATABASE_URL` — Render setzt automatisch
- `JWT_SECRET` — manuell setzen, lang + zufaellig
- `JWT_ALGORITHM=HS256`
- `JWT_ACCESS_EXPIRE_MIN=15`
- `JWT_REFRESH_EXPIRE_DAYS=30`
- `CUBETRACKER_PROD=1` — main.py-Mode-Detection

### Postgres-90-Tage-Limit
Render-Free-Postgres wird nach 90 Tagen geloescht. Mitigation:
- **Backup-Endpoint** existiert (User kann jederzeit JSON-Backup laden)
- Vor Tag 85: pg_dump als Sicherheitsnetz
- Spaeter Migration auf bezahlten Postgres (~7€/Monat) oder VPS

---

## Migrations-Pfad zurueck zur Desktop-Version

Falls User die Web-Variante einstellen will:
1. JSON-Voll-Export aus Web-App (User-spezifisch)
2. Restore-Upload in Desktop-Version
3. Schema ist gleich (ausser `user_id`-Felder werden ignoriert beim Desktop-Import)

→ kein lock-in, jederzeit reversibel.

---

## Phase-W-Sub-Phasen

| Phase | Inhalt | Status |
|---|---|---|
| W.0 | Setup, Architektur-Doku, leere Verzeichnis-Struktur | ✅ |
| W.1 | DB-Schema mit User-Model, lokale SQLite-Test-DB (Alembic-Init in W.7) | ✅ |
| W.2 | Auth-Module (register/login/JWT) + Live-Smoke-Test + ad-hoc security-review | ✅ |
| W.2.1 | **Security-Review-Findings 🔴 KRITISCH abarbeiten** (vor Live-Deploy Pflicht) | ✅ |
| W.3 | Solve/Session/Hardware-Endpoints mit user_id-Filter, alle Tests anpassen | ✅ |
| W.4 | Achievements/Challenges/Stats per-User | ⏳ |
| W.5 | Backup/Restore + csTimer-Import/Export per-User | ⏳ |
| W.6 | Frontend-Adaption (Login-Page, Token-Storage, Auth-Wrapper) | ⏳ |
| W.7 | Render-Deploy + DNS-Setup + Live-Smoke-Test | ⏳ |
| W.8 | Doku-Finalisierung, Tag `v2.0` (Web-Launch) | ⏳ |

---

## Security-Review-Befunde (W.2 Sub-Agent, 2026-05-10)

Ad-hoc security-review per `Agent`-Tool. 14 Findings. **🔴-Punkte sind
Pflicht vor Live-Deploy** (W.2.1):

### 🔴 KRITISCH — alle erledigt in W.2.1 (2026-05-10)
1. ✅ **Refresh-Token in Request-Body statt HttpOnly-Cookie** — XSS-exfiltrierbar.
   Fix: `set_cookie(httponly=True, secure=IS_PROD, samesite="lax", path="/auth")` im /login,
   `Cookie(alias=REFRESH_COOKIE_NAME)`-Param im /refresh. Smoke-getestet.
2. ✅ **Keine Refresh-Token-Revocation** — gestohlener Token 30d gueltig, kein
   Logout, Password-Change invalidiert nichts.
   Fix: `token_version`-Spalte am User, `ver`-Claim in JWT, Check in
   `get_current_user` + `/refresh`. `/auth/logout` zaehlt hoch -> alle Tokens tot.
   Smoke verifiziert: Access + Refresh nach Logout 401.
3. ✅ **Kein Rate-Limiting** — Brute-Force trivial, CPU-Cost gegen dich.
   Fix: `slowapi` mit `5/minute` auf /login + /register, `20/minute` auf /refresh
   (legitimer Client refresht alle ~14min, viel Spielraum). Per-IP via
   `get_remote_address`. 6. Versuch -> 429 verifiziert.

### 🟡 SOLLTE (vor Public, nach Friends-Launch OK)
4. /refresh rotiert Refresh-Token nicht (best practice: rotation + reuse-detection)
5. ✅ JWT_ALGORITHM hardcoded ("HS256") in auth/config.py — Env-Override-Angriff weg.
6. Password-Min 8 Zeichen + keine HIBP-Pruefung. Auf 10 + HIBP-k-anonymity.
7. ✅ /refresh-Error generisch: "Refresh-Token ungueltig oder abgelaufen." (kein {e}-Leak)
8. Timing-Defense unvollstaendig (DB-Roundtrip-Zeit messbar)
9. ✅ `_dummy_hash()` lazy-init via `@lru_cache` — kein Import-Time-Hit mehr.

### 🟢 NICE
10. `extract_user_id` doppelter int-cast in jwt.py + api/auth.py
11. `from sqlalchemy import select` ungenutzt in deps.py
12. `require_strong_secret`-Aufruf in main.py-Lifespan VERIFIZIEREN
13. DSGVO-Cascade Test fehlt (delete_me → keine orphans)
14. Multi-Tenant-Authorization (user_id-Filter in Queries) ist NICHT in Auth-Files
    pruefbar — separates Audit der Endpoints noetig wenn Solve/Session/etc. dazukommen

**Positiv**: bcrypt-12 + 72-Byte-Truncation, JWT-type-claim, Email-Lowercase,
Dummy-Hash-Timing-Defense, is_active-Check.

# Hetzner-Migration — Runbook (Roadmap P2)

> **Zweck:** Cubetracker von Render (Free-Tier, Postgres läuft ~2026-08-08 aus)
> auf eine eigene Hetzner-Cloud-VM mit **Coolify** umziehen. **Eine Domain**
> (`cubetracker.de` = Frontend + `/api` = Backend). Daten via `pg_dump`/`pg_restore`.
>
> **Stand:** 2026-05-20 (Plan). User-Entscheidungen: Coolify · eine Domain ·
> Runbook zuerst, Ausführung interaktiv.
>
> **Kein Zeitdruck:** Render-Postgres-Deadline ~2026-08-08 (~11 Wochen). Sorgfalt
> vor Tempo. Render läuft bis zur erfolgreichen Verifikation **parallel weiter**.
>
> **Quell-Config:** `webapp/render.yaml`. **Betroffene Code-Stellen:**
> `webapp/main.py` (Routing/CORS), `webapp/db/database.py` (DATABASE_URL),
> `webapp/api/auth.py` + `auth/config.py` (Refresh-Cookie), `frontend/src/lib/api.ts`.

---

## 0. Ziel-Architektur

```
                    cubetracker.de  (Let's-Encrypt-SSL, Traefik in Coolify)
                          │
        ┌─────────────────┴─────────────────┐
        │  /                                  │  /api/*
        ▼                                     ▼
   Frontend (Vite-Build, static)        Backend (FastAPI, uvicorn)
                                              │
                                              ▼
                                        Postgres 16 (Coolify-managed, Volume + Backups)
```

- **Server:** Hetzner **CX22** (2 vCPU / 4 GB RAM / 40 GB SSD), Region Nürnberg
  oder Falkenstein (DE). ~€4.51/Mo + ~€0.50 IPv4. Coolify selbst: gratis.
- **Coolify:** self-hosted PaaS (Render-ähnlich), Traefik-Reverse-Proxy,
  Auto-SSL, Git-Deploy per Webhook.
- **3 Coolify-Ressourcen:** Postgres-DB, Backend-App, Frontend-Static.

---

## 1. Was DU brauchst (Voraussetzungen)

| # | Was | Wofür |
|---|---|---|
| 1 | Hetzner-Cloud-Account + Zahlungsmittel | Server (CX22) |
| 2 | DNS-Zugang für `cubetracker.de` (Registrar/DNS-Provider) | A-Record umstellen |
| 3 | Render-Dashboard-Zugang | Connection-String + Secrets auslesen |
| 4 | SSH-Key (lokal, `ssh-keygen` falls keiner da) | Server-Login |
| 5 | ~4–6 h aktive Zeit (verteilt über mehrere Sessions) | Ausführung |

Ausführung läuft **interaktiv**: du klickst/SSH-st, teilst Outputs, ich gebe die
nächsten Schritte. Ich provisioniere **nicht** in deinem Account.

---

## 2. Env-/Secret-Inventar (vollständig — vor Phase 2 sammeln)

Aus `render.yaml` + Render-Dashboard (manuell gesetzte Secrets) + Code:

| Var | Quelle heute | Auf Hetzner | Hinweis |
|---|---|---|---|
| `JWT_SECRET` | Render generiert | **exakt kopieren** | Sonst werden ALLE User ausgeloggt. Aus Render-Dashboard auslesen. |
| `DATABASE_URL` | Render-DB | Coolify-Postgres setzt **neu** | NICHT kopieren. |
| `CUBETRACKER_PROD` | `"1"` | `"1"` | aktiviert Prod-Checks + Schema-Init. |
| `WEBAPP_FRONTEND_ORIGIN` | Render-Frontend-URL | `https://cubetracker.de` | Bei einer Domain same-origin → CORS faktisch unnötig, aber gesetzt lassen. |
| `VITE_API_BASE` (Build) | Render-Backend-URL | **`/api`** (relativ) | Wird zur Build-Zeit ins Bundle kompiliert. |
| `PYTHON_VERSION` | `3.12.7` | via Nixpacks/Dockerfile | s. Phase 2. |
| `ADMIN_EMAILS` | Render-Dashboard (manuell) | **kopieren** | Admin-Bootstrap beim Start (main.py:lifespan). |
| `RESEND_API_KEY` | Render-Dashboard (manuell) | **kopieren ODER rotieren** | Email-Versand. Du wolltest ihn eh rotieren → guter Moment, neuen erzeugen. |
| `GITHUB_TOKEN` | Render-Dashboard (optional) | kopieren falls gesetzt | Live-Test-Auto-Issues (graceful ohne). |
| `FRONTEND_URL` | Render-Dashboard (Default `www.cubetracker.de`) | `https://cubetracker.de` | Basis für Email-Links (Verify/Reset) — auf die kanonische Domain setzen. |
| `RESEND_FROM` | Render-Dashboard (optional) | kopieren falls gesetzt | Absender-Adresse der Emails (Default `onboarding@resend.dev`). |

> ⚠ Secrets nie ins Repo, nie ins Log. In Coolify als „Environment Variables"
> (secret) pro Service hinterlegen.

---

## 3. Phase 0 — Code-Vorbereitung: globaler `/api`-Prefix  ✅ ERLEDIGT (2026-05-20)

> **Status:** Umgesetzt + getestet auf Branch `feature/W-api-prefix` (Commit
> `8f69642`, NICHT auf dem Render-Auto-Deploy-Branch). 11 Backend-Tests + Build
> grün. Geht mit dem Hetzner-Deploy live, e2e-Auth-Test auf Staging (Phase 5).

**Warum nötig:** Die API-Routen liegen aktuell auf **Root** (`/auth`, `/solves`,
`/stats`, …), nur `/api/health` ist explizit. Für *eine* Domain mit sauberem
Reverse-Proxy müssen sie unter einen gemeinsamen `/api`-Prefix.

> **Alternative (falls du den Code-Schritt vermeiden willst):** *zwei* Domains
> (`cubetracker.de` + `api.cubetracker.de`) brauchen NULL Code-Änderung — nur
> `VITE_API_BASE=https://api.cubetracker.de` + CORS-Origin. Dann CORS bleibt.
> Du hast „eine Domain" gewählt → wir machen den `/api`-Prefix. Sauberer Endzustand.

**Schritte:**
1. `webapp/main.py`: alle `app.include_router(...)` unter einen gemeinsamen
   Prefix bündeln. Sauberster Weg: ein Parent-Router
   `api_router = APIRouter(prefix="/api")`, alle Sub-Router dort inkludieren,
   dann `app.include_router(api_router)`. `/api/health` bleibt wie es ist.
2. `frontend/src/lib/api.ts`: `API_BASE`-Prod-Default auf `"/api"` (statt `""`);
   `VITE_API_BASE=/api` setzen. `tryRefresh` nutzt `${API_BASE}/auth/refresh`
   → wird automatisch `/api/auth/refresh`. ✓
3. `auth/config.py`: `REFRESH_COOKIE_PATH` von `/auth` → `/api/auth` (oder `/api`),
   damit der Refresh-Cookie auf dem neuen Pfad gesendet wird.
4. **Test (lokal):** kompletter Auth-Flow (Register → Login → Refresh → Logout)
   + ein paar API-Calls (Solve anlegen, Stats laden). Backend- + Frontend-Tests
   grün. **QA-Sub-Agent** drüber.
5. ⚠ **NICHT auf Live-Render deployen** — dort würde `VITE_API_BASE=/api` ins
   Leere zeigen (Render-Frontend ruft Backend über volle URL). Diese Welle geht
   **gemeinsam mit dem Hetzner-Deploy** live, getestet auf der Staging-Subdomain.

**Aufwand:** ~2–3 h inkl. Auth-Test. **Rollback:** Branch verwerfen.

---

## 4. Phase 1 — Hetzner-Server + Coolify

1. **Server erstellen** (Hetzner-Cloud-Console): CX22, Ubuntu 24.04, Region DE,
   SSH-Key hinterlegen, Name `cubetracker-prod`. Cloud-Firewall: nur **22, 80, 443**.
2. **DNS-Staging vorbereiten:** A-Record `new.cubetracker.de` → Server-IP
   (TTL 300). `cubetracker.de` selbst bleibt NOCH auf Render.
3. **Coolify installieren** (per SSH als root):
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
   Danach Coolify-UI unter `http://SERVER-IP:8000` → Admin-Account anlegen
   (starkes Passwort).
4. **Coolify absichern:** Coolify-Instanz selbst auf Subdomain
   `coolify.cubetracker.de` mit SSL legen (in Coolify-Settings).

**Rollback:** Server löschen (nichts Produktives dran). **Kosten** laufen ab
Server-Erstellung.

---

## 5. Phase 2 — Services in Coolify (auf Staging-Subdomain)

1. **Projekt** „cubetracker" anlegen.
2. **Postgres:** Resource → Database → PostgreSQL 16. Persistentes Volume an.
   Coolify generiert interne `DATABASE_URL`.
3. **Backend:** Resource → Application → Source: Git (`fischehaus/cubetracker`,
   Branch mit `/api`-Prefix). Base-Directory `webapp`. Build: **Nixpacks**
   (erkennt `pyproject.toml`) oder Dockerfile. Start:
   `uvicorn main:app --host 0.0.0.0 --port $PORT`. Env-Vars aus dem Inventar
   (DATABASE_URL = Coolify-Postgres). Health-Check `/api/health`.
   Domain: `new.cubetracker.de`, **Pfad `/api`** (Backend serviert `/api/*` nativ
   nach Phase 0 → kein Path-Stripping nötig).
4. **Frontend:** Resource → Application → Git, Base-Directory `webapp/frontend`,
   Build `npm install && npm run build`, Output `dist` (static). Build-Env
   `VITE_API_BASE=/api`. Domain `new.cubetracker.de` (Root). SPA-Fallback auf
   `index.html`.
5. **Deploy + erster Smoke** auf `https://new.cubetracker.de` (noch leere DB).

**Rollback:** Coolify-Services löschen.

---

## 6. Phase 3 — Daten-Migration (`pg_dump` → `pg_restore`)

1. **Render-Connection-String** (External Database URL) aus dem Render-Dashboard.
2. **Dump** (lokal oder vom Hetzner-Server, ruhiger Moment):
   ```bash
   pg_dump "$RENDER_DB_URL" -Fc -f cubetracker.dump
   ```
3. **Restore** in die Coolify-Postgres (frische, leere DB):
   ```bash
   pg_restore --no-owner --no-acl --clean --if-exists -d "$HETZNER_DB_URL" cubetracker.dump
   ```
4. **Backend einmal neu starten** → `create_all` + Mini-Migrations sind idempotent
   (legen nichts doppelt an).
5. **Verifikation:** Tabellen-Counts beidseitig vergleichen:
   ```sql
   SELECT 'users', count(*) FROM users
   UNION ALL SELECT 'solves', count(*) FROM solves
   UNION ALL SELECT 'sessions', count(*) FROM sessions;
   ```
   Müssen identisch sein (Render vs. Hetzner).

> **Fallback:** App-eigener JSON-Voll-Backup-Endpoint (`/api/backup`) + Restore.
> `pg_dump` ist aber vollständiger (alle Tabellen, Sequenzen, Indizes).
>
> **Rollback:** Hetzner-DB droppen + neu restoren. Render-DB wird nur **gelesen**
> (read-only Dump) — bleibt unangetastet.

---

## 7. Phase 4 — DNS-Cutover + SSL

> Erst wenn `new.cubetracker.de` **voll** getestet ist (Phase 5-Checkliste grün).

1. TTL des `cubetracker.de`-A-Records **am Tag vorher auf 300 s** senken.
2. **Cutover:** A-Record `cubetracker.de` → Hetzner-IP (+ AAAA bei IPv6).
   `www.cubetracker.de` analog (CNAME oder A).
3. Coolify/Traefik holt das Let's-Encrypt-Cert für `cubetracker.de` automatisch
   (Ports 80/443 offen, DNS zeigt auf Server). In Coolify die Domain der
   Services von `new.` auf `cubetracker.de` umstellen.
4. **Email-Domain (Resend):** SPF/DKIM-Records bleiben gleich (Domain unverändert).
   Kurz prüfen, dass Versand nach Cutover funktioniert.
5. DNS-Propagation abwarten (Minuten bis ~1 h).

**Rollback:** A-Record zurück auf das Render-Ziel (daher TTL niedrig). Render
läuft parallel → sofortiger Fallback möglich.

---

## 8. Phase 5 — Verifikation (Checkliste)

- [ ] `https://cubetracker.de` lädt, SSL-Schloss grün.
- [ ] `/api/health` → `status: ok`, `version` aktuell.
- [ ] **Auth:** Login → Refresh (Cookie!) → Logout sauber.
- [ ] Solve anlegen / editieren / löschen; Stats; **PB-Verlauf-Chart**; csTimer-Import.
- [ ] Email (Verifikation + Password-Reset) kommt an.
- [ ] Admin-Bereich, Leaderboard, Friends, News, WCA-Turniere.
- [ ] **Daten vollständig** (Counts == Render).
- [ ] Mobile / PWA-Install.
- [ ] Git-Push → Coolify-Auto-Deploy greift (Webhook).

---

## 9. Phase 6 — Render-Abbau (nach Gnadenfrist)

- **1–2 Wochen parallel** laufen lassen (Render-Postgres lebt bis ~8. Aug).
- Wenn Hetzner stabil: Render-Services + DB löschen.
- `render.yaml` im Repo als Referenz behalten (oder mit Notiz „historisch" versehen).
- Render-`autoDeploy` ist damit obsolet — Coolify deployt bei Push.

---

## 10. Backups (NEU — wichtig, Render macht das nicht mehr für dich!)

- **Coolify Scheduled Backups** für Postgres aktivieren (täglich), Ziel:
  Hetzner Storage-Box oder S3-kompatibel (off-site!). Coolify hat das eingebaut.
- Restore-Drill **einmal testen** (Backup zurückspielen in Test-DB), sonst ist
  es kein Backup.
- App-eigener JSON-Backup-Endpoint bleibt als User-Level-Export zusätzlich.

---

## 11. Reihenfolge (TL;DR)

```
Phase 0  Code: /api-Prefix (Branch, lokal getestet)        [ich + du: Review]
Phase 1  Hetzner-Server + Coolify                          [du: Console/SSH]
Phase 2  Coolify-Services auf new.cubetracker.de           [du: Coolify-UI, ich: Configs]
Phase 3  pg_dump → pg_restore + Counts-Check               [du: Befehle, ich: anleiten]
Phase 4  new.* voll testen → DNS-Cutover cubetracker.de    [du: DNS]
Phase 5  Verifikations-Checkliste                          [gemeinsam]
Phase 6  1–2 Wochen parallel, dann Render abbauen          [du]
```

**Risiko-Minimierung:** Bis Phase 4 ist die Live-Seite auf Render unberührt.
Cutover ist ein einziger DNS-Record + sofort rückrollbar (niedrige TTL).

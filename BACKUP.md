# Backup-Strategie

> **Stand 2026-05-25 (Hetzner-live):** Die App läuft auf Hetzner Cloud +
> Coolify. Aktive Backups: **(A) Coolify Daily-DB-Backup** (täglicher pg_dump
> on-server) + **(B) Hetzner Server-Backup** (VM-Snapshots, gebucht). Die
> GitHub-Actions/Render-Anleitung weiter unten ist **Legacy** — sie sichert die
> alte Render-DB und ist nur noch bis zum Render-Abbau (~2026-06-05) relevant.
> Off-Site-S3-Sync ist optional und noch offen.

Schutz-Ebenen — von Anwender- bis Disaster-Recovery:

1. **App-interne Snapshots** (W.5, live) — pro User max 2 Snapshots, schuetzt
   vor User-Eigenfehlern (versehentliches Loeschen). Bringt nichts bei DB-Verlust.

2. **Coolify Daily-DB-Backup** (aktiv) — täglicher pg_dump der Postgres-16-DB
   auf dem Hetzner-Server. Schuetzt vor DB-Korruption / Schema-Migration-Fehlern.

3. **Hetzner Server-Backup** (aktiv, gebucht) — automatische VM-Snapshots des
   ganzen Servers. Disaster-Recovery bei Server-Verlust.

4. **Off-Site (offen)** — S3/Backblaze-Sync der Coolify-Dumps wäre die nächste
   Härtung (aktuell liegen alle Backups auf demselben Server → Restrisiko).

5. **Legacy: Daily pg_dump via GitHub-Actions** (unten dokumentiert) — sicherte
   die Render-DB als GitHub-Artifact. Läuft bis Render-Abbau, dann obsolet.

## Setup Daily-Backup via GitHub-Actions — LEGACY (sichert die Render-DB)

> ⚠️ **Legacy seit der Hetzner-Migration.** Dieser Workflow sichert noch die
> alte Render-DB und wird mit dem Render-Abbau (~2026-06-05) abgeschaltet. Die
> Live-DB auf Hetzner wird stattdessen vom Coolify-Daily-Backup gesichert.

GitHub Actions kann nicht ohne den DB-Connection-String. Den setzt du
selbst als Repo-Secret (kein Push moeglich, Security):

### 1. Render-DB-URL kopieren

1. Render-Dashboard -> `cubetracker-db` -> Tab "Connect"
2. **External Database URL** kopieren (NICHT die Internal — die geht nur
   Render-intern). Format: `postgres://user:pass@host.region-postgres.render.com/cubetracker`

### 2. GitHub-Secret setzen

1. GitHub-Repo -> Settings -> Secrets and variables -> Actions
2. "New repository secret"
3. Name: `DATABASE_URL_PROD`
4. Value: die Render-URL aus Schritt 1
5. Save

### 3. Workflow-Erstlauf verifizieren

1. GitHub-Repo -> Actions-Tab -> "DB Backup" links auswaehlen
2. "Run workflow" rechts -> "Run workflow" bestaetigen
3. Lauf dauert ~30 Sek. Gruener Haken = okay
4. Im Job-Output: "Upload Dump as Artifact" -> Datei ist unter
   "Artifacts" am Ende der Run-Page herunterladbar

Ab da laeuft der Cron daily 02:00 UTC automatisch.

## Restore — im Notfall

### Variante A: kompletter Restore auf leere DB

```bash
# 1. Dump aus GitHub holen
gh run download <run-id> --name cubetracker-db-<run-number>
# (oder via Web-UI: Actions -> Run -> Artifacts -> Download)

# 2. Wiederherstellen auf neue/leere DB
pg_restore \
  --no-owner --no-acl \
  --clean --if-exists \
  -d "$NEW_DATABASE_URL" \
  cubetracker-2026-05-13.dump
```

`--clean --if-exists`: bestehende Tabellen drop'pen vor Restore. Bei
LEERER Ziel-DB unnoetig aber ungefaehrlich.

### Variante B: einzelne Tabelle wiederherstellen

```bash
# Liste was im Dump steckt
pg_restore --list cubetracker-2026-05-13.dump

# Nur eine Tabelle restoren (z.B. solves)
pg_restore --table=solves --data-only \
  -d "$DATABASE_URL" \
  cubetracker-2026-05-13.dump
```

### Variante C: Klartext-SQL inspizieren

```bash
# Custom-Format ist binaer. Fuer Diff/grep zu Klartext konvertieren:
pg_restore -f cubetracker-2026-05-13.sql cubetracker-2026-05-13.dump
head -100 cubetracker-2026-05-13.sql
```

## Was im Dump drin ist

`pg_dump --format=custom` ohne weitere Filter ergibt:

- **Schema**: alle CREATE TABLE / INDEX / CONSTRAINT-Statements
- **Daten**: alle Rows aller Tabellen — users, solves, sessions, hardware,
  achievements, challenges, snapshots, friendships, password_reset_tokens,
  email_verification_tokens
- **Sensible Daten**: bcrypt-Password-Hashes (sicher), Emails (PII),
  Display-Names

→ GitHub-Artifact-Storage ist privat (nur Repo-Member sehen den Artifact).
Bei Public-Repo waere das ein DSGVO-Problem. Aktuell ist das Cubetracker-
Repo privat — passt.

## Was NICHT im Dump drin ist

- Render-Env-Vars (RESEND_API_KEY, JWT_SECRET, ADMIN_EMAILS, ...) —
  separat im Render-Dashboard sichern
- App-Code — das ist Git
- Build-Artifacts (Frontend-Bundle) — wird bei jedem Deploy neu gebaut

## Hetzner-Migration (abgeschlossen 2026-05-22) ✅

Die Migration ist durch. Tatsächlicher Ablauf (wich vom Plan ab):
1. `pg_dump` direkt von der Render-External-DB-URL (mit `postgres:18`-Tools, da
   Render PG18 fuhr) → `pg_restore` in die Coolify-Postgres-16 auf dem Server.
2. One-Domain-Architektur statt getrennter Backend-Domain (nginx proxyt `/api`).
3. DNS bei INWX (`www` A-Record → 178.105.103.78), Let's-Encrypt via Traefik.

Vollständiges Runbook + Execution-Post-Mortem: `docs/hetzner-migration-runbook.md`.

## Backup-Retention

- **Coolify Daily-DB-Backup**: on-server, Retention nach Coolify-Einstellung.
- **Hetzner Server-Backup**: rollierende VM-Snapshots (Hetzner-Plan).
- **GitHub-Artifact** (Legacy/Render): 90 Tage — obsolet nach Render-Abbau.
- **Kein Off-Site-Storage** bisher (Coolify-Dumps liegen auf demselben Server).
  Nächste Härtung: S3/Backblaze-Sync (~$0.30/Monat für ein paar GB).

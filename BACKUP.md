# Backup-Strategie

Drei Schutz-Ebenen — von Anwender- bis Disaster-Recovery:

1. **App-interne Snapshots** (W.5, bereits live) — pro User max 2 Snapshots,
   schuetzt vor User-Eigenfehlern (versehentliches Loeschen). Bringt nichts
   bei DB-Verlust.

2. **Daily pg_dump via GitHub-Actions** (W.backup, dieser Setup) — sichert
   den kompletten Cluster-Stand taeglich + auf Knopfdruck als GitHub-Artifact
   mit 90 Tagen Retention. Schuetzt vor Render-DB-Verlust, Schema-Migration-
   Fehlern, Hetzner-Migration-Mishaps.

3. **Render Postgres "Daily Backup"** (paid, nicht aktiv) — kommt mit jedem
   bezahlten Render-Postgres-Plan. Solange Free-Tier: nicht verfuegbar.

## Setup Daily-Backup — Einmal-Schritte

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

## Vor der Hetzner-Migration (~Mitte Juli 2026)

1. Manuellen Dump via "Run workflow" triggern (zur Sicherheit, frischester Stand)
2. Dump per `gh run download` lokal holen
3. Auf Hetzner-Postgres restoren via `pg_restore` mit der neuen
   `DATABASE_URL`
4. Frontend-/Backend-URLs (Render-onrender.com -> hetzner-Domain) im
   Frontend-`VITE_API_BASE` umstellen
5. DNS (INWX) auf neue Hetzner-IP zeigen lassen

Details werden in einem separaten `MIGRATION.md` dokumentiert, sobald
der Plan steht.

## Backup-Retention

- **GitHub-Artifact**: 90 Tage (Free-Tier-Maximum)
- **Render-DB**: lebt bis 90-Tage-Limit (~08.08.2026), dann hart geloescht
- **Kein Off-Site-Storage** ausser GitHub — falls GitHub auch ausfaellt,
  ist alles weg. Akzeptables Restrisiko fuer Friends-Phase.

Wenn die App produktiv wird: zusaetzlich S3/Backblaze-Sync (Cron-Step
im Workflow) — ~$0.30/Monat fuer ein paar GB.

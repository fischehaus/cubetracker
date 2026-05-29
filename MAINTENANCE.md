# MAINTENANCE.md — Cubetracker Wartungs-Runbook

**Zweck:** Ein wiederholbarer Gesundheits- und Hygiene-Durchlauf für die
**gesamte** Cubetracker-Web-App (Live-Betrieb + Repo + Doku + Backups +
Sicherheit). Findet Schleichfehler, bevor sie weh tun, und hält alles sauber.

**Abgrenzung zu den anderen Checks:**
| Werkzeug | Wann | Fokus |
|---|---|---|
| `/abschluss` | am **Session-Ende** | Git committed/gepusht? Patch-Notes/Tags? Doku? |
| `/audit` | gelegentlich | **Claude-Code-Setup** (Hooks, Permissions, Config) |
| **MAINTENANCE.md** (dieses File) | **periodisch** | **Gesamt-System**: Live-App, Branches, Doku, Backups, Security, Kosten |

**Empfohlene Frequenz:** ~**monatlich** + immer **vor/nach größeren Änderungen**
(z.B. nach der Hetzner-Migration, vor Phase 6).

**Wie durchlaufen lassen:** zu Claude sagen *„lauf MAINTENANCE.md durch"*. Claude
führt die automatisierbaren Checks (🤖) aus, berichtet die Befunde und sagt dir,
welche manuellen Schritte (👤) du im Coolify-/Hetzner-/INWX-Dashboard prüfen musst.
Findings am Ende ins **Lauf-Protokoll** (unten) eintragen.

> Annahmen für die Befehle: Repo-Root = `D:\Projekte\cubetracker`, Live-App auf
> **www.cubetracker.de** (Hetzner), Server `root@178.105.103.78`, aktiver Branch
> **`feature/W-api-prefix`** (`feature/W-multi-user-web` ist eingefroren).

---

## 1. Git-Hygiene 🤖

```bash
# Auf dem richtigen Branch? (soll: feature/W-api-prefix)
git -C "D:/Projekte/cubetracker" branch --show-current

# Working-Tree sauber? (nur erwartete untracked-Files?)
git -C "D:/Projekte/cubetracker" status --short

# Unpushed Commits? (sollte nach sauberem Stand leer sein)
git -C "D:/Projekte/cubetracker" fetch -q origin
git -C "D:/Projekte/cubetracker" log --oneline origin/feature/W-api-prefix..feature/W-api-prefix

# Eingefrorener Branch unberührt? (darf NICHT vorausgelaufen sein)
git -C "D:/Projekte/cubetracker" log --oneline origin/feature/W-multi-user-web..feature/W-multi-user-web
```

**Pass:** richtiger Branch, Tree sauber, keine überraschenden unpushed Commits,
`W-multi-user-web` unverändert.
**Fix:** committen/pushen was offen ist; untracked-Files entweder committen oder
in `.gitignore` (aktuell bewusst draußen: `scripts/`, `.claude/*.docx`).

---

## 2. Live-App-Gesundheit 🤖

```bash
# Frontend erreichbar? (erwartet: 200)
curl -s -o /dev/null -w "Frontend: %{http_code}\n" https://www.cubetracker.de/

# Backend-Health durch den nginx-/api-Proxy? (erwartet: {"status":"ok","mode":"prod",...})
curl -s https://www.cubetracker.de/api/health

# Deployt der aktuelle Commit wirklich? Bundle auf einen bekannten neuen String prüfen:
b=$(curl -s https://www.cubetracker.de/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
echo "Bundle: $b"; curl -s "https://www.cubetracker.de/$b" | grep -c "Datenschutzerkl"

# HTTPS-Cert-Ablauf (Traefik erneuert automatisch ~alle 60-90 Tage):
echo | openssl s_client -connect www.cubetracker.de:443 -servername www.cubetracker.de 2>/dev/null | openssl x509 -noout -dates
```

**Pass:** Frontend 200, `/api/health` ok, Cert läuft >2 Wochen, Deploy enthält
die letzten Änderungen.
**Fix:** bei 502/leerer Health → Coolify-Logs prüfen (Backend-Redeploy / nginx-
Restart). Cert läuft bald ab → Traefik/Coolify-Logs zum ACME-Renew checken.

> Hinweis: `cubetracker.de` (ohne www) leitet bis **Phase 6** noch per Render-301
> auf `www` um. Nach Phase 6 hier prüfen, dass apex direkt auf Hetzner zeigt.

---

## 3. Doku-Konsistenz (Single-Sources) 🤖/👤

Die kanonischen Files stehen in `NEXT_SESSION.md` → Tabelle „Single-Source-Files".
Prüfen, dass sie zur Realität passen:

- **`NEXT_SESSION.md`** ist jünger als der letzte Feature-Commit (sonst veraltet).
- **Roadmap-Items** (DB-Tabelle `roadmap_items`, gepflegt via App → „Verwaltung
  → Admin → Roadmap"): erledigte Items als `done` markieren oder löschen, neue
  Wünsche aufnehmen. Phase-Meta P1..P6 in `webapp/frontend/src/lib/roadmap-phases.ts`.
- **`webapp/changelog/data.py`** + **`features-data.ts`**: decken die letzten
  user-facing Commits ab?
- **Veraltete Begriffe** aufspüren (nicht jeder Treffer ist ein Fehler — Historie/
  Legacy-Abschnitte dürfen „Render" nennen):

```bash
git -C "D:/Projekte/cubetracker" grep -n "Render" -- "*.md" ":!CHANGELOG.md"
```

**Pass:** Single-Sources spiegeln den echten Stand; „Render" nur noch in
Historie/Legacy-Kontext.
**Fix:** betroffene Files nachziehen (wie beim Hetzner-Cleanup 2026-05-25).

---

## 4. Backups 👤 (Dashboards) + 🤖 (Restore-Probe)

- **Coolify Daily-DB-Backup**: Coolify → Postgres-Resource → Tab „Backups" →
  lief der letzte Lauf grün? Wie alt ist das jüngste Backup?
- **Hetzner Server-Backup**: Hetzner-Cloud-Console → Server → „Backups" →
  aktueller Snapshot vorhanden?
- **Restore-Probe (quartalsweise):** jüngsten Dump in eine **Wegwerf-DB**
  restoren und Tabellen-Counts gegen die Live-DB vergleichen. Ein Backup, das
  nie getestet wurde, ist kein Backup.
- **Off-Site (offen):** S3/Backblaze-Sync der Coolify-Dumps — Status? (Alle
  Backups liegen aktuell auf demselben Server = Single Point of Failure.)

Details/Befehle: siehe `BACKUP.md`.

**Pass:** Coolify-Backup <48h alt + grün, Hetzner-Snapshot vorhanden.
**Fix:** fehlgeschlagene Backups in Coolify untersuchen; Off-Site-Sync einplanen.

---

## 5. Sicherheit / Secrets 🤖/👤

```bash
# Keine Secrets versehentlich im Repo? (sollte KEINE Treffer in echten Files geben)
git -C "D:/Projekte/cubetracker" grep -nE "(RESEND_API_KEY|JWT_SECRET|sk_(live|test)_|-----BEGIN)" -- ":!*.md" ":!MAINTENANCE.md"

# Keine .env eingecheckt?
git -C "D:/Projekte/cubetracker" ls-files | grep -E "\.env($|\.)" || echo "keine .env getrackt - gut"

# Dependency-Schwachstellen (Frontend):
npm --prefix "D:/Projekte/cubetracker/webapp/frontend" audit --omit=dev
```

- **Secret-Rotation** fällig? (Coolify-Env: `JWT_SECRET`, `RESEND_API_KEY`).
  Faustregel: bei jedem Verdacht sofort, sonst ~halbjährlich. Datum der letzten
  Rotation im Lauf-Protokoll führen.
- **Admin-Accounts** (`ADMIN_EMAILS`) noch korrekt/gewollt?

**Pass:** keine Secrets im Repo, keine kritischen npm-Audit-Findings, Rotation
nicht überfällig.
**Fix:** geleakte Secrets sofort rotieren (Coolify-Env + Backend-Redeploy);
npm-Findings via Update beheben.

---

## 6. Tests / Build 🤖

```bash
# Frontend kompiliert sauber (tsc + vite)?
npm --prefix "D:/Projekte/cubetracker/webapp/frontend" run build

# Frontend-Tests:
npm --prefix "D:/Projekte/cubetracker/webapp/frontend" test

# Pre-commit-Hooks über alles laufen lassen:
pre-commit run --all-files
```

- **Backend-Tests:** aktuell **0 Coverage** (kein `webapp/tests/`) — steht als
  P6-Item in der Roadmap. Sobald vorhanden hier ergänzen:
  `cd webapp && python -m pytest -q`.

**Pass:** Build grün, Frontend-Tests grün, pre-commit ohne Fehler.
**Fix:** rote Tests/Build vor jedem Deploy fixen (Coolify baut sonst kaputt).

---

## 7. Server / Infra (Hetzner) 👤

```bash
# Plattenplatz (Docker/Logs/Backups können volllaufen):
ssh root@178.105.103.78 "df -h /"

# Laufen alle Container? (frontend, backend, postgres, coolify-proxy)
ssh root@178.105.103.78 "docker ps --format '{{.Names}}\t{{.Status}}'"

# Coolify-Update verfügbar? -> Coolify-UI -> Settings prüfen.
```

**Pass:** Disk <80% voll, alle erwarteten Container „Up".
**Fix:** bei vollem Disk alte Docker-Images/Volumes/Backups aufräumen
(`docker system prune` mit Bedacht — niemals die DB-Volumes!).

---

## 8. Kosten / Render-Abbau 👤

- **Render** (nach Phase 6): alle 3 Services abgebaut? Sonst Datenleiche/Kosten.
- **Hetzner-Rechnung** im erwarteten Rahmen (CPX22 + Backups)?
- **INWX-Domain** verlängert / Auto-Renew aktiv?

---

## 9. Roadmap- & Task-Pflege 👤/🤖

- **Roadmap-Items**: erledigte markieren / neue Wünsche einpflegen via
  App → „Verwaltung → Admin → Roadmap" (Items leben in DB-Tabelle
  `roadmap_items`). Phase-Meta P1..P6 in `roadmap-phases.ts`. Beide
  erscheinen im App-Roadmap-Modal.
- Claude-Task-Liste aufräumen (erledigte schließen, Stale löschen).
- Offene GitHub-Issues sichten: `gh issue list` (Bug-Reports/Feature-Wünsche).

---

## 10. Termine / Reminder 👤

- **Phase 6 (~05.06.2026):** apex `cubetracker.de` auf Hetzner umstellen +
  Render abbauen + `feature/W-api-prefix` → `main` + alten Branch löschen.
  (Kalender-Reminder gesetzt.)
- **Cert-Renewal:** Traefik automatisch (~alle 60-90d) — in Schritt 2 mitgeprüft.
- **Nächsten MAINTENANCE-Lauf** terminieren (~in 4 Wochen).

---

## Schnell-Durchlauf vs. Voll-Durchlauf

- **Schnell (5 Min, rein 🤖):** Schritte 1, 2, 3, 6 — Git, Live-App, Doku, Build.
  Das fängt die häufigsten Probleme. Gut nach jeder größeren Änderung.
- **Voll (mit 👤-Dashboards):** alle 10 Schritte. ~Monatlich.

---

## Lauf-Protokoll

Jeder Durchlauf bekommt eine Zeile (neueste oben): Datum — Schnell/Voll —
Befunde / behoben / offen.

- **2026-05-26 — Voll** (🤖 1-3, 5, 6, 9 + 👤 4, 7, 8, 10 offen) — Live-App / Tests / Build / Audit grün: Frontend 200, Health `W.meine-daten`, Bundle deployt (`Datenschutzerkl` 2× im aktuellen JS-Bundle), Cert gültig bis 2026-08-20, 158/158 Frontend-Tests, 0 npm-Vulnerabilities, Tree clean außer `scripts/`, keine unpushed, `W-multi-user-web` unberührt, 0 offene GitHub-Issues. **Findings:** (a) `.claude/README.md:13` + `webapp/auth/config.py:3` + `webapp/emailing/service.py:6` enthalten noch Render-Texte → wird mit der parallelen Hook-Drift-Korrektur mit-aktualisiert. (b) `pre-commit` CLI nicht im PATH / nicht in den venvs (Commit-Hooks laufen aber, siehe letzter Commit). (c) Bundle 1.4 MB / 430 kB gzip — >500 kB-Warning bekannt (P6 Bundle-Splitting). (d) `webapp/render.yaml` noch im Tree (Legacy, Phase-6-Abbau). **Offen 👤:** Coolify + Hetzner-Backup-Dashboards (Sektion 4), Server-Disk + Docker-Status via SSH (7 — Classifier blockt SSH zur Prod-IP, muss der User selbst checken), Off-Site-Backup-Sync, INWX-Auto-Renew, Kosten-Check (8/10). **Bekannte Altlast:** apex `cubetracker.de` = 301 → www (wird in Phase 6 ~05.06.2026 mit Render-Abbau erledigt).

# Coolify hinter HTTPS bringen (Backlog #43)

**Status:** offen (👤 Server-Arbeit, ~1h)
**Risiko:** mittel — falsche Coolify-Konfig kann das Admin-Panel temporär unerreichbar machen, App selbst (cubetracker.de) ist davon unabhängig.
**Warum jetzt nicht KRITISCH:** Token klein halten + rotieren (siehe `.github/workflows/deploy.yml` mit `COOLIFY_TOKEN`).

## Problem

Coolify-UI läuft aktuell unter `http://178.105.103.78:8000` (HTTP, IP-basiert). Der GitHub-Action-Auto-Deploy curlt `COOLIFY_TOKEN` über diese Verbindung — das Token läuft also **unverschlüsselt** über das Netzwerk zwischen GitHub-Runner und Hetzner. QA-Befund #43 vom 2026-05-25.

## Ziel

Coolify-UI hinter HTTPS bringen, z.B. unter `https://coolify.cubetracker.de` (Subdomain) oder einer separaten Domain. Auto-Deploy-Workflow nutzt dann die HTTPS-URL.

## Schritte

### 1. Subdomain wählen + DNS einrichten

- Vorschlag: `coolify.cubetracker.de` (Subdomain — gleiches Apex, keine separate Domain nötig)
- Bei INWX: A-Record `coolify` → `178.105.103.78`, TTL kurz (300s) für den Cutover
- DNS-Propagation abwarten (`dig coolify.cubetracker.de` oder `nslookup`)

### 2. Coolify intern: Domain konfigurieren

In der Coolify-UI selbst (noch via `http://178.105.103.78:8000`):

- **Settings → General → Instance Domain:** `https://coolify.cubetracker.de`
- Speichern. Coolify schreibt jetzt Traefik-Labels für die eigene UI.
- **WICHTIG:** sicherstellen, dass der Traefik-Reverse-Proxy auf dem gleichen Server läuft und Port 80/443 hört. Bei Standard-Coolify-Install ist das so.

### 3. Let's-Encrypt-Cert automatisch holen

Coolify nutzt Traefik mit ACME — bei erster Verbindung auf die Domain holt Traefik automatisch ein Cert. Verifikation:

```bash
curl -sI https://coolify.cubetracker.de | head -5
# erwartet: HTTP/2 200, Date-Header, Cert-Chain via openssl s_client
echo | openssl s_client -connect coolify.cubetracker.de:443 -servername coolify.cubetracker.de 2>/dev/null | openssl x509 -noout -dates
```

Falls Cert nicht kommt: Traefik-Logs im Server prüfen:
```bash
ssh root@178.105.103.78 "docker logs coolify-proxy 2>&1 | tail -30"
```

### 4. GitHub-Action-Workflow updaten

`.github/workflows/deploy.yml` — alle `http://178.105.103.78:8000`-URLs durch `https://coolify.cubetracker.de` ersetzen.

```bash
# Suche nach den Stellen
grep -n "178.105.103.78:8000" .github/workflows/deploy.yml
```

Erwartete 2 Stellen (Frontend-Deploy-Call + Backend-Deploy-Call). Beide auf HTTPS umstellen.

### 5. Test-Deploy

Trigger einen unwesentlichen Frontend-Commit (z.B. Whitespace-Fix in einer .ts-Datei) und prüfe in GitHub-Actions, dass der Deploy-Step durchläuft. Wenn HTTPS-Cert vertrauenswürdig + Coolify erreichbar → grün.

### 6. Optional: HTTP-Port 8000 firewall'n

Wenn alles via HTTPS funktioniert, kann der HTTP-Port 8000 auf dem Server gefirewalled werden (defense-in-depth). UFW-Regel:

```bash
ssh root@178.105.103.78 "ufw deny 8000/tcp && ufw status"
```

**Rollback:** `ufw allow 8000/tcp` falls Coolify danach unerreichbar wird.

## Verifikation nach Cutover

- [ ] `https://coolify.cubetracker.de` zeigt Coolify-Login (gültiges Cert)
- [ ] `http://178.105.103.78:8000` ist optional geblockt (Firewall) — oder bleibt offen für Admin-Notzugang
- [ ] GitHub-Action `.github/workflows/deploy.yml` läuft grün bei Test-Push
- [ ] `COOLIFY_TOKEN` ist neu rotiert (siehe unten)

## Token-Rotation nach Cutover

Da das alte Token möglicherweise schon über HTTP geleakt wurde, am besten direkt nach dem Cutover ein neues generieren:

1. Coolify-UI → Settings → API-Tokens → altes Token revoken
2. Neues Token erstellen mit minimal nötigen Permissions (App-Deploy only)
3. In GitHub: Settings → Secrets → `COOLIFY_TOKEN` updaten
4. Test-Deploy zur Verifikation

## Rollback

Falls Coolify nach Cutover nicht mehr erreichbar ist:

1. SSH-Zugang auf den Server bleibt intakt (kein DNS-Bezug)
2. Coolify-Container neu starten: `ssh root@178.105.103.78 "cd /data/coolify && docker compose restart"`
3. Im Notfall: Coolify-Konfig zurück auf `http://178.105.103.78:8000` (via Server-Konfig-Dateien)
4. DNS-A-Record `coolify` löschen falls notwendig

## Cross-Reference

- QA-Befund: NEXT_SESSION „⏸ #43 Coolify-API über HTTPS"
- `.github/workflows/deploy.yml` — das ist der Konsument des Tokens
- `docs/hetzner-migration-runbook.md` — generelle Coolify-/Hetzner-Operationen

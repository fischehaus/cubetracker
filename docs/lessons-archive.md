# Lessons-Archive

Sammlung von Lessons-Learned aus konkreten Bug-Events, Postmortems und
Architektur-Entscheidungen. Wird hier archiviert (statt unbounded in
CLAUDE.md zu wachsen). Reihenfolge: neueste zuerst.

Lesson-Format: knapper Titel + Datum + 1-Absatz-Beschreibung + konkrete
Konsequenz (was wurde im Setup geändert).

---

## 2026-05-22 — Hetzner-Cutover: DNS-TTL, Coolify-Fallen, /api-Pfad

**Event:** Migration von Render auf Hetzner/Coolify. Mehrere teuer gelernte
Stolperfallen beim Cutover:
- **DNS-TTL nicht vorab gesenkt** → die erste Let's-Encrypt-ACME-Challenge traf
  noch die alte Render-IP (gecachte CNAME, TTL 3600) → 1 Fehlversuch. Sobald DNS
  global propagiert war, triggerte ein Frontend-Container-Restart den
  erfolgreichen ACME-Retry → Cert ausgestellt.
- **Coolify: Container-Name ≠ App-UUID.** Die UUID in der Browser-URL
  (`coolify.resourceName`) ist eine andere als der Container-Name-Prefix
  (`coolify.name`). App immer über die Resources-Liste/URL finden.
- **Domain leeren reicht nicht** — generierte Traefik-Labels bleiben kleben.
  Fix: Configuration → Labels → „Reset Labels to Defaults" (mit App-URL `/`
  bestätigen) → Redeploy.
- **nginx cached die Backend-IP beim Start** → 502 nach jedem Backend-Redeploy,
  bis das Frontend neu startet. Dauerlösung: `resolver 127.0.0.11 valid=10s` +
  Variable in `proxy_pass` (erzwingt Laufzeit-DNS).
- **/api-Doppelprefix:** Frontend-`api.get`-Pfade NIE mit `/api` prefixen — die
  axios-`baseURL` ist schon `/api` (sonst `/api/api/...` → 404).
- **PG18 → PG16:** `pg_dump` muss ≥ Quell-Version sein; `SET transaction_timeout`
  (PG17+) aus dem Dump filtern; `--clean --if-exists --no-owner`,
  `ON_ERROR_STOP`, danach `VACUUM ANALYZE`. Beim Restore-`docker run`
  `--network coolify` nicht vergessen (sonst „could not translate host name").

**Konsequenz:**
- **Vor jedem DNS-Cutover die TTL 24-48h vorher senken** (z.B. auf 300s).
- Coolify-Eigenheiten (UUID, Reset-Labels, nginx-Resolver) im Runbook
  `docs/hetzner-migration-runbook.md` (Execution-Post-Mortem) festgehalten.
- Monorepo-Auto-Deploy: nur EIN GitHub-Webhook pro Repo (zwei → Coolify
  dedupliziert den Commit → nur eine App deployt, zufällig welche).

---

## 2026-05-16 — Browser-Polyfill bei NPM-Packages mit Native-Node-Globals

**Event:** `cstimer_module@0.1.5`-Einbau hat cubetracker.de gekillt obwohl
alle lokalen Tests grün waren. Grund: 12 `Buffer.from`-Calls — `Buffer` ist
Node-Global, im Browser nicht da ohne Polyfill.

**Konsequenz:**
- Bei neuen NPM-Packages mit `Buffer`, `process`, `crypto.randomBytes`,
  `fs` etc. **immer separates Test-Branch + Headless-Browser-Smoke** vor
  Production-Push.
- Lokaler `npm run build` + `node -e "..."`-Smoke sind NICHT ausreichend.
- Alternative: `vite-plugin-node-polyfills` o.ä. einbauen.
- Bei csTimer-spezifischen Modulen: lieber Direkt-Vendoring der pure-JS
  Source-Files aus dem Repo statt NPM-Wrapper (siehe `cstimer-vendor/`).

---

## 2026-05-16 — Bash-Heredoc mit deutschen Anführungszeichen → Python-Crash

**Event:** Mehrere Render-Deploys gescheitert, weil Bash-Heredoc beim Schreiben
in `webapp/changelog/data.py` deutsche Schluss-Anführungszeichen mit ASCII
gemischt hatte → Python-SyntaxError → Backend startet nicht.

Konkret: `„...""` (U+201E + U+0022) zerschießt Python-Strings. Auch der
umgekehrte Fall: deutsche Anführungszeichen werden in ASCII-Quote
umgewandelt durch Heredoc-Quoting-Inkonsistenz.

**Konsequenz:**
- In Patch-Notes-Strings: nur ASCII-Quotes ODER Python-Script-Regeneration
  per Heredoc-Output (`python ... > file.py`).
- Bei großen Doku-Edits mit deutschen Texten: `Write`-Tool statt Bash-
  Heredoc nutzen.
- Backend-Smoke-Test (`python -c "import ast; ast.parse(...)"`) in
  `/abschluss`-Checkliste enthalten → fängt Crashes vor Push ab.

---

## 2026-05-17 (mehrfach) — Pre-Commit-Tag-Falle

**Event:** Bei Push der `cstimer-vendor`- und `cstimer-more-puzzles`-Wellen
hat pre-commit-Hook eine Datei modifiziert (EOF-newline-fix) → Commit ging
NICHT durch → ich hatte aber schon `git tag <name>` gepusht. Resultat: Tag
hängt am vorigen Commit (gpl-migration / ivy-switch), nicht am gewünschten.

**Konsequenz:**
- **Reihenfolge:** erst `git commit` verifizieren (Exit-Code 0 + `git log`-
  Check), DANN `git tag`. Nicht in einer Zeile mit `&&` ohne expliziten
  Verify-Step dazwischen.
- Workaround für misplaced Tags: `-impl`-Suffix für den richtigen Commit
  + alten Tag stehen lassen.
- Folge-Audit (2026-05-20): Pre-Tag-Hook könnte das automatisieren — siehe
  audit-2026-05-20.md Vorschlag P3.

---

## 2026-05-17 — Auto-Mode-Classifier-Blocks (gh api, self-modify, bulk-rm)

**Event:** Mehrfach im Workflow geblockt: ntfy-Curl initial (gefixt via
User-Permission), gh-API-Calls auf cs0x7f-Repo (User-Entscheidung gefragt
+ approved), Self-Modify-Permissions (richtig geblockt — Agent darf sich
nicht selbst Berechtigungen erteilen), bulk-rm auf untracked vendor-files
(richtig geblockt — destructive ohne User-Authorisierung).

**Konsequenz:**
- Wiederkehrende Bash-Patterns als Project-Allow-List in `.claude/settings.json`
  eintragen (audit-2026-05-20 Vorschlag P1 implementiert).
- Bei destructiven Ops auf untracked Files: `git rm` statt `rm` wenn
  committed, sonst explizit User fragen.
- Self-modify-Operationen IMMER explizit dem User vorlegen (auch wenn
  augenscheinlich harmlos).

---

## 2026-05-17 — Heuristisches Search-Replace bei Umlauten

**Event:** Umlaut-Migration in ~1417+487+5 Replacements gelaufen, aber
mehrere Endungen verpasst weil Wort-Boundary nur exakt-Match war
(`waere` matched nicht `waeren`). Vier zusätzliche Skript-Pässe nötig.

**Konsequenz:**
- Bei systematischer Code-Transformation: Audit-Tool **vor** dem
  Replace-Skript bauen (Worte mit Pattern X extrahieren + manuell
  klassifizieren).
- Wortliste laufend erweitern, kein Stem-Regex (Auto-Mode-Classifier blockt
  unbestimmte Regex-Patterns).
- Vendor-Files (`cstimer-vendor/`, `vendor/scrambow-patched.*`) IMMER
  ausschließen — fremder Source-Code soll unmodified bleiben.

---

## Format für neue Lessons

Wenn ein neuer Lesson-Eintrag entsteht (typischerweise nach Postmortem):

1. Oben einfügen (neueste zuerst)
2. Format: `## YYYY-MM-DD — Knapper Titel`
3. Event-Beschreibung (was passierte, wo)
4. Konsequenz (was wurde im Setup / Code / Workflow geändert)
5. Cross-Referenz zu Tickets / Commits / Audits wenn passend

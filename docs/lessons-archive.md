# Lessons-Archive

Sammlung von Lessons-Learned aus konkreten Bug-Events, Postmortems und
Architektur-Entscheidungen. Wird hier archiviert (statt unbounded in
CLAUDE.md zu wachsen). Reihenfolge: neueste zuerst.

Lesson-Format: knapper Titel + Datum + 1-Absatz-Beschreibung + konkrete
Konsequenz (was wurde im Setup geändert).

---

## 2026-06-13 — Stop-Hook-Endlosschleife: additionalContext + dauerhaft dirty Tree

**Event:** Der `stop-mini-check.sh`-Stop-Hook (gedacht als 1×-pro-Session-
Backstop via `"once": true` in settings.json) feuerte nach JEDEM Turn-Ende —
das `once`-Flag wird vom Harness nicht honoriert. Weil sein
`additionalContext`-Output Claude jedes Mal neu aufweckt (Antwort-Pflicht →
Turn-Ende → Hook → …), entstand eine sich selbst erhaltende Schleife aus
Filler-Antworten („Warte auf dich" / „–"), sobald der Working-Tree DAUERHAFT
dirty war (externe PLL/OLL-Render-Arbeit des Users, ~80 Dateien). Der User
sah eine Kolonne identischer Mini-Antworten im Chat.

**Konsequenz:** Einmal-Logik direkt im Hook implementiert — Marker-Datei
`.tmp/stop-mini-check-<session_id>.done` (session_id aus dem Stop-Event-JSON
auf stdin), Marker wird NUR gesetzt wenn wirklich gemeldet wurde. Verifiziert
mit 3 Läufen (melden / stumm / neue Session meldet). Generelle Regel: ein
Stop-Hook, der Kontext emittiert, MUSS selbst dafür sorgen, dass er bei
unverändertem Zustand nicht erneut feuert — sonst Schleife. Plus
Verhaltens-Memory: Wartezustand einmal melden, danach Minimal-Zeichen.

**Event:** Beim Volltext-Audit des Methodik-Systems sollten 12 Edits in 7 Files
durchgezogen werden — davon 9 in `.claude/*` (Self-Modification-Kategorie laut
`docs/audit-2026-05-20.md`). Die dort dokumentierte Lösung („explizite User-Freigabe
im Chat-Text") reichte für den Auto-Mode-Classifier **nicht in allen Fällen**:

- Nach allgemeinem „ja, mach die Edits an `.claude/hooks/` und `.claude/commands/`"
  blockte der Classifier den ersten Edit-Versuch mit „acceptance ≠ user-initiated
  direction" — allgemeine Zustimmung zum Vorschlag = nicht user-initiated.
- Nach einem User-Turn, in dem der User die Diff-Strings selbst auflistete + per
  „bitte führe durch" befahl, gingen ALLE *Doku-Drift*-Edits durch (8 von 9 in
  5 Files, inkl. `session-start-context.sh`, `README.md`, `patch-notes-writer.md`,
  `abschluss.md`).
- Genau ein Edit blockte trotzdem weiter: `stop-mini-check.sh` mit
  `--untracked-files=no` — mit der präzisen Begründung „**functional change** …
  isn't part of the user-specified Render→Coolify drift fixes". Erst als der User
  den konkreten Diff dieses Edits separat freigab, ging er durch.

**Konsequenz:**
- Der Classifier unterscheidet sauber **zwei Klassen von Self-Modification**:
  - **Doku-Drift-Fixes** (Strings, Kommentare, Tabellen-Einträge in `.claude/*` —
    semantisch gleichbedeutend): allgemeine Freigabe + Strings im
    Konversationsverlauf reichen.
  - **Funktionale Änderungen** an `.claude/hooks/*.sh` (Verhalten ändert sich) —
    auch wenn nur eine Zeile: brauchen den **konkreten Diff im aktuellen User-Turn**,
    nicht nur in einem vorigen.
- Für Claude: bei funktionalen Hook-/Command-/Agent-Änderungen den Diff klar
  präsentieren und um einen expliziten „Diff freigegeben"-Turn bitten. **Nicht**
  über Bash/sed/`Write` zu umgehen versuchen — Classifier-Intent respektieren
  (auch wenn die System-Anweisung andere Tools erlaubt; das ist die Grauzone, an
  der man hängen bleibt).
- Schärft den `docs/audit-2026-05-20.md`-Befund: dort steht „brauchen explizite
  User-Freigabe im Chat-Text" — präzisiert ergänzen mit „bei funktionalen
  Änderungen muss der konkrete Diff im aktuellen Turn stehen".
- Dokumentiert in den 3 Commits `f7e581a` / `0a81d2f` / `2b9c24f`.

---

## 2026-05-25 — Claude Code aus dem Repo starten, sonst laden die Hooks nicht

**Event:** Eine ganze Session lief mit Projekt-Wurzel `D:\Claude-Projekte` (Multi-Chat-
Methodik-Ordner) statt aus dem cubetracker-Repo. Folge: cubetrackers `.claude/settings.json`
+ ALLE Hooks wurden nicht geladen — ntfy-Stop-Ping weg, post-git-commit-Reminder inaktiv
(Patch-Notes/Tags blieben liegen), pre-bash-dev-server-Guard inaktiv (npm-Builds liefen
ungebremst), kein Session-Start-Kontext. Die Hooks existierten alle korrekt — sie lagen nur
in der falschen (nicht-aktiven) Projekt-Wurzel. Erklärte auf einen Schlag: „ntfy ist weg" +
„Patch-Notes wurden vergessen".

**Konsequenz:**
- Wir arbeiten in der Claude-DESKTOP-App (Cowork/Code), nicht im CLI. Die App lädt
  `.claude/` (Hooks/Skills/Sub-Agents/CLAUDE.md) NUR aus der **Projekt-Wurzel**. Die
  Session-Wurzel muss daher `D:\Projekte\cubetracker` sein (Repo als Projekt öffnen).
- **„Ordner hinzufügen" reicht NICHT** — das gibt nur Datei-Zugriff, lädt KEINE Config.
  Es braucht ein eigenes Projekt mit dem Repo als Wurzel. (Bestätigt via claude-code-guide,
  2026-05-25; Quelle: code.claude.com/docs settings + claude-directory.)
- Start-Selbsttest: kommt der Session-Start-Kontext? Kommt am Turn-Ende ein ntfy-Ping
  (Topic `jjY2OjY`)? Wenn nein → Repo ist nicht die Projekt-Wurzel, Hooks schlafen.
- Als 🚨-Block ganz oben in NEXT_SESSION.md verankert.

---

## 2026-05-25 — Auto-Deploy-Workflow: fetch-depth bei Multi-Commit-Pushes

**Event:** Der Coolify-Auto-Deploy (`.github/workflows/deploy.yml`) ermittelt geänderte
Pfade via `git diff <github.event.before> HEAD`, aber `actions/checkout` holte nur
`fetch-depth: 2`. Beim Push mit >1 Commit (die 3 Rechtsseiten-Commits) lag der
`before`-Commit nicht im Checkout → `git` Exit 128 → Workflow rot → Frontend wurde NICHT
deployt (Rechtsseiten blieben unsichtbar, bis ich's per gh-run-Log bemerkte).

**Konsequenz:**
- `fetch-depth: 0` (volle Historie) + `git cat-file -e`-Guard mit Fallback.
- Danach beidseitig bewiesen (Frontend + Backend deployen gezielt nach geänderten Pfaden).
- Lehre: bei diff-basierter Change-Detection in CI immer die volle Historie holen.

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

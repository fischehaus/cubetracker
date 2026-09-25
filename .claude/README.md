# Claude Code Setup — Cubetracker

Projekt-spezifische Konfiguration für [Claude Code](https://claude.ai/code).

## Hooks

Acht Mental-Model-Fehler / Klassiker-Bugs aus der Projekt-Historie
sollen automatisch aufgefangen werden:

| # | Schmerzpunkt | Hook |
|---|---|---|
| 1 | Lokale Dev-Server starten, obwohl Cubetracker live auf cubetracker.de deployed ist | `pre-bash-dev-server.sh` (PreToolUse-Block) — siehe Klarstellung unten |
| 2 | Commit vergessen zu pushen → Auto-Deploy (Coolify) triggert nicht | `post-git-commit.sh` Teil A (PostToolUse-Notice) |
| 3 | Neuen Patch-Notes-Eintrag in `webapp/changelog/data.py` nicht getaggt | `post-git-commit.sh` Teil B (PostToolUse-Notice) |
| 4 | Session-Start (auch nach `/compact`/`/clear`) ohne Übergabe-Stand → Mental-Model-Drift | `session-start-context.sh` (lädt `NEXT_SESSION.md` + Werkstatt-Zeile + Repo-Stand, Budget 10.000 Zeichen) |
| 5 | Hartkodiertes `localhost:` in TS/TSX-Files (v1.0.1-Klassiker-Bug) | `post-edit-hardcoded-url.sh` (PostToolUse-Notice) |
| 6 | Session beenden mit uncommitted/unpushed Zeug oder fehlenden Tags | `stop-mini-check.sh` (Stop-Hook, 1×/Session, Meldung als `systemMessage` direkt an den User) + `/abschluss` Slash-Command (voller Check) |
| 7 | Tag landet am falschen Commit, weil pre-commit den Commit abgebrochen hat (2× erlebt) | `pre-git-tag-check.sh` (PreToolUse-Block bei `git tag` + dirty tree) — siehe unten |
| 8 | `git push` schlägt fehl (non-fast-forward / kein Upstream / Auth) → kryptischer Git-Stacktrace | `post-push-failure-diagnose.sh` (PostToolUseFailure-Notice) — siehe unten |

### Files

```
.claude/
├── README.md                          (dieses File)
├── settings.json                      (Hook + Permissions Konfig — commitbar)
├── agents/
│   ├── qa-reviewer.md                 (Sub-Agent: strukturierte QA-Reviews)
│   └── patch-notes-writer.md          (Sub-Agent: PatchNote aus Commit-Diff)
├── commands/
│   ├── abschluss.md                   (Slash-Command /abschluss — 13 Checks, Kopf ersetzen)
│   ├── audit.md                       (Slash-Command /audit <sektion> — Doku-vs-Setup)
│   └── roadmap.md                     (Slash-Command /roadmap — Live-Roadmap + Auth)
├── rules/
│   └── discipline.md                  (path-scoped Code-Disziplin, lädt bei Code-Work)
└── hooks/
    ├── session-start-context.sh       (Übergabe-Kopf + Werkstatt + Repo-Stand beim Start)
    ├── pre-compact-checkpoint.sh      (PreCompact: git-Stand → .tmp/ vor Kompaktierung)
    ├── pre-bash-dev-server.sh         (Block Dev-Server-Starts, je Befehlssegment)
    ├── pre-git-tag-check.sh           (Block git tag bei modifizierten tracked-Files)
    ├── post-git-commit.sh             (Push-Reminder + Tag-Reminder)
    ├── post-edit-hardcoded-url.sh     (Warn bei localhost: in *.ts/*.tsx)
    ├── post-push-failure-diagnose.sh  (Diagnose bei fehlgeschlagenem git push)
    ├── permission-request-auto-approve.sh (Auto-Approve safe Read-Commands)
    ├── stop-mini-check.sh             (Stop-Hook, 1×/Session: uncommitted + unpushed, als systemMessage)
    ├── stop-ntfy-notify.sh            (Stop-Hook: ntfy-Ping wenn Claude auf Eingabe wartet)
    └── tests/test_pre_bash_dev_server.py (Testmatrix Dev-Server-Hook, 38 Fälle)
```

### /abschluss — Session-Ende-Check

Ruf am Ende einer Arbeits-Session `/abschluss` auf. 13 Checks — maßgeblich
ist `commands/abschluss.md`. Kern seit W.harness-v2 (2026-09-25): Check 11
prüft die Gegenlesung bei Regelebene-Änderungen, Check 12 ordnet untracked
Dateien ein (Löschen nur per `GO <n>`, nie still), Check 13 läuft **zuletzt** und
**ersetzt** den Übergabe-Kopf `NEXT_SESSION.md` (Verlustprobe gegen den Stand
beim letzten Abschluss), hängt den Verlauf an `docs/session-journal.md` und
pusht nur, wenn der Push ausschließlich Doku trägt. Schluss mit End-Block.

Bei ⚠ Befunden: bietet Fixes an. Bei allem grün: „Session kann sauber beendet werden."

### Override fuer echtes lokales Debugging

Wenn du wirklich mal lokal entwickeln willst (z.B. neue Feature ohne
Live-Deploy testen):

```bash
CUBETRACKER_ALLOW_LOCAL_DEV=1 uvicorn webapp.main:app --reload
```

Die Env-Var deaktiviert nur den `pre-bash-dev-server.sh`-Block.

### Hooks neu laden

Claude Code liest `settings.json` beim Session-Start. Nach Aenderungen:
neue Session starten oder `/hooks` Slash-Command nutzen (zeigt aktive
Hooks an + lädt neu).

### Hooks-Logik bei Patch-Notes-Tagging

`post-git-commit.sh` scannt `git diff-tree HEAD` nach `webapp/changelog/data.py`
und extrahiert neue `version="..."`-Strings. Fuer jede neue Version:

- Falls Tag `v<version>` existiert → ℹ-Hinweis
- Falls Tag fehlt → 🏷-Vorschlag mit fertigem `git tag -a … && git push`-Command

Konvention: Tag-Name = `v` + Patch-Notes-Version-String. Beispiel:
`version="2.0.0-alpha.W.welle2-3-qa"` → Tag `v2.0.0-alpha.W.welle2-3-qa`.

## pre-bash-dev-server: Block-Logik

Seit W.harness-v2 (2026-09-25) prüft der Hook **je Befehlssegment** (getrennt
an `&&`, `||`, `;`, `|`, `&`, Zeilenumbruch; Klammern entfernt; `bash -c "…"`
rekursiv) nur das **ausgeführte Programm** — Wrapper (`npx`, `nohup`,
`timeout N`, `env`, `FOO=1`) und Optionen (`npm --prefix X`, `python -X utf8`)
werden übersprungen. JSON per Python geparst; Fast-Path ohne Python, wenn kein
Kandidatenwort vorkommt. Blockiert: `uvicorn`, `python -m uvicorn`,
`npm|yarn|pnpm [run] dev|start|preview|serve`, `vite` ohne Argument bzw.
`vite dev|serve|preview|--…`, `node …/vite/bin/vite.js`.
Durch: `vitest`, `vite build`, `npm test`, `npm run build`, `pip install uvicorn`,
`grep uvicorn …`, `cat vite.config.ts`, Commit-Messages mit diesen Wörtern.
Vorher traf das Glob-Muster `*vite*` auch `npx vitest` (reiner Testlauf).
**Testmatrix (38 Fälle):** `python .claude/hooks/tests/test_pre_bash_dev_server.py
> .tmp/devhook.txt 2>&1; echo "RC=$?"` — bei jeder Hook-Änderung vor der
Gegenlesung laufen lassen.

## PermissionRequest: Auto-Approve safe commands

`permission-request-auto-approve.sh` (Phase Audit-2026-05-20) auto-approved
Read-Only-Commands die nicht in `settings.json:permissions.allow` stehen.
Patterns: `git status/log/diff/branch`, `ls/pwd/cat/head/tail/wc`,
`python -c`, `npm test/run build/run lint/ls`. Reduziert Permission-Dialog-
Fatigue im Auto-Mode.

## pre-git-tag-check: Misplaced-Tag-Schutz

`pre-git-tag-check.sh` (Phase Audit-2026-05-20-D) blockt `git tag`-Erzeugung,
wenn der Working-Tree **modifizierte tracked-Files** enthält. Hintergrund: 2×
ist passiert, dass ein pre-commit-Hook eine Datei modifiziert + den Commit
abgebrochen hat, ich aber trotzdem getaggt habe → Tag hing am falschen Commit
(siehe `docs/lessons-archive.md`).

- Greift nur bei Tag-**Erzeugung**, nicht bei `git tag -d/-l/-v` (Listing/Delete).
- **Untracked-Files** (z.B. `scripts/`, Scratch-`.docx`) zählen NICHT als Schmutz.
- Block läuft via JSON `permissionDecision: "deny"` mit Diagnose (zeigt den
  aktuellen HEAD + die modifizierten Files).
- Override für den dokumentierten Recovery-Workflow (alten Commit mit
  `-impl`-Suffix nachtaggen):

```bash
CUBETRACKER_ALLOW_DIRTY_TAG=1 git tag -a v... -m "..."
```

## post-push-failure-diagnose: Push-Fehler-Diagnose

`post-push-failure-diagnose.sh` (Phase Audit-2026-05-20-D) läuft am
`PostToolUseFailure`-Event, wenn ein `git push` fehlschlägt. Scannt die
Fehlermeldung und liefert einen zielgerichteten Fix-Command statt rohem
Git-Stacktrace:

- **non-fast-forward** → `git pull --rebase origin <branch>` + erneut pushen
- **kein Upstream** → `git push -u origin <branch>`
- **Auth/SSH** (publickey, authentication failed) → PAT / SSH-Key prüfen
- **Netzwerk** (could not resolve host) → Connection/VPN prüfen
- **Branch-Protection** (pre-receive declined) → remote:-Zeile lesen, ggf. PR
- **Unbekannt** → generischer `git status` + `git remote -v`-Hinweis

## /audit — reproduzierbarer Doku-vs-Setup-Audit

`/audit <sektion>` (z.B. `/audit mcp`) auditiert eine Claude-Code-Doku-Sektion
gegen unser Setup und liefert den 5-Felder-Report (Doku-Kern / Status-Quo / Gap /
konkrete Vorschläge / Effort+Risiko+Schwelle), den er an `docs/audit-2026-05-20.md`
anhängt. Macht aus dem einmaligen Audit eine wiederholbare Routine (quartalsweise
oder wenn die Doku sich ändert). Schon auditiert: hooks, subagents, settings,
memory, slash-commands, skills, background-tasks, context-management. Offen: mcp,
output-styles, status-line, plugins.

## Context-Safety: pre-compact-checkpoint

`pre-compact-checkpoint.sh` (PreCompact-Event, Audit-2026-05-20-Welle2) feuert VOR
jeder Kontext-Kompaktierung (manuell via `/compact` oder automatisch am Limit) und
friert den git-Stand (branch, status, letzte Commits, diff-stat) nach
`.tmp/last-compact-checkpoint.md` ein (gitignored). Hintergrund: eine Session war
nach Auto-Kompaktierung kontextlos. Ehrliche Grenze: erfasst nur git-Stand, nicht
die Konversation — die inhaltliche Übergabe bleibt `NEXT_SESSION.md`. Seit
W.harness-v2 lädt `session-start-context.sh` den Kopf nach `/compact` und
`/clear` automatisch (Matcher `startup|resume|compact|clear|fork`);
`.tmp/last-compact-checkpoint.md` ergänzt den git-Stand.

## stop-ntfy-notify

`stop-ntfy-notify.sh` (Stop-Event, kein `once`; schweigt bei `stop_hook_active`) sendet bei jedem Turn-Ende einen
ntfy-Ping an Topic `jjY2OjY`, damit der User weiss wann Claude fertig ist und auf
Eingabe wartet. Als Hook statt manuellem Curl, weil manuelle Pings nach
Kompaktierung verloren gehen (Claude „vergisst" die Gewohnheit) — der Hook
überlebt das. ntfy.sh ist als trusted endpoint in `~/.claude/settings.json`
hinterlegt.

## Erweiterung

Neuen Hook hinzufuegen:

1. Bash-Script unter `.claude/hooks/` anlegen (siehe Vorlage)
2. In `settings.json` unter passendem Event (`PreToolUse`, `PostToolUse`,
   `PermissionRequest`, `Stop`, …) registrieren mit `matcher` + `if`-Bedingung
3. Manuell testen mit `echo '{...}' | bash .claude/hooks/<script>.sh`
   (Treffer **und** Nicht-Treffer; Ausgabe in Datei, Exit-Code nicht hinter Pipe werten)
4. Gegenlesung (Opus, frischer Kontext) — Hooks sind Regelebene (`CLAUDE.md` →
   Subagenten, QA & Gegenlesung)
5. Commit + push

Hook-Doku: https://code.claude.com/docs/en/hooks

## Audit-Trail

Letzter Setup-Audit: `docs/audit-2026-05-20.md` (Doku-vs-Setup-Abgleich
mit 4 Sub-Agents parallel). Phase D umgesetzt: 10 Quick-Wins (Commit
`7330b81`) + 3 Präsentations-Items P3/H2/S2 (`pre-git-tag-check.sh`,
`post-push-failure-diagnose.sh`, `agents/patch-notes-writer.md`). Offen:
M4 (NEXT_SESSION-Update-Hook) + S3 (audit-loop-Subagent, zurückgestellt).

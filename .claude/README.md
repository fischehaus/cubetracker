# Claude Code Setup — Cubetracker

Projekt-spezifische Konfiguration für [Claude Code](https://claude.ai/code).

## Hooks

Acht Mental-Model-Fehler / Klassiker-Bugs aus der Projekt-Historie
sollen automatisch aufgefangen werden:

| # | Schmerzpunkt | Hook |
|---|---|---|
| 1 | Lokale Dev-Server starten, obwohl Cubetracker live auf cubetracker.de deployed ist | `pre-bash-dev-server.sh` (PreToolUse-Block) — siehe Klarstellung unten |
| 2 | Commit vergessen zu pushen → Render-autoDeploy triggert nicht | `post-git-commit.sh` Teil A (PostToolUse-Notice) |
| 3 | Neuen Patch-Notes-Eintrag in `webapp/changelog/data.py` nicht getaggt | `post-git-commit.sh` Teil B (PostToolUse-Notice) |
| 4 | Session-Start ohne Repo-Context → Mental-Model-Drift | `session-start-context.sh` (SessionStart-Notice) |
| 5 | Hartkodiertes `localhost:` in TS/TSX-Files (v1.0.1-Klassiker-Bug) | `post-edit-hardcoded-url.sh` (PostToolUse-Notice) |
| 6 | Session beenden mit uncommitted/unpushed Zeug oder fehlenden Tags | `stop-mini-check.sh` (Stop-Hook, 1×/Session) + `/abschluss` Slash-Command (voller Check) |
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
│   └── abschluss.md                   (Slash-Command /abschluss — 8-Punkte-Check)
├── rules/
│   └── discipline.md                  (path-scoped Code-Disziplin, lädt bei Code-Work)
└── hooks/
    ├── session-start-context.sh       (Repo-Stand + Reminders beim Start)
    ├── pre-bash-dev-server.sh         (Block uvicorn / npm run dev / vite)
    ├── pre-git-tag-check.sh           (Block git tag bei modifizierten tracked-Files)
    ├── post-git-commit.sh             (Push-Reminder + Tag-Reminder)
    ├── post-edit-hardcoded-url.sh     (Warn bei localhost: in *.ts/*.tsx)
    ├── post-push-failure-diagnose.sh  (Diagnose bei fehlgeschlagenem git push)
    ├── permission-request-auto-approve.sh (Auto-Approve safe Read-Commands)
    └── stop-mini-check.sh             (Stop-Hook, 1×/Session: uncommitted + unpushed)
```

### /abschluss — Session-Ende-Check

Ruf am Ende einer Arbeits-Session `/abschluss` auf. Geht 8 Checks durch:

1. uncommitted Aenderungen im Working-Tree
2. ungepushte Commits
3. `feat(W.*)`/`fix(W.*)`-Commits ohne Patch-Notes-Eintrag
4. Patch-Notes-Versionen ohne Git-Tag
5. neue User-facing-Features ohne `features-data.ts`-Update
6. STATUS.md / NEXT_SESSION.md veraltet?
7. offene Todos
8. Backend-Smoke-Test (lokal mit venv)

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

Der Hook matched folgende Patterns (Glob, case-aware):
- `*uvicorn*` — alle Aufrufe inkl. `pip install uvicorn` (False Positive!)
- `npm run dev`, `yarn dev`, `pnpm dev`
- `*vite*`, `npx vite` (außer `vite build`, das ist erlaubt)

**Wichtig:** Pattern `*uvicorn*` blockt auch Dependency-Installation. Falls
du legit `pip install uvicorn` o.ä. brauchst → Override:

```bash
CUBETRACKER_ALLOW_LOCAL_DEV=1 pip install uvicorn
```

Das deaktiviert den Hook für die gesamte Shell-Session.

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

## Erweiterung

Neuen Hook hinzufuegen:

1. Bash-Script unter `.claude/hooks/` anlegen (siehe Vorlage)
2. In `settings.json` unter passendem Event (`PreToolUse`, `PostToolUse`,
   `PermissionRequest`, `Stop`, …) registrieren mit `matcher` + `if`-Bedingung
3. Manuell testen mit `echo '{...}' | bash .claude/hooks/<script>.sh`
4. Commit + push

Hook-Doku: https://code.claude.com/docs/en/hooks

## Audit-Trail

Letzter Setup-Audit: `docs/audit-2026-05-20.md` (Doku-vs-Setup-Abgleich
mit 4 Sub-Agents parallel). Phase D umgesetzt: 10 Quick-Wins (Commit
`7330b81`) + 3 Präsentations-Items P3/H2/S2 (`pre-git-tag-check.sh`,
`post-push-failure-diagnose.sh`, `agents/patch-notes-writer.md`). Offen:
M4 (NEXT_SESSION-Update-Hook) + S3 (audit-loop-Subagent, zurückgestellt).

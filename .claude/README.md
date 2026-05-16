# Claude Code Setup — Cubetracker

Projekt-spezifische Konfiguration für [Claude Code](https://claude.ai/code).

## Hooks

Fuenf Mental-Model-Fehler / Klassiker-Bugs aus der Projekt-Historie
sollen automatisch aufgefangen werden:

| # | Schmerzpunkt | Hook |
|---|---|---|
| 1 | Lokale Dev-Server starten, obwohl Cubetracker live auf cubetracker.de deployed ist | `pre-bash-dev-server.sh` (PreToolUse-Block) |
| 2 | Commit vergessen zu pushen → Render-autoDeploy triggert nicht | `post-git-commit.sh` Teil A (PostToolUse-Notice) |
| 3 | Neuen Patch-Notes-Eintrag in `webapp/changelog/data.py` nicht getaggt | `post-git-commit.sh` Teil B (PostToolUse-Notice) |
| 4 | Session-Start ohne Repo-Context → Mental-Model-Drift | `session-start-context.sh` (SessionStart-Notice) |
| 5 | Hartkodiertes `localhost:` in TS/TSX-Files (v1.0.1-Klassiker-Bug) | `post-edit-hardcoded-url.sh` (PostToolUse-Notice) |

### Files

```
.claude/
├── README.md                      (dieses File)
├── settings.json                  (Hook-Konfig — commitbar, gilt fuer alle Sessions)
└── hooks/
    ├── session-start-context.sh   (Repo-Stand + Reminders beim Start)
    ├── pre-bash-dev-server.sh     (Block uvicorn / npm run dev / vite)
    ├── post-git-commit.sh         (Push-Reminder + Tag-Reminder)
    └── post-edit-hardcoded-url.sh (Warn bei localhost:/127.0.0.1: in *.ts/*.tsx)
```

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

## Erweiterung

Neuen Hook hinzufuegen:

1. Bash-Script unter `.claude/hooks/` anlegen (siehe Vorlage)
2. In `settings.json` unter passendem Event (`PreToolUse`, `PostToolUse`, …)
   registrieren mit `matcher` + `if`-Bedingung
3. Manuell testen mit `echo '{...}' | bash .claude/hooks/<script>.sh`
4. Commit + push

Hook-Doku: https://code.claude.com/docs/en/hooks

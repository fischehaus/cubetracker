#!/bin/bash
# post-push-failure-diagnose.sh — PostToolUseFailure-Hook fuer Bash
# (Audit-2026-05-20, Vorschlag H2).
#
# Zweck: Wenn ein `git push` fehlschlaegt, liefert dieser Hook eine
# zielgerichtete Diagnose + Fix-Command statt rohem Git-Stacktrace. Spart
# Rate-Runden bei den haeufigen Push-Fehlern (non-fast-forward, kein
# Upstream, Auth/SSH, Netzwerk, Remote-Hook-Reject).
#
# Greift NUR bei git push — andere fehlgeschlagene Bash-Calls werden
# ignoriert (stumm raus).
#
# Eingabe (stdin): JSON mit tool_input.command + tool_response/error.
#   Da das genaue Fehler-Feld je nach Version variiert, scannen wir den
#   GESAMTEN Input nach bekannten Fehler-Signaturen (robust gegen
#   Feldnamen-Drift).
# Ausgabe (stdout): JSON mit hookSpecificOutput.additionalContext oder leer.
# Exit-Code: 0.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

input="$(cat)"

# Command extrahieren — nur git push interessiert uns.
command="$(echo "$input" | sed -n 's/.*"command":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
case "$command" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# Branch fuer Fix-Vorschlaege (best effort).
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<branch>')"

# Lowercase-Kopie des gesamten Inputs fuer case-insensitive Matching.
low="$(printf '%s' "$input" | tr '[:upper:]' '[:lower:]')"

notes=""

# === non-fast-forward / Remote ist voraus ===
case "$low" in
  *"non-fast-forward"*|*"updates were rejected"*|*"tip of your current branch is behind"*|*"fetch first"*|*"failed to push some refs"*)
    notes+="🔄 non-fast-forward: Remote hat Commits die du lokal nicht hast. "
    notes+="→ \`git pull --rebase origin ${branch}\` (Konflikte loesen falls noetig), dann \`git push\`. "
    notes+="NICHT --force auf einen geteilten Branch (Datenverlust-Risiko).\n"
    ;;
esac

# === Kein Upstream gesetzt ===
case "$low" in
  *"no upstream branch"*|*"has no upstream"*|*"set the remote as upstream"*|*"set-upstream"*)
    notes+="🔗 Kein Upstream gesetzt fuer ${branch}. "
    notes+="→ \`git push -u origin ${branch}\` (verknuepft + pusht in einem Schritt).\n"
    ;;
esac

# === Auth / SSH ===
case "$low" in
  *"permission denied"*|*"publickey"*|*"authentication failed"*|*"could not read username"*|*"could not read password"*|*"invalid username or password"*|*"403 forbidden"*)
    notes+="🔐 Auth-Fehler: Credentials/Token/SSH-Key greifen nicht. "
    notes+="→ Bei HTTPS: PAT pruefen (gh auth status / Token abgelaufen?). "
    notes+="Bei SSH: \`ssh -T git@github.com\` testen, ggf. Key in den Agent laden.\n"
    ;;
esac

# === Netzwerk / Host nicht erreichbar ===
case "$low" in
  *"could not resolve host"*|*"unable to access"*|*"failed to connect"*|*"connection timed out"*|*"connection refused"*|*"network is unreachable"*)
    notes+="🌐 Netzwerk-Fehler: Remote nicht erreichbar. "
    notes+="→ Internet/VPN/Proxy pruefen, dann erneut pushen. \`git remote -v\` checkt die URL.\n"
    ;;
esac

# === Remote-seitiger Hook / Branch-Protection ===
case "$low" in
  *"pre-receive hook declined"*|*"protected branch"*|*"remote rejected"*|*"changes must be made through a pull request"*)
    notes+="🛡 Remote hat den Push abgelehnt (Branch-Protection / pre-receive-Hook). "
    notes+="→ Lies die remote:-Zeile im Fehler. Evtl. PR statt Direkt-Push noetig, oder Branch ist protected.\n"
    ;;
esac

# === Output ===
if [[ -z "$notes" ]]; then
  # Unbekannter Push-Fehler: generischer, aber nuetzlicher Hinweis.
  notes="❌ git push fehlgeschlagen, aber kein bekanntes Muster erkannt. "
  notes+="→ \`git status\` + \`git remote -v\` pruefen. Volle Fehlermeldung oben im Tool-Output lesen.\n"
fi

# JSON-Encoding via printf (kein jq-Dependency-Zwang). Newlines als \n behalten.
escaped="$(printf '%s' "$notes" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')"

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUseFailure","additionalContext":"%s"}}\n' "$escaped"

exit 0

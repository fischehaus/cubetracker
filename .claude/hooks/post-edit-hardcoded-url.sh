#!/bin/bash
# post-edit-hardcoded-url.sh — PostToolUse-Hook fuer Edit/Write/MultiEdit
# auf TS/TSX-Files.
#
# Zweck: warnen wenn jemand `localhost:` oder `127.0.0.1:` als String in
# eine TS/TSX-Datei schreibt. Das war der v1.0.1-Hotfix-Bug:
#
#   v1.0 hatte einen API-baseURL-Bug (hardcoded localhost:8000) — in
#   der ausgerollten App (Backend auf :8765) gingen alle API-Calls
#   ins Leere. Fix: dynamisch via import.meta.env.DEV.
#   Klassiker-Bug der erst beim Distribution-Test auffaellt.
#
# Diese Bug-Klasse soll der Hook erkennen BEVOR sie commited wird.
#
# Eingabe (stdin): JSON mit tool_input.file_path + tool_input.new_string
#                  (Edit) oder tool_input.content (Write).
# Ausgabe (stdout): JSON additionalContext bei Treffer, sonst stumm.
# Exit-Code: 0 (Warnung, kein Block — der User soll selbst entscheiden).

set -euo pipefail

input="$(cat)"
file_path="$(echo "$input" | sed -n 's/.*"file_path":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Nur TS/TSX Files interessieren uns — andere koennen legitim localhost
# enthalten (z.B. Doku in *.md, oder Backend-Tests die gegen lokalen
# uvicorn laufen).
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# Tests-Files raus — dort ist localhost als Mock/Stub legitim.
case "$file_path" in
  *.test.*|*.spec.*|*/__tests__/*|*/test/*|*/tests/*) exit 0 ;;
esac

# Bei Edit-Tool: pruefe new_string. Bei Write: content. Bei MultiEdit:
# pruefe alle edits[].new_string.
# Pragmatisch: wir nehmen einfach das ganze Input und greppen drueber —
# wenn das Pattern irgendwo im JSON-Input vorkommt, war's der User-Code.
suspicious=""
if echo "$input" | grep -qE '(localhost|127\.0\.0\.1):[0-9]+' 2>/dev/null; then
  matches="$(echo "$input" | grep -oE '(localhost|127\.0\.0\.1):[0-9]+' | sort -u | head -3 | tr '\n' ' ')"
  suspicious="$matches"
fi

if [[ -z "$suspicious" ]]; then
  exit 0
fi

# Hartkodierter URL gefunden → Warnung mit konkretem v1.0.1-Bug-Hinweis.
reason="🚨 Hartkodierter localhost-URL in ${file_path}: ${suspicious}. "
reason+="Klassiker-Bug aus v1.0.1: hardcoded baseURL ging in der "
reason+="ausgerollten App tot, weil Render-Backend nicht auf localhost laeuft. "
reason+="Loesung: nutze import.meta.env.VITE_API_BASE oder import.meta.env.DEV "
reason+="fuer Dev/Prod-Unterscheidung. Siehe lib/api.ts wie es gemacht ist."

# JSON-Encoding.
escaped="$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$escaped"

exit 0

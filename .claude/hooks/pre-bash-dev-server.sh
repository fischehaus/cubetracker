#!/bin/bash
# pre-bash-dev-server.sh — PreToolUse-Hook fuer Bash, blockiert
# lokale Dev-Server-Starts.
#
# Hintergrund: Cubetracker laeuft live auf cubetracker.de (Render-Hosting,
# autoDeploy via git push). Lokale `uvicorn` / `npm run dev` / `vite`-
# Aufrufe sind in 95% der Faelle Mental-Model-Fehler („ich teste lokal"),
# nicht echtes Lokal-Debugging.
#
# Heute genau das passiert: ich habe versucht, beide Dev-Server zu starten
# weil ich vergessen hatte, dass Cubetracker schon deployed ist.
#
# Override: setze CUBETRACKER_ALLOW_LOCAL_DEV=1 in der Env, dann blockt der
# Hook nichts mehr — sinnvoll fuer echte lokale Debug-Sessions.
#
# Eingabe: JSON mit tool_input.command
# Ausgabe: JSON mit hookSpecificOutput.permissionDecision="deny" oder leer
# Exit-Code: immer 0 — Block laeuft via JSON, nicht Exit-Code.

set -euo pipefail

# Override-Env-Var: wenn gesetzt, sofort raus.
if [[ "${CUBETRACKER_ALLOW_LOCAL_DEV:-}" == "1" ]]; then
  exit 0
fi

input="$(cat)"
command="$(echo "$input" | sed -n 's/.*"command":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Pattern: alles was wie ein Dev-Server-Start aussieht.
# Bewusst breit gefasst, weil verschiedene Schreibweisen moeglich sind:
#   - uvicorn main:app
#   - python -m uvicorn
#   - npm run dev
#   - yarn dev / pnpm dev
#   - vite (direkt)
#   - npx vite
matched=""
case "$command" in
  *uvicorn*|"python -m uvicorn"*|"npm run dev"*|"yarn dev"*|"pnpm dev"*|*"vite"*|*"npx vite"*)
    matched="dev-server"
    ;;
esac

if [[ -z "$matched" ]]; then
  exit 0
fi

# Block mit aussagekraeftigem Grund.
reason="Cubetracker laeuft live auf https://cubetracker.de (Render-autoDeploy bei git push). "
reason+="Lokale Dev-Server sind in 95% der Faelle ein Mental-Model-Fehler. "
reason+="Falls du wirklich lokal debuggen willst: setze CUBETRACKER_ALLOW_LOCAL_DEV=1 in deiner Shell-Env "
reason+="und ruf den Command erneut auf. Oder: schreib direkt das Feature, push, schau auf cubetracker.de."

# JSON-Encoding via printf.
escaped="$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g')"

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$escaped"

exit 0

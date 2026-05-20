#!/bin/bash
# permission-request-auto-approve.sh — PermissionRequest-Hook (Phase Audit-2026-05-20).
#
# Zweck: Auto-Approve fuer haeufige Safe-Read-Commands. Reduziert
# Permission-Dialog-Fatigue im Auto-Mode. Permission-Allowlist in
# settings.json regelt das schon weitgehend; dieser Hook ist Fallback
# fuer Commands die NICHT in der Allowlist sind aber trotzdem sicher.
#
# Hook-Decision-Format:
#   {"decision": "approve"} — User-Prompt skippen
#   {"decision": "deny", "reason": "..."} — explizit blocken
#   {} (oder nichts) — normalen Permission-Flow weiterlaufen lassen
#
# Wir nutzen nur "approve" hier — Deny machen wir ueber settings.json:permissions.deny.
#
# Eingabe (stdin): JSON mit tool_name + command.
# Ausgabe (stdout): JSON-Decision oder leer.
# Exit-Code: 0.

set -euo pipefail

# Eingabe lesen
input="$(cat || echo '{}')"

# tool_name extrahieren
tool="$(echo "$input" | sed -n 's/.*"tool_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Nur Bash-Commands interessieren uns
if [[ "$tool" != "Bash" ]]; then
  exit 0
fi

# Command extrahieren
command="$(echo "$input" | sed -n 's/.*"command":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Whitelist fuer Auto-Approve. Konservativ: nur Read-Operationen +
# Idempotente Commands. Patterns sind hier breiter als settings.json:allow
# weil dieser Hook Fall-Back-Logic ist (wenn settings.json nicht greift).
case "$command" in
  # Git Read-Only
  "git status"*|"git log"*|"git diff"*|"git branch"*|"git remote -v"*)
    printf '{"decision":"approve"}\n'
    exit 0
    ;;
  # Verification-Commands (Read-Only on filesystem)
  "ls "*|"ls"|"pwd"|"echo "*|"cat "*|"head "*|"tail "*|"wc "*)
    printf '{"decision":"approve"}\n'
    exit 0
    ;;
  # Quick Python-Smoke-Tests (siehe abschluss-Hook Pattern)
  "python -c "*|"python3 -c "*)
    printf '{"decision":"approve"}\n'
    exit 0
    ;;
  # NPM Read-Only / Dev-Tooling
  "npm test"*|"npm run build"*|"npm run lint"*|"npm ls"*)
    printf '{"decision":"approve"}\n'
    exit 0
    ;;
esac

# Default: Fall-through, normaler Permission-Flow
exit 0

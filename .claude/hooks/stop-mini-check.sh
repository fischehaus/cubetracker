#!/bin/bash
# stop-mini-check.sh — Stop-Hook (1x pro Session via once: true).
#
# Mini-Backstop wenn Claude das erste Mal in einer Session „fertig" ist.
# Erinnert dezent an unpushed Commits + uncommitted Aenderungen, damit
# nichts liegen bleibt. Volle Checkliste laeuft via /abschluss-Slash-
# Command (siehe .claude/commands/abschluss.md).
#
# Bewusst minimal: 2 Checks, beide read-only, sub-100ms. Wenn beide ok →
# stumm raus (kein Noise im Chat).
#
# Eingabe: SessionEnd-Stop-Event-JSON (wir nutzen nichts davon)
# Ausgabe: additionalContext JSON wenn was zu sagen ist, sonst stumm.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

notes=""

# Check 1: uncommitted changes
uncommitted_count="$(git status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${uncommitted_count:-0}" -gt 0 ]]; then
  notes+="📝 ${uncommitted_count} uncommitted Datei(en) im Working-Tree. "
fi

# Check 2: unpushed commits
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -n "$upstream" ]]; then
  unpushed_count="$(git log --oneline "$upstream"..HEAD 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${unpushed_count:-0}" -gt 0 ]]; then
    notes+="⬆️ ${unpushed_count} Commit(s) lokal noch nicht gepusht. "
  fi
fi

if [[ -z "$notes" ]]; then
  exit 0
fi

# Empfehle den vollen /abschluss-Check fuer mehr.
notes+=$'\n→ Fuer einen vollstaendigen Session-Ende-Check ruf `/abschluss` auf.'

# JSON-Encoding
escaped="$(printf '%s' "$notes" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ' | sed 's/  */ /g')"
printf '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"%s"}}\n' "$escaped"

exit 0

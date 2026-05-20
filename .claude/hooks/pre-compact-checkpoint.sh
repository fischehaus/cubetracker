#!/bin/bash
# pre-compact-checkpoint.sh — PreCompact-Hook (Audit-2026-05-20, Vorschlag CM3).
#
# Hintergrund (echter Schmerz): Eine Session ist aus verlustiger Auto-
# Kompaktierung gestartet — die Konversation war weg, der Stand musste muehsam
# aus einem manuell gespeicherten Word-Protokoll + NEXT_SESSION.md rekonstruiert
# werden. Dieser Hook feuert VOR der Kompaktierung (manuell via /compact ODER
# automatisch bei Context-Limit) und friert den mechanisch erfassbaren Projekt-
# Stand ein, damit er die Kompaktierung ueberlebt.
#
# WICHTIG / ehrliche Grenze: ein Shell-Hook kann die KONVERSATION nicht
# zusammenfassen (kein LLM zur Hand). Er erfasst nur den git-Stand + eine
# Erinnerung. Die inhaltliche State-Uebergabe bleibt NEXT_SESSION.md (manuell).
#
# Ablage: .tmp/last-compact-checkpoint.md (gitignored — reine Session-State,
# gehoert nicht in die History). Nach Kompaktierung lesbar via:
#   "Lies .tmp/last-compact-checkpoint.md + NEXT_SESSION.md"
#
# Eingabe (stdin): JSON mit trigger ("manual"|"auto") etc. — best effort genutzt.
# Exit-Code: immer 0 — darf die Kompaktierung nie blockieren.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Kein Git-Repo: stumm raus (Checkpoint waere wertlos).
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

input="$(cat 2>/dev/null || echo '{}')"
trigger="$(printf '%s' "$input" | sed -n 's/.*"trigger":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
[[ -z "$trigger" ]] && trigger="unbekannt"

mkdir -p .tmp
out=".tmp/last-compact-checkpoint.md"

{
  echo "# Last-Compact-Checkpoint"
  echo ""
  echo "> Automatisch erzeugt vom PreCompact-Hook BEVOR der Kontext komprimiert"
  echo "> wurde. Zweck: mechanischer git-Stand, der die Kompaktierung ueberlebt."
  echo "> Fuer die inhaltliche Uebergabe IMMER zusaetzlich NEXT_SESSION.md lesen."
  echo ""
  echo "- **Zeitpunkt:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "- **Compaction-Trigger:** ${trigger} (manual=/compact, auto=Context-Limit)"
  echo "- **Branch:** $(git branch --show-current 2>/dev/null || echo '?')"
  echo "- **HEAD:** $(git log -1 --oneline 2>/dev/null || echo '?')"
  echo ""
  echo "## Uncommitted (git status --short)"
  echo '```'
  git status --short 2>/dev/null | head -40 || echo "(leer)"
  echo '```'
  echo ""
  echo "## Letzte 8 Commits"
  echo '```'
  git log --oneline -8 2>/dev/null || echo "(keine)"
  echo '```'
  echo ""
  echo "## Diff-Stat uncommitted (tracked)"
  echo '```'
  git diff --stat 2>/dev/null | head -30 || echo "(leer)"
  echo '```'
} > "$out" 2>/dev/null || exit 0

# Reminder in den Kontext geben (best effort; falls PreCompact additionalContext
# unterstuetzt, sieht Claude diesen Hinweis nach der Kompaktierung).
msg="PreCompact-Checkpoint nach .tmp/last-compact-checkpoint.md geschrieben. Nach der Kompaktierung: dieses File + NEXT_SESSION.md lesen, um den Stand zu rekonstruieren."
escaped="$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"%s"}}\n' "$escaped" 2>/dev/null || true

exit 0

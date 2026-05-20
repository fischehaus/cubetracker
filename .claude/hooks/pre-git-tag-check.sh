#!/bin/bash
# pre-git-tag-check.sh — PreToolUse-Hook fuer Bash, schuetzt vor der
# "misplaced-Tag-Falle" (Audit-2026-05-20, Vorschlag P3).
#
# Hintergrund (2x erlebt, siehe docs/lessons-archive.md "Pre-Commit-Tag-Falle"):
#   Beim Push einer Welle modifiziert der pre-commit-Hook eine Datei
#   (z.B. EOF-newline-fix) -> der `git commit` geht NICHT durch -> aber
#   `git tag <name>` wird trotzdem abgesetzt. Resultat: der Tag haengt am
#   VORHERIGEN Commit, nicht am gewuenschten. Die Working-Tree-Signatur in
#   genau diesem Moment: modifizierte (tracked) Files, die der gescheiterte
#   Commit eigentlich einsammeln sollte.
#
# Logik: Wenn ein Tag ERZEUGT wird (kein -d / -l / -v) UND modifizierte
#   tracked-Files im Working-Tree liegen -> deny mit Diagnose. HEAD ist dann
#   wahrscheinlich nicht der Commit den du taggen willst.
#
# Untracked-Files (z.B. scripts/, *.docx-Scratch) zaehlen NICHT als Schmutz —
# die sind nie Teil eines gescheiterten Commits.
#
# Override: CUBETRACKER_ALLOW_DIRTY_TAG=1 in der Env. Sinnvoll fuer den
#   dokumentierten Recovery-Workflow (alten Commit mit -impl-Suffix nach-
#   taggen, waehrend der Tree absichtlich schmutzig ist).
#
# Eingabe (stdin): JSON mit tool_input.command
# Ausgabe (stdout): JSON mit hookSpecificOutput.permissionDecision="deny" oder leer
# Exit-Code: immer 0 — Block laeuft via JSON, nicht Exit-Code.

set -euo pipefail

# Override-Env-Var: wenn gesetzt, sofort raus.
if [[ "${CUBETRACKER_ALLOW_DIRTY_TAG:-}" == "1" ]]; then
  exit 0
fi

# Repo-Root aus Env, mit Fallback auf cwd.
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Kein Git-Repo: stumm raus.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

input="$(cat)"
command="$(echo "$input" | sed -n 's/.*"command":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Nur `git tag` ueberhaupt interessiert uns.
case "$command" in
  *"git tag"*) ;;
  *) exit 0 ;;
esac

# Tag-Listing / -Deletion / -Verify sind harmlos (kein Commit-Bezug) -> durchlassen.
case "$command" in
  *"git tag -d"*|*"git tag --delete"*) exit 0 ;;
  *"git tag -v"*|*"git tag --verify"*) exit 0 ;;
  *"git tag -l"*|*"git tag --list"*|*"git tag -n"*) exit 0 ;;
esac

# Bare `git tag` (Listing ohne Argument) durchlassen: wenn nach "git tag"
# kein Nicht-Whitespace-Token (ausser Shell-Operatoren) folgt, ist es Listing.
rest="${command#*git tag}"
stripped="$(printf '%s' "$rest" | sed 's/^[[:space:]]*//')"
if [[ -z "$stripped" || "$stripped" == "|"* || "$stripped" == "&&"* || "$stripped" == ";"* ]]; then
  exit 0
fi

# === Kern-Check: modifizierte tracked-Files im Working-Tree? ===
# --untracked-files=no blendet scratch/untracked aus (kein Commit-Bezug).
dirty="$(git status --porcelain --untracked-files=no 2>/dev/null || true)"

if [[ -z "$dirty" ]]; then
  # Tree sauber (von tracked-Modifikationen) -> alles gut, durchlassen.
  exit 0
fi

# Dirty -> Misplaced-Tag-Verdacht. Diagnose bauen.
head_line="$(git log -1 --oneline 2>/dev/null || echo '(kein HEAD)')"
dirty_files="$(printf '%s' "$dirty" | sed 's/^/    /' | head -10)"

reason="STOPP: Working-Tree hat modifizierte tracked-Files, aber du willst gerade taggen. "
reason+="Das ist die Misplaced-Tag-Signatur (2x erlebt): wenn ein pre-commit-Hook gerade Files "
reason+="modifiziert und den Commit abgebrochen hat, landet der Tag am FALSCHEN (vorherigen) Commit. "
reason+="HEAD ist aktuell: ${head_line}. "
reason+="Modifizierte Files: $(printf '%s' "$dirty" | tr '\n' ',' | sed 's/,$//' | sed 's/,/ , /g'). "
reason+="-> Verifiziere mit 'git log -1' + 'git status' dass dein gewuenschter Commit wirklich durch ist. "
reason+="Dann committe/stashe die Aenderungen und tagge erneut. "
reason+="Falls du bewusst einen aelteren Commit nachtaggst (Recovery mit -impl-Suffix): "
reason+="setze CUBETRACKER_ALLOW_DIRTY_TAG=1 und ruf den Command erneut auf."

# JSON-Encoding via printf (kein jq-Dependency-Zwang).
escaped="$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g')"

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$escaped"

exit 0

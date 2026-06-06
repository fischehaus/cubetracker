#!/bin/bash
# pre-ask-question-ntfy.sh — PreToolUse-Hook fuer das AskUserQuestion-Tool.
#
# Problem (User-Report 2026-06-06): der ntfy-Push haengt am Stop-Hook
# (stop-ntfy-notify.sh) — der feuert nur am TURN-ENDE. AskUserQuestion ist
# aber ein Tool-Call MITTEN im Turn (Claude wartet blockierend auf den Klick,
# der Turn endet nicht) → Stop feuert nie → kein Push bei Fragen mit
# anklickbaren Antworten. Prosa-Fragen + "fertig" pingen, klickbare nicht.
#
# Fix: dieser Hook feuert per PreToolUse direkt BEVOR die Frage angezeigt wird
# und pingt ntfy mit dem Fragetext + den Optionen.
#
# Inhalt (analog stop-ntfy-notify.sh):
#   - WENN .tmp/last-ntfy-message.txt existiert: deren Inhalt als Body (+
#     optional .tmp/last-ntfy-title.txt als Title). Beide werden NACH dem
#     Senden geloescht (Single-Use) — verhindert auch, dass eine vor einer
#     klickbaren Frage geschriebene Override-Datei spaeter faelschlich vom
#     Stop-Hook wiederverwendet wird.
#   - SONST: Fallback aus dem tool_input (Fragetext + Option-Labels). Damit
#     muss Claude fuer klickbare Fragen NICHTS mehr vorab schreiben.
#
# Topic: jjY2OjY (wie der Stop-Hook). Priority high + Tag "question", damit
# sich Frage-Pushes von "fertig"-Pushes (white_check_mark/default) abheben.
#
# Eingabe (stdin): PreToolUse-JSON mit .tool_input.questions[].
# Ausgabe (stdout): KEINE — sonst koennte Claude Code es als Permission-
#   Decision missdeuten. Der Hook blockiert die Frage nie.
# Exit-Code: immer 0 — Netzwerk-/Parse-Fehler duerfen die Frage nie blocken.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

input="$(cat 2>/dev/null || echo '{}')"

msg_file=".tmp/last-ntfy-message.txt"
title_file=".tmp/last-ntfy-title.txt"

title="Cubetracker — Frage wartet (anklickbar)"
msg=""

if [[ -f "$msg_file" ]]; then
  msg="$(cat "$msg_file" 2>/dev/null || echo '')"
  rm -f "$msg_file"
  if [[ -f "$title_file" ]]; then
    title="$(cat "$title_file" 2>/dev/null || echo "$title")"
    rm -f "$title_file"
  fi
else
  # Fallback: Frage(n) + Optionen aus dem tool_input zusammenbauen.
  msg="$(printf '%s' "$input" | python -c '
import sys, json
try:
    d = json.load(sys.stdin)
    ti = d.get("tool_input") or {}
    qs = ti.get("questions") or d.get("questions") or []
    lines = []
    for q in qs:
        text = (q.get("question") or "").strip()
        opts = [(o.get("label") or "").strip() for o in (q.get("options") or [])]
        opts = [o for o in opts if o]
        if text:
            lines.append(text)
        if opts:
            lines.append("Optionen: " + " / ".join(opts))
    print("\n".join(lines).strip())
except Exception:
    print("")
' 2>/dev/null || echo '')"
  if [[ -z "$msg" ]]; then
    msg="Claude stellt dir eine Frage mit anklickbaren Antworten."
  fi
  # Verwaister Title-Override (ohne Message-Override) aufraeumen.
  [[ -f "$title_file" ]] && rm -f "$title_file"
fi

curl -s --max-time 6 \
  -H "Title: ${title}" \
  -H "Tags: question" \
  -H "Priority: high" \
  -d "${msg}" \
  "https://ntfy.sh/jjY2OjY" >/dev/null 2>&1 || true

exit 0

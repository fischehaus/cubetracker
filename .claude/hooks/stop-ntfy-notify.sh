#!/bin/bash
# stop-ntfy-notify.sh — Stop-Hook: pingt ntfy, wenn Claude fertig ist und auf
# eine User-Eingabe wartet (User-Wunsch 2026-05-20).
#
# Warum als Hook und nicht manuell: manuelle ntfy-Curls gehen bei Kompaktierung
# / Session-Wechsel verloren (Claude "vergisst" die Gewohnheit). Ein Stop-Hook
# feuert deterministisch bei jedem Turn-Ende — ueberlebt Compaction + Modell-
# Wechsel.
#
# Inhalt der Nachricht (seit W.ntfy-format, 2026-05-27):
# - WENN `.tmp/last-ntfy-message.txt` existiert: nutze deren Inhalt als Body.
#   Optional auch `.tmp/last-ntfy-title.txt` fuer den Title. Beide Dateien
#   werden NACH dem Senden geloescht (Single-Use). So kann Claude vor einem
#   Turn-Ende inhaltlichen Status reinschreiben (z.B. nach /abschluss).
# - SONST: mechanischer Fallback aus git-State — HEAD-Subject + Branch +
#   Unpushed-Count. Damit ist die Nachricht NIE generisch "Claude ist fertig",
#   selbst ohne Claude-Override.
#
# Laeuft bei JEDEM Stop (kein "once"), im Gegensatz zu stop-mini-check.sh.
# Topic: jjY2OjY (persoenlich, in ~/.claude/settings.json als trusted endpoint).
#
# Eingabe (stdin): JSON (ignoriert).
# Exit-Code: immer 0 — Netzwerk-Fehler duerfen den Stop nie blockieren.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

msg_file=".tmp/last-ntfy-message.txt"
title_file=".tmp/last-ntfy-title.txt"

# === Inhalt bestimmen: Override-Datei ODER git-State-Fallback ===
if [[ -f "$msg_file" ]]; then
  msg="$(cat "$msg_file")"
  rm -f "$msg_file"
  if [[ -f "$title_file" ]]; then
    title="$(cat "$title_file")"
    rm -f "$title_file"
  else
    title="Cubetracker"
  fi
elif git rev-parse --git-dir >/dev/null 2>&1; then
  # Mechanischer Fallback: HEAD-Subject + Branch + unpushed-count.
  head_sha="$(git log -1 --format=%h 2>/dev/null || echo '?')"
  head_subject="$(git log -1 --format=%s 2>/dev/null || echo '(kein Commit)')"
  branch="$(git branch --show-current 2>/dev/null || echo '?')"
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [[ -n "$upstream" ]]; then
    unpushed="$(git log --oneline "$upstream"..HEAD 2>/dev/null | wc -l | tr -d ' ')"
  else
    unpushed="?"
  fi
  title="Cubetracker · ${head_sha}"
  if [[ "${unpushed:-0}" -gt 0 ]]; then
    msg="${head_subject}"$'\n'"Branch: ${branch} | ⚠️ ${unpushed} unpushed"
  else
    msg="${head_subject}"$'\n'"Branch: ${branch} | alles gepusht"
  fi
else
  # Kein Git-Repo (sollte nicht passieren in cubetracker, aber defensiv).
  title="Cubetracker"
  msg="Claude ist fertig und wartet auf deine Eingabe."
fi

curl -s --max-time 6 \
  -H "Title: ${title}" \
  -H "Tags: white_check_mark" \
  -H "Priority: default" \
  -d "${msg}" \
  "https://ntfy.sh/jjY2OjY" >/dev/null 2>&1 || true

exit 0

#!/bin/bash
# stop-ntfy-notify.sh — Stop-Hook: pingt ntfy, wenn Claude fertig ist und auf
# eine User-Eingabe wartet (User-Wunsch 2026-05-20).
#
# Warum als Hook und nicht manuell: manuelle ntfy-Curls gehen bei Kompaktierung
# / Session-Wechsel verloren (Claude "vergisst" die Gewohnheit). Ein Stop-Hook
# feuert deterministisch bei jedem Turn-Ende — ueberlebt Compaction + Modell-
# Wechsel.
#
# Laeuft bei JEDEM Stop (kein "once"), im Gegensatz zu stop-mini-check.sh.
# Topic: jjY2OjY (persoenlich, in ~/.claude/settings.json als trusted endpoint).
#
# Eingabe (stdin): JSON (ignoriert).
# Exit-Code: immer 0 — Netzwerk-Fehler duerfen den Stop nie blockieren.

set -euo pipefail

curl -s --max-time 6 \
  -H "Title: Cubetracker" \
  -H "Tags: white_check_mark" \
  -H "Priority: default" \
  -d "Claude ist fertig und wartet auf deine Eingabe." \
  "https://ntfy.sh/jjY2OjY" >/dev/null 2>&1 || true

exit 0

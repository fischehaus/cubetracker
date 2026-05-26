#!/bin/bash
# session-start-context.sh — SessionStart-Hook.
#
# Zweck: gegen Mental-Model-Drift. Beim Start einer neuen Claude-Code-
# Session druckt der Hook einen kompakten Repo-Stand, damit Claude sofort
# weiss:
#   1. Cubetracker laeuft live auf cubetracker.de via Coolify (Hetzner) — Auto-Deploy per GitHub-Action bei git push
#   2. Welcher Branch + welche Commits sind im Spiel
#   3. Welche Doku zuerst zu lesen ist
#   4. Ob ungepushte Commits rumlagen (Render sieht die nicht)
#
# Hintergrund: heute (2026-05-16) habe ich am Anfang der Session vergessen,
# dass die App schon deployed ist, und versucht lokale Dev-Server zu starten.
# Plus: 26 ungetaggte Patch-Notes-Versionen lagen rum. Plus: Commits lagen
# 30+ Minuten ungepusht. Dieser Hook gibt am Anfang die Realitaet vor.
#
# Eingabe (stdin): JSON mit session_id + source ("startup"|"resume"|...).
# Ausgabe (stdout): plain text → wird Claude als Kontext mitgegeben.
# Exit-Code: 0.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Wenn wir nicht in einem Git-Repo sind: stumm raus.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Source bestimmen (startup/resume/clear/compact).
input="$(cat || echo '{}')"
source="$(echo "$input" | sed -n 's/.*"source":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Bei `clear` und `compact`: kein Voll-Dump (Lärm-Reduktion mitten in Session).
# Nur bei `startup` und `resume` ist der Context wirklich neu wichtig.
case "${source:-startup}" in
  clear|compact) exit 0 ;;
esac

branch="$(git branch --show-current 2>/dev/null || echo 'unknown')"
remote_url="$(git config --get remote.origin.url 2>/dev/null || echo 'no-remote')"

# Patch-Notes-Aktuell-Version (erster echter version=… im data.py = neueste).
# Skip "2.0.0-alpha.W.X" — das ist nur ein Beispiel im Doc-Block oben.
current_version="$(sed -n 's/.*version="\([^"]*\)".*/\1/p' webapp/changelog/data.py 2>/dev/null \
  | grep -v '^2\.0\.0-alpha\.W\.X$' | head -1 || echo 'unknown')"

# Unpushed commits zaehlen.
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
unpushed_msg=""
if [[ -n "$upstream" ]]; then
  unpushed_count="$(git log --oneline "$upstream"..HEAD 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${unpushed_count:-0}" -gt 0 ]]; then
    unpushed_msg=$'\n⚠️  '"$unpushed_count"' Commit(s) lokal noch nicht gepusht → Render hat sie nicht.'
  fi
fi

# Letzte 5 Commits kompakt.
recent="$(git log --oneline -5 2>/dev/null || echo '(kein log)')"

cat <<EOF
=== Cubetracker — Repo-Stand beim Session-Start ===

Live-App: https://cubetracker.de (Hetzner/Coolify, Auto-Deploy via GitHub-Action bei git push)
Branch: $branch
Remote: $remote_url
Patch-Notes-Version (aktuell): $current_version$unpushed_msg

Letzte 5 Commits:
$recent

📖 Bevor du loslegst, kurz lesen wenn du den aktuellen Stand brauchst:
   - webapp/README.md         (Multi-User-Web-Variante, live auf Hetzner)
   - ROADMAP.md               (Phasen-Historie + offene Items)
   - NEXT_SESSION.md          (Wiederaufnahme-Punkte)
   - webapp/changelog/data.py (alle Patch-Notes seit v1.0.1)

🚨 Reminder (Lessons aus 2026-05-16):
   - Lokale Dev-Server NICHT starten — App ist live. Override via
     CUBETRACKER_ALLOW_LOCAL_DEV=1 wenn du wirklich lokal debuggen willst.
   - Nach Patch-Notes-Eintrag in changelog/data.py: Git-Tag setzen
     (Konvention: v<version-string>) und mit push origin <tag> hochladen.
   - Nach Commits: nicht vergessen zu pushen — Auto-Deploy (GitHub-Action → Coolify)
     triggert nur bei Push, nicht bei Commit.
EOF

exit 0

#!/bin/bash
# session-start-context.sh — SessionStart-Hook (startup|resume|compact|clear).
#
# Zweck: Jede Session (auch nach /compact und /clear) startet mit dem
# Übergabe-Kopf NEXT_SESSION.md im Kontext — nach /compact zählt nur, was in
# Dateien steht. Dazu eine Werkstatt-Zeile (liegengebliebene Änderungen) und
# bei startup/resume der Repo-Stand (Branch, Version, Commits, Issues, Roadmap).
#
# Budget (W.harness-v2, 2026-09-25): Die GESAMTE Ausgabe bleibt unter
# BUDGET Zeichen. Hintergrund: Im SKHO-Harness gemessen (CLI 2.1.233) kappt
# Claude Code Hook-Ausgaben ab ~18.000 Zeichen still auf eine ~1.900-Zeichen-
# Vorschau — die Session startet dann halbblind, ohne es zu merken. Bei
# Überschreitung fallen zuerst Roadmap + Issues weg, erst dann der Kopf
# (dann Lesebefehl + Warnung statt Inhalt).
#
# Netzaufrufe (gh, roadmap-fetch) laufen mit `timeout 3`, damit der Hook
# sein eigenes Timeout nie reißt.
#
# Historie: 2026-05-16 angelegt (Mental-Model-Drift: App ist live).
# Eingabe (stdin): JSON mit "source". Ausgabe: plain text → Kontext. Exit 0.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

BUDGET=10000
KOPF_FILE="${CUBETRACKER_KOPF_FILE:-NEXT_SESSION.md}"  # Override nur für Tests

input="$(cat 2>/dev/null || echo '{}')"
source="$(printf '%s' "$input" | sed -n 's/.*"source":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
source="${source:-startup}"

# --- 1. Übergabe-Kopf --------------------------------------------------------
if [[ -f "$KOPF_FILE" ]]; then
  kopf_block="=== Übergabe-Kopf (NEXT_SESSION.md, maßgeblich für den Stand) ==="$'\n'"$(cat "$KOPF_FILE")"
else
  kopf_block="!!! NEXT_SESSION.md fehlt — Stand vor dem Arbeiten aus docs/session-journal.md (Dateiende) + git log rekonstruieren."
fi

# --- 2. Werkstatt: Liegengebliebenes (>12 h) ---------------------------------
# Ein Python-Lauf statt `stat` je Datei (~45 ms/Datei in Git Bash → Timeout-
# Risiko bei vielen untracked Dateien). Geänderte getrackte Dateien zuerst
# (die eigentliche Warnung, z. B. liegengebliebene WIP), untracked nur
# gebündelt nach Ordner. Gedeckelt auf 2.000 Einträge.
werk_block="$(git -c core.quotePath=false status --porcelain -z -uall 2>/dev/null | python -c '
import os, sys, time
raw = sys.stdin.buffer.read().decode("utf-8", "replace").split("\0")
now, changed, untracked, entries, i = time.time(), [], {}, [], 0
while i < len(raw) and len(entries) < 2000:
    e = raw[i]; i += 1
    if len(e) < 4:
        continue
    code, path = e[:2], e[3:]
    if code[0] in "RC":
        i += 1  # bei -z folgt der Quellpfad einer Umbenennung als eigener Eintrag
    if "D" in code or not os.path.exists(path):
        continue
    try:
        age_h = (now - os.path.getmtime(path)) / 3600
    except OSError:
        continue
    if age_h >= 12:
        entries.append((code, path, age_h))
def fmt(h):
    return "%d d" % (h // 24) if h >= 48 else "%d h" % h
for code, path, h in entries:
    if code == "??":
        top = path.split("/")[0] + ("/" if "/" in path else "")
        n, oldest = untracked.get(top, (0, 0))
        untracked[top] = (n + 1, max(oldest, h))
    else:
        changed.append((h, path))
if not changed and not untracked:
    sys.exit(0)
out = ["🧰 Werkstatt (liegt seit >12 h):"]
if changed:
    changed.sort(reverse=True)
    more = " + %d weitere" % (len(changed) - 5) if len(changed) > 5 else ""
    out.append("   ⚠️ geändert, uncommittet: " + ", ".join("%s (%s)" % (p, fmt(h)) for h, p in changed[:5]) + more)
if untracked:
    total = sum(n for n, _ in untracked.values())
    groups = sorted(untracked.items(), key=lambda kv: -kv[1][0])
    more = " …" if len(groups) > 4 else ""
    out.append("   untracked: %d Datei(en) — %s%s" % (total, ", ".join("%s %d (bis %s)" % (k, n, fmt(h)) for k, (n, h) in groups[:4]), more))
out.append("   Eigene Arbeit? → in NEXT_SESSION unter Offen festhalten bzw. /abschluss (Werkstatt-Check).")
sys.stdout.buffer.write("\n".join(out).encode("utf-8"))
' 2>/dev/null || true)"

# --- 3. Repo-Stand (nur startup/resume) --------------------------------------
repo_block=""
extra_block=""
# CUBETRACKER_HOOK_OFFLINE=1: Start simulieren ohne Netz und ohne Roadmap-
# Snapshot (für die Budget-Probe in /abschluss).
offline="${CUBETRACKER_HOOK_OFFLINE:-}"
if [[ "$source" == "startup" || "$source" == "resume" || "$offline" == "1" ]]; then
  branch="$(git branch --show-current 2>/dev/null || echo '?')"
  current_version="$( (cd webapp 2>/dev/null && timeout 5 python -c 'from changelog.data import current_version; print(current_version())' 2>/dev/null) || echo '?')"
  unpushed_msg=""
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [[ -n "$upstream" ]]; then
    n="$(git log --oneline "$upstream"..HEAD 2>/dev/null | wc -l | tr -d ' ')"
    (( ${n:-0} > 0 )) && unpushed_msg=$'\n'"⚠️  ${n} Commit(s) lokal ungepusht → nicht live."
  fi
  recent="$(git log --oneline -5 2>/dev/null)"
  repo_block="=== Repo-Stand (${source}) ===
Live: https://cubetracker.de (Hetzner/Coolify; Auto-Deploy der geänderten App bei Push)
Branch: ${branch} · Patch-Notes-Version: ${current_version}${unpushed_msg}
Letzte Commits:
${recent}
Reminder: keine lokalen Dev-Server (App ist live) · nach Patch-Note Tag setzen + pushen.
Maßgeblich: CLAUDE.md (Session-Workflow, Antwortformat)."

  # Issues + Roadmap: verzichtbar, fallen bei Budget-Druck zuerst weg.
  # Übersprungen offline oder wenn der Hook schon > 8 s läuft (Timeout 20 s;
  # reißt der Hook sein Timeout, verwirft Claude Code die GANZE Ausgabe).
  if [[ "$offline" != "1" ]] && (( SECONDS <= 8 )) && command -v gh >/dev/null 2>&1; then
    issues="$(timeout 3 gh issue list --state open --limit 5 --json number,title \
      --template '{{range .}}  #{{.number}}: {{.title}}{{"\n"}}{{end}}' 2>/dev/null || true)"
    [[ -n "$issues" ]] && extra_block+=$'\n'"🐛 Offene GitHub-Issues (max. 5):"$'\n'"${issues}"
  fi
  if [[ "$offline" != "1" ]] && (( SECONDS <= 8 )); then
    roadmap_out="$(timeout 3 python .claude/hooks/roadmap-fetch.py --brief --update-snapshot 2>/dev/null || true)"
    [[ -n "$roadmap_out" ]] && extra_block+=$'\n'"${roadmap_out}"
  fi
  extra_block+=$'\n'"💬 Admin-Feedback-Inbox vor neuer Welle prüfen (App → Verwaltung → Admin → Feedback-Inbox)."
fi

# --- Budget ------------------------------------------------------------------
assemble() { printf '%s\n\n%s\n\n%s\n%s\n' "$kopf_block" "$werk_block" "$repo_block" "$extra_block"; }
out="$(assemble)"
if (( ${#out} > BUDGET )) && [[ -n "$extra_block" ]]; then
  extra_block="(Issues/Roadmap weggelassen: Hook-Budget ${BUDGET} Zeichen — bei Bedarf /roadmap.)"
  out="$(assemble)"
fi
if (( ${#out} > BUDGET )); then
  kopf_len=${#kopf_block}
  kopf_block="!!! NEXT_SESSION.md NICHT geladen: die Hook-Ausgabe wäre ${#out} Zeichen (Budget ${BUDGET}; Kopf allein ${kopf_len}). Ab ~18.000 Zeichen kappt der Harness still auf ~1.900. JETZT per Read vollständig lesen: NEXT_SESSION.md — danach kürzen (Verlauf → docs/session-journal.md, Regeln → CLAUDE.md)."
  out="$(assemble)"
fi

printf '%s\n' "$out"
exit 0

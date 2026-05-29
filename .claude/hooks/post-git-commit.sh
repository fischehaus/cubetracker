#!/bin/bash
# post-git-commit.sh — PostToolUse-Hook fuer Bash-Aufrufe von `git commit`.
#
# Zweck:
#   1. Warnen wenn der frisch erzeugte Commit noch nicht gepusht ist
#      (heute haben 3 Welle-Commits unbemerkt rumlagen → Render hat
#      nichts ausgerollt bis ich's gemerkt habe).
#   2. Vorschlagen einen Git-Tag zu setzen, wenn der Commit einen neuen
#      Patch-Notes-Eintrag in `webapp/changelog/data.py` hinzugefuegt hat
#      (Pflicht-Konvention seit heute — 26 Tags lagen ungetaggt rum).
#
# Eingabe (stdin): JSON mit tool_input + tool_response (vom Bash-Tool).
# Ausgabe (stdout): JSON mit hookSpecificOutput.additionalContext, oder leer.
# Exit-Codes: 0 = OK (auch wenn nichts zu warnen ist).

set -euo pipefail

# Repo-Root aus Env, mit Fallback auf cwd. Hook laeuft im Projekt-Root.
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Falls wir nicht in einem Git-Repo sind: stumm raus.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Falls der letzte Tool-Call kein "git commit" war: stumm raus.
# (Matcher in settings.json filtert schon — aber defensive Sicherung,
#  weil das Skript bei manuellem Test auch sauber tun soll.)
input="$(cat)"
command="$(echo "$input" | sed -n 's/.*"command":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Sammeln was wir warnen wollen.
notes=""

# === Check 1: Unpushed Commits ===
# Fallback wenn kein Upstream gesetzt: skip (z.B. neuer Branch).
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -n "$upstream" ]]; then
  unpushed_count="$(git log --oneline "$upstream"..HEAD 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${unpushed_count:-0}" -gt 0 ]]; then
    notes+="⚠️ ${unpushed_count} unpushed commit(s) auf $(git branch --show-current). "
    notes+="Coolify-Auto-Deploy triggert erst beim Push. → \`git push\` wenn fertig.\n"
  fi
fi

# === Check 2: Neuer Patch-Notes-Eintrag → Tag-Reminder ===
# Wir checken, ob HEAD den changelog/data.py geaendert hat UND eine neue
# Version-Zeile addiert wurde. Wenn ja: extrahiere Version + schlage Tag vor.
if git diff-tree --no-commit-id --name-only HEAD 2>/dev/null | grep -q "changelog/data.py"; then
  new_versions="$(git diff-tree HEAD --unified=0 -- webapp/changelog/data.py 2>/dev/null \
    | grep -E '^\+\s*version="' \
    | sed -n 's/.*version="\([^"]*\)".*/\1/p' || true)"
  if [[ -n "$new_versions" ]]; then
    while IFS= read -r v; do
      tag="v${v}"
      if git rev-parse "$tag" >/dev/null 2>&1; then
        notes+="ℹ️ Patch-Notes-Version ${v}: Tag ${tag} existiert bereits.\n"
      else
        notes+="🏷  Patch-Notes-Version ${v}: Tag fehlt. → \`git tag -a ${tag} -m \"...\" HEAD && git push origin ${tag}\`\n"
      fi
    done <<< "$new_versions"
  fi
fi

# === Check 3: feat/fix-Commit ohne Patch-Notes-Eintrag ===
# Schliesst die Luecke: bisher wurde nur an Tags erinnert (wenn data.py
# geaendert wurde), aber NICHT wenn ein feat/fix-Commit den Patch-Note
# ganz vergessen hat. Heuristik ueber die Commit-Message (feat(/fix() ->
# wenig False-Positives (chore/docs/refactor loesen nichts aus).
subject="$(git log -1 --format=%s HEAD 2>/dev/null || true)"
if echo "$subject" | grep -qE '^(feat|fix)[(:]'; then
  if ! git diff-tree --no-commit-id --name-only HEAD 2>/dev/null | grep -q "changelog/data.py"; then
    notes+="📝 feat/fix-Commit ohne neuen Patch-Notes-Eintrag (webapp/changelog/data.py). "
    notes+="Konvention: jeder feat/fix braucht einen PatchNote (oben einfuegen) — sonst "
    notes+="haengt das Versions-Badge hinterher. Bei erledigten Roadmap-Items zusaetzlich "
    notes+="in webapp/frontend/src/lib/roadmap-data.ts done:true setzen.\n"
  fi
fi

# === Check 4: User-facing feat-Commit ohne features-data.ts-Update ===
# Schliesst die zweite Doku-Luecke (siehe Feature-Audit 2026-05-29):
# nicht jeder feat()-Commit wird in der Marketing-Feature-Liste
# (features-data.ts + features.*-Locales) nachgezogen. Resultat: das
# "Was kann diese App?"-Modal verpasst neue Features ueber Wochen.
#
# Heuristik: nur fuer `feat(W.<name>)`-Commits, bei denen <name> NICHT
# auf einen reinen Backstage-Pattern matched (qa, fix, hardening,
# tsbuild, deps, deploy-fix, hotfix, ...). Diese sind erfahrungsgemaess
# Backstage und brauchen kein Marketing-Bullet.
if echo "$subject" | grep -qE '^feat\('; then
  welle_name="$(echo "$subject" | sed -n 's/^feat(\([^)]*\)).*/\1/p')"
  # NUR ueberspringen wenn der Name eindeutig backstage ist.
  backstage_pattern='(^|-)(qa|hardening|tsbuild|deps|deploy-fix|hotfix|build-fix|ci|tooling|chore-fix|jsonfix|hidden|internal|migration)(-|$)'
  if ! echo "$welle_name" | grep -qE "$backstage_pattern"; then
    changed="$(git diff-tree --no-commit-id --name-only HEAD 2>/dev/null || true)"
    if ! echo "$changed" | grep -qE 'features-data\.ts|features-data\.tsx'; then
      # Locale-Diff zaehlt auch — manchmal genuegen neue features.*-Keys.
      features_locale_changed="$(git diff-tree --unified=0 HEAD -- 'webapp/frontend/src/i18n/locales/*.json' 2>/dev/null \
        | grep -cE '^\+\s*"features\.' || true)"
      if [[ "${features_locale_changed:-0}" -eq 0 ]]; then
        notes+="📋 User-facing feat-Welle ohne features-data.ts-Update (\`${welle_name}\`). "
        notes+="Konvention: jede User-facing Welle braucht einen Marketing-Bullet — "
        notes+="entweder einen neuen \`features.*Bullet*\`-Key in DE+EN-Locales + "
        notes+="den Key in webapp/frontend/src/lib/features-data.ts:CATEGORY_DEFS "
        notes+="adden, ODER pruefen ob ein bestehender Bullet das Feature abdeckt. "
        notes+="Backstage-Wellen (qa, fix, tsbuild, deps, hotfix, ...) sind okay zu skippen.\n"
      fi
    fi
  fi
fi

# === Output ===
if [[ -z "$notes" ]]; then
  # Nichts zu warnen: stumm raus (keinen Noise erzeugen).
  exit 0
fi

# JSON-Encoding via printf (kein jq-Dependency-Zwang).
# Newlines via \n in der JSON-String-Value behalten.
escaped="$(printf '%s' "$notes" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')"

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$escaped"

exit 0

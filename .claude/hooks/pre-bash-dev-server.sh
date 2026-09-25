#!/bin/bash
# pre-bash-dev-server.sh — PreToolUse-Hook für Bash: blockiert lokale
# Dev-Server-Starts (uvicorn, npm/yarn/pnpm dev|start|preview, vite dev/serve/preview).
#
# Hintergrund (2026-05-16): Cubetracker läuft live auf cubetracker.de
# (Hetzner/Coolify, Auto-Deploy bei Push). Lokale Dev-Server waren fast immer
# ein Mental-Model-Fehler („ich teste lokal") statt echtem Debugging.
#
# W.harness-v2 (2026-09-25): Geprüft wird JE BEFEHLSSEGMENT (getrennt an &&,
# ||, ;, |, &, Zeilenumbruch; Klammern entfernt; `bash -c "…"` rekursiv) und
# nur das AUSGEFÜHRTE Programm (Wrapper wie npx, nohup, timeout N, env, FOO=1
# und Optionen wie `npm --prefix X`, `python -X utf8` werden übersprungen).
# Vorher traf das Glob-Muster *vite* auch `npx vitest` (reiner Testlauf).
# Testmatrix: .claude/hooks/tests/test_pre_bash_dev_server.py
#
# Override: CUBETRACKER_ALLOW_LOCAL_DEV=1 in der Env → blockt nichts.
# Eingabe: PreToolUse-JSON (tool_input.command). Ausgabe: deny-JSON oder leer.
# Exit-Code: immer 0 (fail-open) — Block läuft über JSON.

set -uo pipefail

[[ "${CUBETRACKER_ALLOW_LOCAL_DEV:-}" == "1" ]] && exit 0

input="$(cat)"

# Fast-Path ohne Python-Start: kein Kandidatenwort → sofort durch.
case "$input" in
  *uvicorn*|*vite*|*npm*|*yarn*|*pnpm*) ;;
  *) exit 0 ;;
esac

printf '%s' "$input" | python -c '
import json, re, shlex, sys

try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "") or ""
except Exception:
    sys.exit(0)

WRAPPERS = {"npx", "exec", "env", "sudo", "time", "nohup", "command"}
OPT_WITH_VALUE = {"--prefix", "-C", "--dir", "--cwd", "-w", "--workspace", "--filter"}

def split_segments(s):
    s = re.sub(r"[(){}]", " ", s)
    return [p.strip() for p in re.split(r"&&|\|\||;|\||&|\n", s) if p.strip()]

def is_dev_server(seg, depth=0):
    try:
        words = shlex.split(seg, posix=True)
    except ValueError:
        words = seg.split()
    while words:
        w = words[0]
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w) or w in WRAPPERS:
            words = words[1:]
        elif w == "timeout":
            words = words[1:]
            while words and (words[0].startswith("-") or re.match(r"^\d+(\.\d+)?[smhd]?$", words[0])):
                words = words[1:]
        elif w.startswith("-"):
            words = words[1:]  # Flag eines Wrappers (z. B. npx --yes)
        else:
            break
    if not words:
        return False
    prog = re.split(r"[\\/]", words[0])[-1].lower()
    prog = re.sub(r"\.(exe|cmd|bat)$", "", prog)
    args = words[1:]
    if prog in ("bash", "sh", "zsh") and len(args) >= 2 and args[0] == "-c" and depth < 3:
        return any(is_dev_server(s, depth + 1) for s in split_segments(args[1]))
    if prog == "uvicorn":
        return True
    if prog.startswith("python") or prog == "py":
        i = 0
        while i < len(args) and args[i] != "-m":
            i += 2 if args[i] in ("-X", "-W") else 1
        return i + 1 < len(args) and args[i + 1] == "uvicorn"
    if prog == "node":
        return bool(args) and re.search(r"(^|[\\/])vite([\\/]bin[\\/]vite\.js)?$", args[0]) is not None
    if prog in ("npm", "yarn", "pnpm"):
        rest, i = [], 0
        while i < len(args):
            a = args[i]
            if a in OPT_WITH_VALUE:
                i += 2
                continue
            if not a.startswith("-"):
                rest.append(a)
            i += 1
        rest = [a for a in rest if a != "run"]
        return bool(rest) and rest[0] in ("dev", "start", "preview", "serve")
    if prog == "vite":
        return not args or args[0] in ("dev", "serve", "preview") or args[0].startswith("-")
    return False

if any(is_dev_server(s) for s in split_segments(cmd)):
    reason = ("Lokaler Dev-Server blockiert: Cubetracker laeuft live auf https://cubetracker.de "
              "(Hetzner/Coolify, Auto-Deploy bei Push). Tests (npm test, vitest, pytest) und Builds "
              "laufen normal. Echtes lokales Debugging: CUBETRACKER_ALLOW_LOCAL_DEV=1 setzen und erneut "
              "aufrufen. Massgeblich: CLAUDE.md -> Umgebung & Tooling; Hook .claude/hooks/pre-bash-dev-server.sh.")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                      "permissionDecision": "deny", "permissionDecisionReason": reason}}, ensure_ascii=True))
' 2>/dev/null

exit 0

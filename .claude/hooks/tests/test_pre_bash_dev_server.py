"""Testmatrix für .claude/hooks/pre-bash-dev-server.sh (W.harness-v2, 2026-09-25).

Aufruf aus dem Repo-Root (Ausgabe umleiten, Exit-Code nicht hinter einer Pipe werten):
    python .claude/hooks/tests/test_pre_bash_dev_server.py > .tmp/devhook.txt 2>&1; echo "RC=$?"
Anderen Hook-Stand testen: HOOK_UNDER_TEST=<pfad> setzen.
"""
import json
import os
import subprocess
import sys

HOOK = os.environ.get(
    "HOOK_UNDER_TEST",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pre-bash-dev-server.sh"),
)

BLOCK = [
    "uvicorn main:app --reload",
    "python -m uvicorn main:app",
    "python -X utf8 -m uvicorn main:app",
    "cd webapp && .venv/Scripts/python.exe -m uvicorn main:app --port 8000",
    "npm run dev",
    "cd webapp/frontend && npm run dev",
    "(cd webapp/frontend && npm run dev)",
    "npm --prefix webapp/frontend run dev",
    "pnpm -C webapp/frontend dev",
    'bash -c "npm run dev"',
    "nohup npm run dev &",
    "timeout 60 npm run dev",
    "sleep 1 & npm run dev",
    "npx vite",
    "npx --yes vite",
    "npx vite --port 5173",
    "vite",
    "vite preview",
    "node node_modules/vite/bin/vite.js",
    "FOO=1 npm run dev",
    "yarn dev",
    "pnpm dev",
    'echo "x" ; npm start',
]
ALLOW = [
    "npx vitest run src/lib/puzzle-net.test.ts",
    "npm test -- --run src/lib/puzzle-net.test.ts",
    "npx vite build",
    "npm run build",
    "npm --prefix webapp/frontend run build",
    "grep -n uvicorn webapp/Dockerfile",
    "cat webapp/frontend/vite.config.ts",
    "echo vite",
    "git log --grep=vite --oneline",
    "pip install uvicorn",
    'git commit -m "fix: npm run dev im README erklaert"',
    "ls webapp/frontend/src/dev-tools 2>&1",
    "npm install",
    "timeout 30 npm test",
]


def run(cmd, allow_env=False):
    env = dict(os.environ)
    env.pop("CUBETRACKER_ALLOW_LOCAL_DEV", None)
    if allow_env:
        env["CUBETRACKER_ALLOW_LOCAL_DEV"] = "1"
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": cmd}})
    r = subprocess.run(["bash", HOOK], input=payload, capture_output=True, text=True,
                       encoding="utf-8", env=env)
    return r.returncode, r.stdout.strip()


def main():
    fails = 0
    for c in BLOCK:
        rc, out = run(c)
        ok = rc == 0 and '"deny"' in out
        fails += not ok
        print(("OK   " if ok else "FAIL ") + "block    | " + c)
    for c in ALLOW:
        rc, out = run(c)
        ok = rc == 0 and out == ""
        fails += not ok
        print(("OK   " if ok else "FAIL ") + "allow    | " + c + ("" if ok else "  -> " + out[:100]))
    rc, out = run("npm run dev", allow_env=True)
    ok = rc == 0 and out == ""
    fails += not ok
    print(("OK   " if ok else "FAIL ") + "override | npm run dev")
    total = len(BLOCK) + len(ALLOW) + 1
    print(f"{total - fails}/{total} gruen, FAILS={fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

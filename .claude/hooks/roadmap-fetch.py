#!/usr/bin/env python3
"""Roadmap-Fetch — holt die Live-Roadmap inkl. interner Items.

Liest den Admin-Access-Token aus `.tmp/admin-token` (gitignored) und ruft
`GET /api/roadmap` mit `Authorization: Bearer <token>` auf. Mit Admin-Token
liefert der Endpoint ALLE Items (auch internal=True).

Zwei Diffs:
  1. Snapshot-Diff (`.tmp/roadmap-snapshot.json`): welche Items sind NEU
     seit dem letzten `--update-snapshot`-Lauf (= seit letztem Session-Start)?
  2. Code-Seed-Diff: welche Live-Items stehen NICHT in webapp/seeds/roadmap.py
     (= vom Admin im Panel angelegt). Die gehen bei einem DB-Wipe verloren,
     wenn sie nicht in den Seed wandern.

Genutzt von:
  - .claude/hooks/session-start-context.sh   (--brief --update-snapshot)
  - .claude/commands/roadmap.md (/roadmap)    (voll, ohne Snapshot-Update)

Token holen: als Admin auf cubetracker.de einloggen, in den Browser-DevTools
unter Application -> Local Storage -> Key `cubetracker_access_token` den Wert
kopieren und in `.tmp/admin-token` ablegen. Access-Token sind kurzlebig —
bei 401 (abgelaufen) einfach neu kopieren.

Exit-Code immer 0 (darf den Session-Start-Hook nie abbrechen).
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict

# Windows-Konsolen defaulten auf cp1252 — Emojis im Output wuerden sonst mit
# UnicodeEncodeError crashen. UTF-8 erzwingen (no-op auf Linux/bereits-utf8).
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
except Exception:  # noqa: BLE001
    pass

BRIEF = "--brief" in sys.argv
UPDATE_SNAPSHOT = "--update-snapshot" in sys.argv
# --mark-done "<title_de>" ["<title_de>" ...]: setzt die genannten Roadmap-
# Items auf status="done" (PATCH, braucht Admin-Token). Titel exakt wie
# title_de. Wird nach Abschluss eines Roadmap-Items aufgerufen.
_MARK_IDX = sys.argv.index("--mark-done") if "--mark-done" in sys.argv else -1
MARK_DONE_TITLES = (
    [a for a in sys.argv[_MARK_IDX + 1:] if not a.startswith("--")]
    if _MARK_IDX >= 0
    else []
)

PROJECT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
# Kanonisch ist `.tmp/admin-token` (ohne Endung). Windows-Editoren (Notepad
# etc.) haengen aber gern .txt/.md an — beide als Fallback akzeptieren, damit
# der Token-Setup nicht an der Datei-Endung scheitert.
TOKEN_CANDIDATES = [
    os.path.join(PROJECT, ".tmp", "admin-token"),
    os.path.join(PROJECT, ".tmp", "admin-token.txt"),
    os.path.join(PROJECT, ".tmp", "admin-token.md"),
]
SNAP_FILE = os.path.join(PROJECT, ".tmp", "roadmap-snapshot.json")
SEED_FILE = os.path.join(PROJECT, "webapp", "seeds", "roadmap.py")
API_BASE = "https://www.cubetracker.de/api"
API_URL = f"{API_BASE}/roadmap"

SETUP_HINT = (
    "   Token holen: als Admin auf cubetracker.de einloggen → DevTools →\n"
    "   Application → Local Storage → `cubetracker_access_token` kopieren →\n"
    "   in .tmp/admin-token ablegen (gitignored). Manuell jederzeit: /roadmap"
)


def read_token() -> str | None:
    for path in TOKEN_CANDIDATES:
        try:
            with open(path, encoding="utf-8") as fh:
                tok = fh.read().strip()
        except FileNotFoundError:
            continue
        if tok:
            return tok
    return None


def fetch_roadmap(token: str) -> dict:
    req = urllib.request.Request(
        API_URL, headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode("utf-8"))


def patch_item_status(token: str, item_id: int, new_status: str) -> int:
    """PATCH /admin/roadmap/items/{id} — setzt status. Braucht Admin-Token."""
    body = json.dumps({"status": new_status}).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/admin/roadmap/items/{item_id}",
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        return resp.status


def seed_titles() -> set[str]:
    """title_de-Werte aus dem Code-Seed (regex, ohne Modul-Import)."""
    try:
        with open(SEED_FILE, encoding="utf-8") as fh:
            txt = fh.read()
    except FileNotFoundError:
        return set()
    return set(re.findall(r'"title_de":\s*"((?:[^"\\]|\\.)*)"', txt))


def load_prev_ids() -> set[int]:
    try:
        with open(SNAP_FILE, encoding="utf-8") as fh:
            return {it["id"] for it in json.load(fh).get("items", [])}
    except (FileNotFoundError, ValueError, KeyError):
        return set()


def save_snapshot(items: list[dict]) -> None:
    try:
        os.makedirs(os.path.dirname(SNAP_FILE), exist_ok=True)
        with open(SNAP_FILE, "w", encoding="utf-8") as fh:
            json.dump(
                {"items": [{"id": it["id"], "title_de": it["title_de"]} for it in items]},
                fh,
            )
    except OSError:
        pass


def main() -> int:
    token = read_token()
    if not token:
        print("🗺️  Roadmap-Abruf übersprungen — keine .tmp/admin-token-Datei.")
        print(SETUP_HINT)
        return 0

    try:
        data = fetch_roadmap(token)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            print(
                "🗺️  Roadmap-Abruf: Token abgelaufen/ungültig (HTTP "
                f"{exc.code}). Neuen `cubetracker_access_token` aus dem "
                "Browser-localStorage in .tmp/admin-token legen."
            )
        else:
            print(f"🗺️  Roadmap-Abruf fehlgeschlagen (HTTP {exc.code}).")
        return 0
    except Exception as exc:  # noqa: BLE001 — Hook darf nie crashen
        print(f"🗺️  Roadmap-Abruf fehlgeschlagen ({type(exc).__name__}).")
        return 0

    items = data.get("items", [])
    is_admin = bool(data.get("is_admin"))

    # --mark-done: genannte Items auf status="done" setzen (Admin-only).
    if MARK_DONE_TITLES:
        if not is_admin:
            print(
                "⚠ Token ist kein Admin (oder abgelaufen) — kann keine Items "
                "auf done setzen. Frischen cubetracker_access_token in "
                ".tmp/admin-token legen."
            )
            return 0
        by_title = {it["title_de"]: it for it in items}
        for title in MARK_DONE_TITLES:
            it = by_title.get(title)
            if it is None:
                print(f"  ? nicht gefunden: {title!r}")
            elif it.get("status") == "done":
                print(f"  = schon done: {title}")
            else:
                try:
                    patch_item_status(token, it["id"], "done")
                    print(f"  ✓ done gesetzt: {title}")
                except Exception as exc:  # noqa: BLE001
                    print(f"  ✗ Fehler ({type(exc).__name__}): {title}")
        return 0

    prev_ids = load_prev_ids()
    cur_ids = {it["id"] for it in items}
    new_items = (
        [it for it in items if it["id"] not in prev_ids] if prev_ids else []
    )
    seeds = seed_titles()
    live_only = [it for it in items if it["title_de"] not in seeds] if seeds else []

    vis = "Admin, inkl. intern" if is_admin else "⚠ nur öffentlich (Token kein Admin?)"
    print(f"🗺️  Live-Roadmap: {len(items)} Items ({vis})")

    if prev_ids and new_items:
        print(f"🆕 {len(new_items)} NEU seit letztem Session-Start:")
        for it in new_items:
            print(f"   + [{it['phase_id']}] {it['title_de']}")

    if live_only:
        print(
            f"📌 {len(live_only)} Item(s) nur live (im Admin-Panel angelegt, "
            "NICHT im Code-Seed) — gehen bei DB-Wipe verloren:"
        )
        for it in live_only:
            print(f"   • [{it['phase_id']}] {it['title_de']}")
        print("   → ggf. in webapp/seeds/roadmap.py aufnehmen.")

    if not BRIEF:
        by_phase: dict[str, list[dict]] = defaultdict(list)
        for it in items:
            by_phase[it["phase_id"]].append(it)
        for phase in sorted(by_phase):
            rows = sorted(by_phase[phase], key=lambda x: (x["sort_order"], x["id"]))
            print(f"\n── {phase} ({len(rows)}) ──")
            for it in rows:
                flags = []
                if it.get("internal"):
                    flags.append("intern")
                if it.get("status") == "done":
                    flags.append("✓done")
                fl = f"  [{', '.join(flags)}]" if flags else ""
                eff = f"  ({it['effort']})" if it.get("effort") else ""
                print(f"  {it['sort_order']:>3} {it['title_de']}{eff}{fl}")

    if BRIEF:
        if not (new_items or live_only):
            print("   (keine neuen Items seit letztem Start)")
        print('   → Frag den User wie es weitergeht, oder /roadmap für Details.')

    if UPDATE_SNAPSHOT:
        save_snapshot(items)

    return 0


if __name__ == "__main__":
    sys.exit(main())

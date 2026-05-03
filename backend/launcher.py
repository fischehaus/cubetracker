"""cubetracker — Launcher fuer die ausgerollte App (Phase 9).

Wird vom PyInstaller-Bundle als Entry-Point gestartet:
1. Setzt CUBETRACKER_PROD=1 damit main.py den Production-Mode erkennt
2. Sucht einen freien Port (Default 8765, faellt durch falls belegt)
3. Startet uvicorn in-process (ohne reload)
4. Oeffnet den System-Default-Browser auf http://127.0.0.1:<port>/

Sauberer Shutdown via Ctrl+C oder Tray-Close (TODO: Tray-Icon spaeter).
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser

import uvicorn


def _find_free_port(preferred: int, fallback_range: int = 100) -> int:
    """Probiert preferred-Port + bis zu N folgende. Liefert ersten freien."""
    for port in range(preferred, preferred + fallback_range):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(
        f"Kein freier Port im Bereich {preferred}..{preferred + fallback_range} gefunden."
    )


def _open_browser_after_delay(url: str, delay_s: float = 1.5) -> None:
    """Wartet bis uvicorn ready ist, dann oeffnet den Browser."""
    time.sleep(delay_s)
    try:
        webbrowser.open(url, new=2)
    except Exception as e:  # noqa: BLE001
        print(f"WARN: konnte Browser nicht oeffnen: {e}")
        print(f"      bitte manuell {url} aufrufen")


def main() -> None:
    # Mode-flag setzen — main.py liest das + DB-Pfad-Resolution wechselt
    # auf %LOCALAPPDATA%\cubetracker\solves.db
    os.environ["CUBETRACKER_PROD"] = "1"

    port = int(os.environ.get("CUBETRACKER_PORT", "0")) or _find_free_port(8765)
    url = f"http://127.0.0.1:{port}/"

    print("=" * 60)
    print(f"cubetracker — startet auf {url}")
    print("=" * 60)
    print(
        "Browser wird automatisch geoeffnet. " "Zum Beenden: dieses Fenster schliessen oder Ctrl+C."
    )

    # Import erst NACH env-set, damit main.py den Mode korrekt detected
    # (PyInstaller braucht direktes app-Objekt, kein Modul-String).
    from main import app  # noqa: PLC0415

    # CUBETRACKER_NO_BROWSER=1 verhindert Auto-Open — fuer Smoke-Tests
    if os.environ.get("CUBETRACKER_NO_BROWSER") != "1":
        threading.Thread(target=_open_browser_after_delay, args=(url,), daemon=True).start()
    else:
        print("(Browser-Open via CUBETRACKER_NO_BROWSER=1 unterdrueckt)")

    # uvicorn ohne reload (PyInstaller-Bundle), app-Objekt direkt uebergeben
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    sys.exit(main() or 0)

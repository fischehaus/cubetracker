"""Auth-Konfig (Phase W) — Settings aus Environment-Variables.

In Production: Render setzt JWT_SECRET als secret env var.
Lokal: kann via .env-File oder Default-Wert (NUR für Tests) genutzt werden.
"""

from __future__ import annotations

import os
import secrets

# ============================================================
# Settings — aus Env mit Defaults (Defaults NUR für Local-Dev)
# ============================================================

# WARNUNG: Default ist ein zufaelliger Per-Process-Secret. In Prod
# MUSS JWT_SECRET via Env gesetzt werden, sonst werden Tokens beim
# Server-Restart ungueltig (alle User ausgeloggt).
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(64))
# WARNUNG: Algorithm BEWUSST hardcoded. NICHT aus Env lesen — ein Angreifer
# der Env-Vars setzen kann, könnte sonst "none" einsetzen und damit alle
# Token-Validierungen umgehen. (Security-Finding #5)
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRE_MIN = int(os.getenv("JWT_ACCESS_EXPIRE_MIN", "15"))
JWT_REFRESH_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "30"))

# Cookie-Settings für Refresh-Token (HttpOnly, in Prod: Secure)
REFRESH_COOKIE_NAME = "cubetracker_refresh"
REFRESH_COOKIE_PATH = "/auth"  # nur an /auth/* geschickt

# Production-Mode-Detection (für secure-cookies + andere Defaults)
IS_PROD = os.getenv("CUBETRACKER_PROD") == "1"

# Mindest-Passwort-Laenge — bewusst niedrig für Solo-Tool, kein Bank-System.
PASSWORD_MIN_LEN = 8


def require_strong_secret() -> None:
    """Bei Prod-Start sicherstellen dass JWT_SECRET aus Env kommt
    und nicht der Per-Process-Default ist. Aufruf in main.py-Lifespan.
    """
    if IS_PROD and not os.getenv("JWT_SECRET"):
        raise RuntimeError(
            "JWT_SECRET ist nicht in der Environment gesetzt — "
            "Production-Modus erfordert ein persistentes Secret."
        )

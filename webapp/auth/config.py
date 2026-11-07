"""Auth-Konfig (Phase W) — Settings aus Environment-Variables.

In Production: Coolify (Hetzner) setzt JWT_SECRET als secret env var.
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
# Server-Restart ungültig (alle User ausgeloggt).
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(64))
# WARNUNG: Algorithm BEWUSST hardcoded. NICHT aus Env lesen — ein Angreifer
# der Env-Vars setzen kann, könnte sonst "none" einsetzen und damit alle
# Token-Validierungen umgehen. (Security-Finding #5)
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRE_MIN = int(os.getenv("JWT_ACCESS_EXPIRE_MIN", "15"))
JWT_REFRESH_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "30"))

# Cookie-Settings für Refresh-Token (HttpOnly, in Prod: Secure)
REFRESH_COOKIE_NAME = "cubetracker_refresh"
REFRESH_COOKIE_PATH = "/api/auth"  # nur an /api/auth/* geschickt (W.api-prefix)

# Production-Mode-Detection (für secure-cookies + andere Defaults)
IS_PROD = os.getenv("CUBETRACKER_PROD") == "1"

# Mindest-Passwort-Länge — bewusst niedrig für Solo-Tool, kein Bank-System.
PASSWORD_MIN_LEN = 8

# Mindestlänge des JWT-Secrets in Prod (HS256, PyJWT-Empfehlung).
JWT_SECRET_MIN_LEN = 32


def require_strong_secret() -> None:
    """Bei Prod-Start sicherstellen dass JWT_SECRET aus Env kommt
    und nicht der Per-Process-Default ist. Aufruf in main.py-Lifespan.
    """
    if not IS_PROD:
        return
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET ist nicht in der Environment gesetzt — "
            "Production-Modus erfordert ein persistentes Secret."
        )
    # W.jwt-secret-length (2026-11-07): PyJWT empfiehlt für HS256 >= 32 Byte.
    # Fehlermeldung nennt nur die Mindestlänge, nie den Wert.
    if len(secret.encode("utf-8")) < JWT_SECRET_MIN_LEN:
        raise RuntimeError(
            f"JWT_SECRET ist zu kurz — Production-Modus erfordert mindestens "
            f"{JWT_SECRET_MIN_LEN} Byte."
        )

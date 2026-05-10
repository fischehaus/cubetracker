"""Auth-Konfig (Phase W) — Settings aus Environment-Variables.

In Production: Render setzt JWT_SECRET als secret env var.
Lokal: kann via .env-File oder Default-Wert (NUR fuer Tests) genutzt werden.
"""

from __future__ import annotations

import os
import secrets

# ============================================================
# Settings — aus Env mit Defaults (Defaults NUR fuer Local-Dev)
# ============================================================

# WARNUNG: Default ist ein zufaelliger Per-Process-Secret. In Prod
# MUSS JWT_SECRET via Env gesetzt werden, sonst werden Tokens beim
# Server-Restart ungueltig (alle User ausgeloggt).
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(64))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRE_MIN = int(os.getenv("JWT_ACCESS_EXPIRE_MIN", "15"))
JWT_REFRESH_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "30"))

# Production-Mode-Detection (fuer secure-cookies + andere Defaults)
IS_PROD = os.getenv("CUBETRACKER_PROD") == "1"

# Mindest-Passwort-Laenge — bewusst niedrig fuer Solo-Tool, kein Bank-System.
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

"""Password-Hashing via bcrypt direkt (kein passlib-Layer).

bcrypt 5.0+ ist nicht mehr passlib-kompatibel — wir nutzen den Lib-API
direkt. Vorteile: weniger Dependencies, klarer Code, keine Maintenance-
Drift zwischen passlib + bcrypt.

Bcrypt-Spec: max 72 Byte Password (stillschweigend abgeschnitten in
aelteren Versionen). Wir machen das explizit via [:72] um konsistentes
Verhalten zwischen Versionen zu garantieren. Fuer normale ASCII-Passwoerter
< 72 Zeichen kein Effekt.
"""

from __future__ import annotations

import bcrypt

# work-factor 12 = ~250ms pro hash auf modernem Server.
_BCRYPT_ROUNDS = 12

# bcrypt-Limit: max 72 Byte. Wir truncaten um konsistent zu sein.
_MAX_PWD_BYTES = 72


def _truncate(plain: str) -> bytes:
    """Konvertiert zu UTF-8-Bytes, truncated auf 72 Byte (bcrypt-Limit)."""
    return plain.encode("utf-8")[:_MAX_PWD_BYTES]


def hash_password(plain: str) -> str:
    """Liefert bcrypt-Hash als string. Salt wird automatisch generiert."""
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(_truncate(plain), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Konstant-zeit-Vergleich (bcrypt intern). Liefert False bei
    invaliden Hashes statt zu crashen.
    """
    try:
        return bcrypt.checkpw(_truncate(plain), hashed.encode("utf-8"))
    except Exception:
        return False

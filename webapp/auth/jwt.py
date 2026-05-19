"""JWT-Token-Erstellung und -Validierung (Phase W).

Zwei Token-Typen:
- Access-Token: kurz (15 min), in Authorization-Header
- Refresh-Token: lang (30 Tage), in HttpOnly-Cookie

Token-Revocation via `ver`-Claim:
Jeder Token trägt das `token_version` des Users zum Ausgabezeitpunkt.
Wird der Wert in der DB hochgezählt (Logout, Password-Change), invalidieren
alle ausgegebenen Tokens dieses Users — der Decode prüft den Wert.

Pure Funktionen + minimaler State — leicht testbar.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import JWTError, jwt

from .config import (
    JWT_ACCESS_EXPIRE_MIN,
    JWT_ALGORITHM,
    JWT_REFRESH_EXPIRE_DAYS,
    JWT_SECRET,
)

TokenType = Literal["access", "refresh"]


def create_token(
    subject: str | int,
    token_type: TokenType,
    token_version: int,
    expires_delta: timedelta | None = None,
) -> str:
    """Liefert einen signierten JWT.

    `subject` ist typischerweise die User-ID. JWT-spec sagt es muss string sein,
    int -> str konvertieren wir automatisch.

    `token_version` ist der aktuelle Wert von User.token_version. Beim Decode
    wird gegen den DB-Wert verglichen — Mismatch = Token revoked.
    """
    if expires_delta is None:
        expires_delta = (
            timedelta(minutes=JWT_ACCESS_EXPIRE_MIN)
            if token_type == "access"
            else timedelta(days=JWT_REFRESH_EXPIRE_DAYS)
        )

    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "ver": token_version,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Validiert + decodiert ein JWT. Wirft `JWTError` bei invalid/expired.

    Wenn `expected_type` gesetzt: zusätzliche Validierung dass der Token-Typ
    passt (verhindert dass jemand einen Refresh-Token als Access nutzt).

    Hinweis: `ver`-Check (Token-Revocation) passiert NICHT hier — der braucht
    den DB-Wert und gehört in die get_current_user-Dependency / Refresh-Endpoint.
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if expected_type is not None:
        token_type = payload.get("type")
        if token_type != expected_type:
            raise JWTError(f"Token-Typ-Mismatch: erwartet {expected_type}, war {token_type}")
    return payload


def extract_user_id_and_version(
    token: str, expected_type: TokenType = "access"
) -> tuple[int, int]:
    """Convenience: User-ID + token_version aus einem validen Token ziehen.

    Wirft JWTError bei invalid/expired/falscher-Typ oder fehlendem Claim.
    """
    payload = decode_token(token, expected_type=expected_type)
    sub = payload.get("sub")
    ver = payload.get("ver")
    if sub is None:
        raise JWTError("Token hat kein 'sub' (User-ID)")
    if ver is None:
        raise JWTError("Token hat kein 'ver' (Token-Version)")
    return int(sub), int(ver)

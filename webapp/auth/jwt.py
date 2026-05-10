"""JWT-Token-Erstellung und -Validierung (Phase W).

Zwei Token-Typen:
- Access-Token: kurz (15 min), in Authorization-Header
- Refresh-Token: lang (30 Tage), in HttpOnly-Cookie

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
    expires_delta: timedelta | None = None,
) -> str:
    """Liefert einen signierten JWT.

    `subject` ist typischerweise die User-ID. JWT-spec sagt es muss string sein,
    int → str konvertieren wir automatisch.
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
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Validiert + decodiert ein JWT. Wirft `JWTError` bei invalid/expired.

    Wenn `expected_type` gesetzt: zusaetzliche Validierung dass der Token-Typ
    passt (verhindert dass jemand einen Refresh-Token als Access nutzt).
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if expected_type is not None:
        token_type = payload.get("type")
        if token_type != expected_type:
            raise JWTError(f"Token-Typ-Mismatch: erwartet {expected_type}, war {token_type}")
    return payload


def extract_user_id(token: str, expected_type: TokenType = "access") -> int:
    """Convenience: User-ID aus einem validen Access-Token ziehen.

    Wirft JWTError bei invalid/expired/falscher-Typ.
    """
    payload = decode_token(token, expected_type=expected_type)
    sub = payload.get("sub")
    if sub is None:
        raise JWTError("Token hat kein 'sub' (User-ID)")
    return int(sub)

"""JWT-Token-Erstellung und -Validierung (Phase W).

Zwei Token-Typen:
- Access-Token: kurz (15 min), in Authorization-Header
- Refresh-Token: lang (30 Tage), in HttpOnly-Cookie

Token-Revocation via `ver`-Claim:
Jeder Token trägt das `token_version` des Users zum Ausgabezeitpunkt.
Wird der Wert in der DB hochgezählt (Logout, Password-Change), invalidieren
alle ausgegebenen Tokens dieses Users — der Decode prüft den Wert.

Pure Funktionen + minimaler State — leicht testbar.

Bibliothek: PyJWT (seit W.pyjwt, 2026-11-07; vorher python-jose, das kaum
noch gepflegt wird und ecdsa/pyasn1 mit Sicherheitsmeldungen mitzog).
HS256-Tokens sind formatgleich — vor dem Wechsel ausgegebene Tokens bleiben
gültig (Test: tests/test_jwt_compat.py). `JWTError` bleibt der Name, den
deps.py und api/auth.py fangen.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt as pyjwt

from .config import (
    JWT_ACCESS_EXPIRE_MIN,
    JWT_ALGORITHM,
    JWT_REFRESH_EXPIRE_DAYS,
    JWT_SECRET,
)

TokenType = Literal["access", "refresh"]

# Basisklasse aller PyJWT-Fehler (Signatur, Ablauf, Format) — eigene Fehler
# unten (Typ-Mismatch, fehlende Claims) nutzen sie ebenfalls.
JWTError = pyjwt.PyJWTError


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
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Validiert + decodiert ein JWT. Wirft `JWTError` bei invalid/expired.

    Wenn `expected_type` gesetzt: zusätzliche Validierung dass der Token-Typ
    passt (verhindert dass jemand einen Refresh-Token als Access nutzt).

    Hinweis: `ver`-Check (Token-Revocation) passiert NICHT hier — der braucht
    den DB-Wert und gehört in die get_current_user-Dependency / Refresh-Endpoint.
    """
    payload: dict[str, Any] = pyjwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["exp", "iat"]},
    )
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
    try:
        return int(sub), int(ver)
    except (TypeError, ValueError) as exc:
        # Sonst schlüge ein roher ValueError als 500 statt 401 durch.
        raise JWTError("Token-Claims 'sub'/'ver' nicht numerisch") from exc

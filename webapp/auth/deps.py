"""FastAPI-Dependencies für Auth (Phase W).

`current_user`-Dep zieht den User aus dem JWT in `Authorization: Bearer <token>`,
prüft Token-Version (Revocation) und User-Status.
Wirft 401 bei fehlendem/invalidem/expired/revoked Token.

KERN-ANNAHME: jeder API-Endpoint ausser /auth/* + /api/health
benutzt `current_user` als Dependency. Das verhindert vergessenen
Auth-Check (statisch erkennbar im Code-Review).
"""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import User

from .jwt import extract_user_id_and_version

logger = logging.getLogger(__name__)

# OAuth2-Scheme — FastAPI nutzt das für Swagger-UI-Auth-Button.
# tokenUrl muss zu unserem login-endpoint passen.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: OrmSession = Depends(get_db),
) -> User:
    """Liefert den aktuellen User aus dem JWT. Wirft 401 wenn token
    fehlt/invalid/expired/revoked oder User nicht mehr existiert/inaktiv ist.

    Sicherheits-Checks:
    - JWT-Signatur valide + nicht expired (jose.jwt.decode)
    - type-Claim == "access"
    - User existiert + is_active
    - Token-Version == User.token_version (Revocation-Check)
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungueltiges oder abgelaufenes Token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id, token_ver = extract_user_id_and_version(token, expected_type="access")
    except JWTError:
        raise credentials_error from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    if user.token_version != token_ver:
        # Token revoked (Logout, Password-Change, o.ae.)
        raise credentials_error
    return user


# ============================================================
# Optional-Auth — fuer Endpoints, die anonym lesbar sind, aber
# Admin-Differenzierung brauchen (z.B. /changelog mit internal-Filter).
# auto_error=False -> kein 401 wenn Token fehlt/invalid, sondern None.
# ============================================================

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/login", auto_error=False
)


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: OrmSession = Depends(get_db),
) -> User | None:
    """Wie get_current_user, aber gibt None zurueck statt 401 wenn
    Token fehlt/invalid/expired/revoked oder der User inaktiv ist.
    Endpoints koennen damit fuer Anonyme + Eingeloggte funktionieren
    und gleichzeitig Admin-Differenzierung machen.
    """
    if token is None:
        return None
    try:
        user_id, token_ver = extract_user_id_and_version(token, expected_type="access")
    except JWTError as exc:
        # Defense-in-Depth: manipulierte / kaputte Tokens im Audit-Log
        # sichtbar machen. Nur Exception-Klassen-Name, kein Token-Inhalt.
        logger.warning("optional-auth JWT rejected: %s", type(exc).__name__)
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    if user.token_version != token_ver:
        return None
    return user

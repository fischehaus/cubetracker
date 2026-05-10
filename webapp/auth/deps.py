"""FastAPI-Dependencies fuer Auth (Phase W).

`current_user`-Dep zieht den User aus dem JWT in `Authorization: Bearer <token>`.
Wirft 401 bei fehlendem/invalidem/expired Token.

KERN-ANNAHME: jeder API-Endpoint ausser /auth/* + /api/health
benutzt `current_user` als Dependency. Das verhindert vergessenen
Auth-Check (statisch erkennbar im Code-Review).
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from db.database import get_db
from db.models import User

from .jwt import extract_user_id

# OAuth2-Scheme — FastAPI nutzt das fuer Swagger-UI-Auth-Button.
# tokenUrl muss zu unserem login-endpoint passen.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: OrmSession = Depends(get_db),
) -> User:
    """Liefert den aktuellen User aus dem JWT. Wirft 401 wenn token
    fehlt/invalid/expired oder User nicht mehr existiert/inaktiv ist.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungueltiges oder abgelaufenes Token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = extract_user_id(token, expected_type="access")
    except JWTError:
        raise credentials_error from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user

"""Auth-API (Phase W) — register / login / refresh / logout / me / delete.

User-Storage = User-Model in db/models.py.
Password-Hashing = bcrypt via auth/password.py.
Token = JWT via auth/jwt.py (mit ver-Claim fuer Revocation).

Sicherheits-Architektur:
- Access-Token im Response-Body (kurz, 15 min)
- Refresh-Token als HttpOnly-Cookie (XSS-sicher, Path=/auth)
- Logout setzt token_version++ -> alle existierenden Tokens revoked
- Login renewed Cookie + setzt fresh ver-Claim
"""

from __future__ import annotations

from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.config import (
    IS_PROD,
    JWT_REFRESH_EXPIRE_DAYS,
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
)
from auth.deps import get_current_user
from auth.jwt import create_token, decode_token
from auth.password import hash_password, verify_password
from auth.rate_limit import LOGIN_LIMIT, REFRESH_LIMIT, REGISTER_LIMIT, limiter
from db.database import get_db
from db.models import User
from db.schemas import AccessTokenOnly, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    """Echter bcrypt-Hash eines unbenutzten Werts. Lazy-init via cache damit
    er nicht beim Modul-Import gerechnet wird (~250ms — Security-Finding #9).

    Wird im Login-Endpoint genutzt damit User-existiert-vs-nicht NICHT ueber
    Response-Time leakable ist (Timing-Attack-Verteidigung).
    """
    return hash_password("dummy-for-timing-attack-defense")


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Setzt den Refresh-Token als HttpOnly-Cookie.

    - HttpOnly: JavaScript kann nicht draufzugreifen (XSS-sicher)
    - Secure: nur ueber HTTPS uebertragen (in Prod)
    - SameSite=lax: kein CSRF aus Drittanbieter-Sites
    - Path=/auth: nur an Auth-Endpoints geschickt (kleiner Angriffsvektor)
    """
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=int(timedelta(days=JWT_REFRESH_EXPIRE_DAYS).total_seconds()),
        httponly=True,
        secure=IS_PROD,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Loescht den Refresh-Cookie (Logout)."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_LIMIT)
def register(
    request: Request,
    payload: UserCreate,
    db: OrmSession = Depends(get_db),
) -> User:
    """Neuen User anlegen.

    Email wird zu Lowercase normalisiert. Wenn Email schon existiert: 409.
    Password wird via bcrypt gehasht (work-factor 12).

    Rate-Limit: 5/min per IP (Brute-Force + Spam-Schutz).
    """
    email_lc = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email_lc))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese Email-Adresse ist bereits registriert.",
        )

    user = User(
        email=email_lc,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=AccessTokenOnly)
@limiter.limit(LOGIN_LIMIT)
def login(
    request: Request,
    payload: UserLogin,
    response: Response,
    db: OrmSession = Depends(get_db),
) -> AccessTokenOnly:
    """Login mit Email + Password.

    - Access-Token im Response-Body
    - Refresh-Token als HttpOnly-Cookie (NICHT im Body, XSS-sicher)
    - Konstanter Response bei falscher Email vs falschem Password
      (verhindert Email-Enumeration-Attack).
    - Rate-Limit: 5/min per IP (Brute-Force-Schutz, CPU-Cost-Schutz).
    """
    email_lc = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email_lc))

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email oder Passwort falsch.",
    )
    if user is None or not user.is_active:
        # Trotzdem hash-vergleich machen damit User-existiert vs not
        # nicht ueber Timing rausfindbar ist. Wir nutzen einen echten
        # bcrypt-hash von einem unbenutzten Wert (lazy via cache).
        verify_password(payload.password, _dummy_hash())
        raise invalid_credentials
    if not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    access = create_token(user.id, "access", token_version=user.token_version)
    refresh = create_token(user.id, "refresh", token_version=user.token_version)
    _set_refresh_cookie(response, refresh)
    return AccessTokenOnly(access_token=access)


@router.post("/refresh", response_model=AccessTokenOnly)
@limiter.limit(REFRESH_LIMIT)
def refresh(
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> AccessTokenOnly:
    """Tauscht einen gueltigen Refresh-Token gegen einen neuen Access-Token.

    Refresh-Token MUSS aus dem HttpOnly-Cookie kommen (nicht aus Body/Header).
    Wir checken zusaetzlich:
    - Token-Type == "refresh" (verhindert Access-as-Refresh-Missbrauch)
    - Token-Version == User.token_version (Revocation-Check)
    - User existiert + is_active

    Fehler-Detail ist generisch (kein Leak welcher Check fehlschlug —
    Security-Finding #7).
    """
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh-Token ungueltig oder abgelaufen.",
    )

    if not refresh_cookie:
        raise invalid

    try:
        payload = decode_token(refresh_cookie, expected_type="refresh")
    except JWTError:
        raise invalid from None

    user_id_raw = payload.get("sub")
    token_ver = payload.get("ver")
    if user_id_raw is None or token_ver is None:
        raise invalid

    try:
        user_id = int(user_id_raw)
        token_ver = int(token_ver)
    except (TypeError, ValueError):
        raise invalid from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise invalid
    if user.token_version != token_ver:
        # Revoked (Logout / Password-Change). Zur Sicherheit Cookie loeschen.
        _clear_refresh_cookie(response)
        raise invalid

    # Access-Token erneuern. Refresh-Cookie bleibt unveraendert (keine Rotation
    # in dieser Phase — Finding #4 ist 🟡, kommt in v2.x).
    return AccessTokenOnly(
        access_token=create_token(user.id, "access", token_version=user.token_version)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Response:
    """Logout: token_version++ revoked ALLE existierenden Tokens dieses Users
    serverseitig. Loescht zusaetzlich den Refresh-Cookie clientseitig.

    Auch wenn der Angreifer Access- oder Refresh-Tokens kopiert hat:
    sobald token_version hochgezaehlt ist, schlagen alle alten Tokens fehl.
    """
    current_user.token_version += 1
    db.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Liefert den aktuell eingeloggten User. Nuetzlich fuer Frontend
    um nach Login die User-Info zu holen."""
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """DSGVO: User loescht sich selbst inkl. ALLER Daten.

    Cascade in den Models loescht alle Solves/Sessions/Hardware/
    Achievements/Challenges automatisch mit. Refresh-Cookie wird gecleart.
    """
    db.delete(current_user)
    db.commit()
    _clear_refresh_cookie(response)

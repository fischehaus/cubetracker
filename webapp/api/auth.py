"""Auth-API (Phase W) — register / login / refresh / me.

User-Storage = User-Model in db/models.py.
Password-Hashing = bcrypt via auth/password.py.
Token = JWT via auth/jwt.py.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user
from auth.jwt import create_token, decode_token
from auth.password import hash_password, verify_password
from db.database import get_db
from db.models import User
from db.schemas import AccessTokenOnly, TokenPair, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

# Echter bcrypt-hash von einem zufaelligen unbenutzten Wert. Wird im
# Login-Endpoint genutzt damit User-existiert-vs-nicht NICHT ueber
# Response-Time leakable ist (Timing-Attack-Verteidigung).
_DUMMY_HASH = hash_password("dummy-for-timing-attack-defense")


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: OrmSession = Depends(get_db)) -> User:
    """Neuen User anlegen.

    Email wird zu Lowercase normalisiert. Wenn Email schon existiert: 409.
    Password wird via bcrypt gehasht (work-factor 12).
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


@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, db: OrmSession = Depends(get_db)) -> TokenPair:
    """Login mit Email + Password. Liefert Access + Refresh Tokens.

    Konstanter Response bei falscher Email vs falschem Password
    (verhindert Email-Enumeration-Attack).
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
        # bcrypt-hash von einem unbenutzten Wert.
        verify_password(payload.password, _DUMMY_HASH)
        raise invalid_credentials
    if not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    return TokenPair(
        access_token=create_token(user.id, "access"),
        refresh_token=create_token(user.id, "refresh"),
    )


@router.post("/refresh", response_model=AccessTokenOnly)
def refresh(refresh_token: str, db: OrmSession = Depends(get_db)) -> AccessTokenOnly:
    """Tauscht einen gueltigen Refresh-Token gegen einen neuen Access-Token.

    Refresh-Token muss explizit als 'refresh' typisiert sein
    (verhindert dass jemand einen Access-Token als Refresh nutzt).
    """
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh-Token ungueltig: {e}",
        ) from e

    user_id = int(payload["sub"])
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User existiert nicht mehr oder ist deaktiviert.",
        )

    return AccessTokenOnly(access_token=create_token(user.id, "access"))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Liefert den aktuell eingeloggten User. Nuetzlich fuer Frontend
    um nach Login die User-Info zu holen."""
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """DSGVO: User loescht sich selbst inkl. ALLER Daten.

    Cascade in den Models loescht alle Solves/Sessions/Hardware/
    Achievements/Challenges automatisch mit.
    """
    db.delete(current_user)
    db.commit()

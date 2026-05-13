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

import secrets
from datetime import UTC, datetime, timedelta
from functools import lru_cache

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
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
from db.models import EmailVerificationToken, PasswordResetToken, User
from db.schemas import (
    AccessTokenOnly,
    EmailChangeRequest,
    ForgotPasswordRequest,
    PasswordChange,
    ResetPasswordRequest,
    UserCreate,
    UserLogin,
    UserRead,
    UserUpdate,
    VerifyEmailRequest,
)
from emailing.service import (
    send_email_change_verification,
    send_password_reset_email,
    send_verification_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Token-Lifetimes (W.8)
PASSWORD_RESET_TOKEN_LIFETIME = timedelta(hours=1)
EMAIL_VERIFICATION_TOKEN_LIFETIME = timedelta(days=7)

# Rate-Limits fuer Email-Endpoints (Spam-Schutz, jede Mail kostet Resend-Quota)
FORGOT_PASSWORD_LIMIT = "3/hour"  # pro IP
VERIFY_RESEND_LIMIT = "3/hour"
CHANGE_PASSWORD_LIMIT = "10/hour"
CHANGE_EMAIL_LIMIT = "5/hour"


def _generate_token() -> str:
    """288-bit Token via secrets — kollisions-/brute-force-sicher."""
    return secrets.token_urlsafe(48)


def _now_utc() -> datetime:
    return datetime.now(UTC)


def _bump_token_version(db: OrmSession, user_id: int) -> None:
    """Atomares Increment fuer User.token_version — race-safe.

    Sub-Agent-Finding K5: `user.token_version += 1` via ORM-read-modify-
    write kann bei parallelen Requests (Logout + Change-Password gleich-
    zeitig) ein Increment verlieren. SQL-side UPDATE garantiert dass
    JEDER Aufruf den Zaehler erhoeht.
    """
    db.execute(
        update(User)
        .where(User.id == user_id)
        .values(token_version=User.token_version + 1)
    )


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
    W.8: nach Anlegen wird ein EmailVerificationToken erzeugt + Verify-
    Mail verschickt. User kann sich trotzdem schon einloggen, aber UI
    zeigt einen "Email noch nicht bestaetigt"-Banner bis er klickt.

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
    db.flush()  # user.id

    # Email-Verification-Token + Mail
    verify_token = EmailVerificationToken(
        user_id=user.id,
        token=_generate_token(),
        new_email=email_lc,
        expires_at=_now_utc() + EMAIL_VERIFICATION_TOKEN_LIFETIME,
    )
    db.add(verify_token)
    db.commit()
    db.refresh(user)

    # Mail fail-soft (Account ist trotzdem angelegt wenn Resend down ist)
    send_verification_email(email_lc, verify_token.token)

    # W.hardware-auto-seed: jeder neue User bekommt die Default-Hardware-
    # Liste mit is_active=False. Fail-soft — wenn Seed scheitert, ist der
    # Account trotzdem angelegt, User kann manuell hinzufuegen.
    try:
        from seeds.hardware import seed_user_hardware

        seed_user_hardware(db, user.id, default_active=False)
    except Exception:  # noqa: BLE001
        # Logger ist auf Endpoint-Level evtl. nicht da, swallow silent —
        # in den lifespan-Backfill wird der User dann beim naechsten
        # Cold-Start nachgepflegt.
        db.rollback()

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
    _bump_token_version(db, current_user.id)
    db.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Liefert den aktuell eingeloggten User. Nuetzlich fuer Frontend
    um nach Login die User-Info zu holen."""
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> User:
    """Profil-Update: aktuell nur display_name. Email-Change geht ueber
    /auth/change-email (mit Re-Verification), Passwort-Change ueber
    /auth/change-password (mit alter-Passwort-Pruefung).

    Sub-Agent-Finding K4: explizite Whitelist als zweite Defense-Schicht
    zusaetzlich zum UserUpdate-Schema (das `extra=forbid` hat).
    """
    # Whitelist erweitert um is_discoverable (Phase W.9). Email/Password
    # bleiben aussen vor — die haben ihre eigenen sicherheits-relevanten Flows.
    _ALLOWED_FIELDS = {"display_name", "is_discoverable"}
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in _ALLOWED_FIELDS:
            setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> None:
    """DSGVO: User loescht sich selbst inkl. ALLER Daten.

    Cascade in den Models loescht alle Solves/Sessions/Hardware/
    Achievements/Challenges/Snapshots/Tokens automatisch mit.
    Refresh-Cookie wird gecleart.
    """
    db.delete(current_user)
    db.commit()
    _clear_refresh_cookie(response)


# ============================================================
# W.8: Password Change / Reset
# ============================================================


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(CHANGE_PASSWORD_LIMIT)
def change_password(
    request: Request,
    payload: PasswordChange,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Response:
    """Eingeloggter User aendert sein Passwort.

    Sicherheits-Workflow:
    1. current_password muss korrekt sein (sonst koennte gestohlener
       Access-Token zum Passwort-Hijack benutzt werden)
    2. Nach Erfolg: token_version++ -> ALLE bestehenden JWTs (auch der
       gerade verwendete!) werden ungueltig
    3. Refresh-Cookie wird auch geloescht -> User muss neu einloggen
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktuelles Passwort ist falsch.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    _bump_token_version(db, current_user.id)  # alle JWTs revoken
    db.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(FORGOT_PASSWORD_LIMIT)
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background: BackgroundTasks,
    db: OrmSession = Depends(get_db),
) -> Response:
    """User vergisst Passwort -> kriegt Reset-Link per Mail.

    Sicherheit:
    - Antwortet IMMER 204 + sofort (Mail-Send via BackgroundTask),
      egal ob Email existiert. Verhindert Email-Enumeration ueber
      Response-Timing (Sub-Agent-Finding K3 + S7).
    - Token ist 288-bit secrets.token_urlsafe, in DB als Single-Use
    - Expires after 1h
    - Beim Erzeugen eines neuen Reset-Tokens werden ALLE bestehenden
      offenen Tokens dieses Users invalidiert (Finding S4) — sonst
      koennten alte (geleakte) Tokens noch bis Expiry genutzt werden.
    """
    email_lc = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email_lc))
    if user is not None and user.is_active:
        # S4: alte offene Reset-Tokens dieses Users zumachen
        db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id)
            .where(PasswordResetToken.used_at.is_(None))
            .values(used_at=_now_utc())
        )
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=_generate_token(),
            expires_at=_now_utc() + PASSWORD_RESET_TOKEN_LIFETIME,
        )
        db.add(reset_token)
        db.commit()
        # K3: Mail-Send in BackgroundTask -> Response sofort, kein Timing-Leak
        background.add_task(send_password_reset_email, email_lc, reset_token.token)
    # Immer 204 — kein Leak ueber Existenz
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(CHANGE_PASSWORD_LIMIT)
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    response: Response,
    db: OrmSession = Depends(get_db),
) -> Response:
    """Token aus Mail-Link + neues Passwort -> Passwort setzen.

    Sicherheit (Sub-Agent-Finding K2):
    - Atomares conditional UPDATE auf den Token: gleichzeitig pruefen
      (used_at IS NULL + expires_at > now) UND used_at setzen. Zwei
      parallele Requests koennen nur einer durch.
    - Generische Fehler (kein Leak ob Token existiert/expired/used)
    - token_version atomar inkrementiert
    """
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Reset-Link ist ungueltig oder abgelaufen.",
    )

    # Atomares "claim" des Tokens: nur ein paralleler Aufruf gewinnt.
    now = _now_utc()
    result = db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.token == payload.token)
        .where(PasswordResetToken.used_at.is_(None))
        .where(PasswordResetToken.expires_at > now)
        .values(used_at=now)
        .returning(PasswordResetToken.user_id)
    )
    row = result.first()
    if row is None:
        raise invalid

    user_id = row[0]
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        # Sehr unwahrscheinlich (Token + User Cascade), aber defensiv
        raise invalid

    user.hashed_password = hash_password(payload.new_password)
    _bump_token_version(db, user.id)
    db.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


# ============================================================
# W.8: Email Verification + Change
# ============================================================


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(
    payload: VerifyEmailRequest,
    db: OrmSession = Depends(get_db),
) -> Response:
    """Token aus Mail-Link -> Email als verifiziert markieren.

    Bei Email-Change-Flow: setzt zusaetzlich die neue Email-Adresse
    (token.new_email kann von user.email abweichen).

    Sicherheit (Sub-Agent-Findings K1+K2):
    - Atomares conditional UPDATE auf den Token (Race-frei)
    - Email-Change wird in try/except IntegrityError gewickelt:
      wenn zwischen Conflict-Check und Commit die Adresse von jemand
      anderem registriert wird, antwortet die DB-Unique-Constraint mit
      Conflict -> wir mappen auf 409.
    """
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Verifikations-Link ist ungueltig oder abgelaufen.",
    )

    # Atomares Token-Claim
    now = _now_utc()
    result = db.execute(
        update(EmailVerificationToken)
        .where(EmailVerificationToken.token == payload.token)
        .where(EmailVerificationToken.used_at.is_(None))
        .where(EmailVerificationToken.expires_at > now)
        .values(used_at=now)
        .returning(EmailVerificationToken.user_id, EmailVerificationToken.new_email)
    )
    row = result.first()
    if row is None:
        raise invalid

    user_id, new_email = row[0], row[1]
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise invalid

    try:
        if new_email and new_email != user.email:
            user.email = new_email
        user.email_verified = True
        db.commit()
    except IntegrityError:
        # Race: jemand anderes hat zwischenzeitlich die neue Adresse registriert.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese Email-Adresse ist inzwischen anderweitig registriert.",
        ) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(VERIFY_RESEND_LIMIT)
def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Response:
    """Eingeloggter User fordert eine neue Verify-Mail an (z.B. wenn
    erste Mail nicht angekommen ist).
    """
    if current_user.email_verified:
        # No-op: schon verifiziert. Trotzdem 204 antworten, kein Leak.
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    token = EmailVerificationToken(
        user_id=current_user.id,
        token=_generate_token(),
        new_email=current_user.email,
        expires_at=_now_utc() + EMAIL_VERIFICATION_TOKEN_LIFETIME,
    )
    db.add(token)
    db.commit()
    send_verification_email(current_user.email, token.token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/change-email", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(CHANGE_EMAIL_LIMIT)
def change_email(
    request: Request,
    payload: EmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> Response:
    """User aendert Email. Workflow:

    1. current_password muss korrekt sein (verhindert Email-Hijack
       bei gestohlenem Access-Token)
    2. Token wird mit der NEUEN Email gespeichert, NICHT in user.email
    3. User klickt Link in der Mail an die neue Adresse -> ueberschreibe
       user.email (erst dann ist die Aenderung aktiv)
    4. Alte Email bleibt aktiv + funktional bis Klick

    Wenn die neue Adresse schon registriert ist: 409. Aber: wir
    antworten 204 falls die alte Email = die neue Email (keine Aktion).
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktuelles Passwort ist falsch.",
        )

    new_email_lc = payload.new_email.lower().strip()
    if new_email_lc == current_user.email:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    # Schon vergeben?
    existing = db.scalar(select(User).where(User.email == new_email_lc))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese Email-Adresse ist bereits registriert.",
        )

    token = EmailVerificationToken(
        user_id=current_user.id,
        token=_generate_token(),
        new_email=new_email_lc,
        expires_at=_now_utc() + EMAIL_VERIFICATION_TOKEN_LIFETIME,
    )
    db.add(token)
    db.commit()
    send_email_change_verification(new_email_lc, token.token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

"""Email-Service via Resend (Phase W.8).

Resend ist ein modernes Email-Sending-API (https://resend.com).
3000 Mails/Monat im Free-Tier — ausreichend fuer Friends-Phase.

API-Key: aus Env RESEND_API_KEY (Render-Env-Var, NIE im Repo!).
From-Adresse: aus Env RESEND_FROM, Default `noreply@cubetracker.de`.

Drei Email-Typen:
- send_verification_email: bei Register + on-demand
- send_password_reset_email: bei /auth/forgot-password
- send_email_change_verification: bei Email-Change

Fail-Soft: wenn Resend-Call fehlschlaegt, wird der Fehler geloggt aber
NICHT propagiert (sonst koennte ein Resend-Outage Login/Register blockieren).
Caller kann via `success` Bool den Status sehen.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import resend

logger = logging.getLogger(__name__)


# Frontend-URL fuer Email-Links. In Prod: https://www.cubetracker.de.
# Wird per Env gesetzt — Default sinnvoll fuer Live-Deploy.
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.cubetracker.de").rstrip("/")
FROM_EMAIL = os.getenv("RESEND_FROM", "cubetracker <onboarding@resend.dev>")


def _ensure_api_key() -> str | None:
    """Holt API-Key aus Env. Liefert None wenn nicht gesetzt (Test/Dev)."""
    key = os.getenv("RESEND_API_KEY", "").strip()
    return key or None


@dataclass
class EmailResult:
    success: bool
    message_id: str | None
    error: str | None


def _send(to: str, subject: str, html: str) -> EmailResult:
    """Basis-Send via Resend. Fail-Soft."""
    api_key = _ensure_api_key()
    if not api_key:
        logger.warning("RESEND_API_KEY nicht gesetzt — Email an %s wird NICHT versendet", to)
        return EmailResult(success=False, message_id=None, error="no_api_key")

    resend.api_key = api_key
    try:
        response = resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        message_id = response.get("id") if isinstance(response, dict) else None
        return EmailResult(success=True, message_id=message_id, error=None)
    except Exception as e:  # noqa: BLE001 — externe API, weite Fehlerflaeche akzeptabel
        logger.error("Resend-Send an %s fehlgeschlagen: %s", to, e)
        return EmailResult(success=False, message_id=None, error=str(e))


# ============================================================
# Email-Templates
# ============================================================
# Bewusst inline + minimalistisch HTML. Kein Template-Engine fuer 3 Mails.
# Plain-Text ist Resend-default mit-generierbar via `text:`-Field — wir
# fokussieren auf HTML.


def send_verification_email(to: str, verification_token: str) -> EmailResult:
    """Email-Verification-Link beim Register oder Resend-Verification."""
    link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 24px;">Willkommen bei cubetracker</h1>
  <p>Bitte bestaetige deine Email-Adresse mit einem Klick:</p>
  <p style="margin: 24px 0;">
    <a href="{link}"
       style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Email bestaetigen
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Oder kopiere diesen Link in deinen Browser:<br>
    <code style="word-break: break-all;">{link}</code>
  </p>
  <p style="font-size: 13px; color: #888;">
    Der Link ist 7 Tage gueltig. Falls du dich nicht bei cubetracker
    registriert hast, ignoriere diese Mail einfach.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Email bestaetigen", html)


def send_password_reset_email(to: str, reset_token: str) -> EmailResult:
    """Password-Reset-Link via /auth/forgot-password."""
    link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 24px;">Passwort zuruecksetzen</h1>
  <p>Klick den Link um ein neues Passwort fuer cubetracker zu setzen:</p>
  <p style="margin: 24px 0;">
    <a href="{link}"
       style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Neues Passwort setzen
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Oder kopiere diesen Link in deinen Browser:<br>
    <code style="word-break: break-all;">{link}</code>
  </p>
  <p style="font-size: 13px; color: #888;">
    Der Link ist 1 Stunde gueltig. Falls du keinen Reset angefordert
    hast, ignoriere diese Mail — dein bestehendes Passwort bleibt
    unveraendert.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Passwort zuruecksetzen", html)


def send_email_change_verification(to: str, verification_token: str) -> EmailResult:
    """Verifizierung der NEUEN Email-Adresse bei Email-Change-Flow."""
    link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 24px;">Neue Email-Adresse bestaetigen</h1>
  <p>Du hast bei cubetracker eine Email-Aenderung angefordert.
     Bitte bestaetige die neue Adresse mit einem Klick:</p>
  <p style="margin: 24px 0;">
    <a href="{link}"
       style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Neue Email bestaetigen
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Oder kopiere diesen Link in deinen Browser:<br>
    <code style="word-break: break-all;">{link}</code>
  </p>
  <p style="font-size: 13px; color: #888;">
    Der Link ist 7 Tage gueltig. Erst nach dem Klick wird die Adresse
    aktiv — bis dahin bleibt deine alte Email-Adresse im Account.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Neue Email-Adresse bestaetigen", html)

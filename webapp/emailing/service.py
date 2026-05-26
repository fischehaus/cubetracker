"""Email-Service via Resend (Phase W.8).

Resend ist ein modernes Email-Sending-API (https://resend.com).
3000 Mails/Monat im Free-Tier — ausreichend für Friends-Phase.

API-Key: aus Env RESEND_API_KEY (Coolify-Env-Var, NIE im Repo!).
From-Adresse: aus Env RESEND_FROM, Default `noreply@cubetracker.de`.

Drei Email-Typen:
- send_verification_email: bei Register + on-demand
- send_password_reset_email: bei /auth/forgot-password
- send_email_change_verification: bei Email-Change

Fail-Soft: wenn Resend-Call fehlschlägt, wird der Fehler geloggt aber
NICHT propagiert (sonst könnte ein Resend-Outage Login/Register blockieren).
Caller kann via `success` Bool den Status sehen.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import resend

logger = logging.getLogger(__name__)


# Frontend-URL für Email-Links. In Prod: https://www.cubetracker.de.
# Wird per Env gesetzt — Default sinnvoll für Live-Deploy.
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
# Bewusst inline + minimalistisch HTML. Kein Template-Engine für 3 Mails.
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
  <p>Bitte bestätige deine Email-Adresse mit einem Klick:</p>
  <p style="margin: 24px 0;">
    <a href="{link}"
       style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Email bestätigen
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Oder kopiere diesen Link in deinen Browser:<br>
    <code style="word-break: break-all;">{link}</code>
  </p>
  <p style="font-size: 13px; color: #888;">
    Der Link ist 7 Tage gültig. Falls du dich nicht bei cubetracker
    registriert hast, ignoriere diese Mail einfach.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Email bestätigen", html)


def send_password_reset_email(to: str, reset_token: str) -> EmailResult:
    """Password-Reset-Link via /auth/forgot-password."""
    link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 24px;">Passwort zurücksetzen</h1>
  <p>Klick den Link um ein neues Passwort für cubetracker zu setzen:</p>
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
    Der Link ist 1 Stunde gültig. Falls du keinen Reset angefordert
    hast, ignoriere diese Mail — dein bestehendes Passwort bleibt
    unverändert.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Passwort zurücksetzen", html)


def send_admin_message(to: str, subject: str, body: str) -> EmailResult:
    """Ad-hoc-Mail vom Admin an einen User (Support, Ankündigung).

    `body` ist Plain-Text. Newlines werden zu <br>. Kein Markdown, kein
    HTML-Pass-Through (XSS-Risiko falls Admin-Account kompromittiert
    wird — wir escapen vor dem Rendern in HTML).

    Subject-Prefix "[cubetracker]" wird automatisch ergänzt damit User
    die Mail als App-Mail erkennen.
    """
    # HTML-Escape gegen XSS-Risiko, Newlines zu <br> für Plain-Body-Optik
    import html as _html

    safe_body = _html.escape(body).replace("\n", "<br>\n")
    # QA-Finding M1: Subject defensiv CRLF-strippen — Resend baut den
    # SMTP-Header selbst und sollte das eigentlich tun, aber wir trauen
    # nicht über die Lib-Boundary. Ein eingeschleuster Newline könnte
    # zusätzliche Header (Bcc:, Reply-To:) injizieren.
    safe_subject = subject.replace("\r", " ").replace("\n", " ").strip()
    full_subject = (
        safe_subject if safe_subject.startswith("[cubetracker]") else f"[cubetracker] {safe_subject}"
    )
    html_body = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 20px; color: #7c3aed;">cubetracker</h1>
  <div style="margin: 16px 0; line-height: 1.5;">
    {safe_body}
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #888;">
    Diese Mail wurde vom Betreiber von cubetracker an dich gesendet.
    Antworten gehen direkt an den Betreiber, kein Auto-Reply.
  </p>
</body>
</html>"""
    return _send(to, full_subject, html_body)


def send_feedback_email(
    feedback_type: str,
    message: str,
    user_email: str,
    user_display_name: str | None,
) -> EmailResult:
    """User-Feedback-Mail an die Admin-Adresse (ADMIN_EMAILS[0]).

    Phase W.feedback (2026-05-17): User können ohne GitHub-Account
    Feedback geben via App-Form. Der Inhalt landet als Email beim
    Admin, der dann entscheidet ob daraus ein GitHub-Issue wird.
    """
    admin_emails_raw = os.getenv("ADMIN_EMAILS", "").strip()
    if not admin_emails_raw:
        logger.warning("ADMIN_EMAILS nicht gesetzt — Feedback nicht versandbar")
        return EmailResult(success=False, message_id=None, error="no_admin")
    # Nimm die erste Admin-Email (ADMIN_EMAILS ist comma-separated)
    admin_to = [e.strip() for e in admin_emails_raw.split(",") if e.strip()][0]

    type_label = {
        "bug": "🐛 Bug-Report",
        "feature": "✨ Feature-Wunsch",
        "other": "💬 Allgemeines Feedback",
    }.get(feedback_type, feedback_type)

    # Plain-Text-Escape der Message (kein User-HTML in Email-Body)
    import html as html_lib

    safe_message = html_lib.escape(message).replace("\n", "<br>")
    safe_display = html_lib.escape(user_display_name or "(kein Anzeige-Name)")
    safe_email = html_lib.escape(user_email)

    body_html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 20px;">{type_label} via cubetracker.de</h1>
  <table style="font-size: 14px; color: #555; border-collapse: collapse; margin-bottom: 16px;">
    <tr><td style="padding-right: 12px;"><b>Von:</b></td><td>{safe_display}</td></tr>
    <tr><td style="padding-right: 12px;"><b>Email:</b></td><td><a href="mailto:{safe_email}">{safe_email}</a></td></tr>
    <tr><td style="padding-right: 12px;"><b>Typ:</b></td><td>{html_lib.escape(feedback_type)}</td></tr>
  </table>
  <div style="background: #f3f4f6; border-left: 4px solid #7c3aed; padding: 12px 16px; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
    {safe_message}
  </div>
  <p style="font-size: 12px; color: #888; margin-top: 24px;">
    Wenn der Report relevant ist, kannst du daraus ein GitHub-Issue
    machen unter
    <a href="https://github.com/fischehaus/cubetracker/issues/new/choose">github.com/fischehaus/cubetracker/issues</a>.
  </p>
</body>
</html>"""
    subject = f"[cubetracker.de] {type_label} von {safe_display}"
    return _send(admin_to, subject, body_html)


def send_email_change_verification(to: str, verification_token: str) -> EmailResult:
    """Verifizierung der NEUEN Email-Adresse bei Email-Change-Flow."""
    link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    html = f"""\
<!doctype html>
<html lang="de">
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; color: #111;">
  <h1 style="font-size: 24px;">Neue Email-Adresse bestätigen</h1>
  <p>Du hast bei cubetracker eine Email-Änderung angefordert.
     Bitte bestätige die neue Adresse mit einem Klick:</p>
  <p style="margin: 24px 0;">
    <a href="{link}"
       style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Neue Email bestätigen
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Oder kopiere diesen Link in deinen Browser:<br>
    <code style="word-break: break-all;">{link}</code>
  </p>
  <p style="font-size: 13px; color: #888;">
    Der Link ist 7 Tage gültig. Erst nach dem Klick wird die Adresse
    aktiv — bis dahin bleibt deine alte Email-Adresse im Account.
  </p>
</body>
</html>"""
    return _send(to, "cubetracker — Neue Email-Adresse bestätigen", html)

"""GitHub-API-Client fuer Auto-Issue-Erstellung (Phase W.live-tests, 2026-05-17).

Wird genutzt im Live-Test-Workflow: wenn ein Admin einen Test als FAIL
markiert und eine Notiz schreibt, soll automatisch ein GitHub-Issue im
cubetracker-Repo angelegt werden — fuer die naechste Welle als Fix-TODO.

Konfiguration:
- Env-Var `GITHUB_TOKEN`: Personal Access Token (classic oder fine-grained)
  mit `repo`-Scope (oder fuer fine-grained: Issues=write auf das Repo).
  Bei Render unter Environment-Tab setzen.
- Env-Var `GITHUB_REPO`: default "fischehaus/cubetracker" — Owner/Repo-Name.

Graceful degradation: wenn Token nicht gesetzt -> return None, kein Fehler
in der Hauptlogik. Der Test wird trotzdem als FAIL gespeichert, nur ohne
Issue-Verknuepfung.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
DEFAULT_REPO = "fischehaus/cubetracker"
DEFAULT_LABELS = ["live-test-fail", "automated"]
# 8 Sekunden Timeout — wir wollen das User-API-Response nicht blocken.
HTTP_TIMEOUT = 8.0


def _get_token() -> str | None:
    """Liest GITHUB_TOKEN aus Env. None wenn nicht gesetzt (= Feature aus)."""
    token = os.getenv("GITHUB_TOKEN", "").strip()
    return token or None


def _get_repo() -> str:
    """Owner/Repo. Default cubetracker-Repo."""
    return os.getenv("GITHUB_REPO", DEFAULT_REPO).strip() or DEFAULT_REPO


def is_configured() -> bool:
    """Health-Check: ist GitHub-Integration nutzbar?"""
    return _get_token() is not None


def create_issue(
    title: str,
    body: str,
    labels: list[str] | None = None,
) -> dict[str, Any] | None:
    """Erstellt ein GitHub-Issue im konfigurierten Repo.

    Returns:
        dict mit 'html_url' und 'number' bei Erfolg, None bei jedem Fehler
        (Token fehlt, Network, API-Error, Rate-Limit, ...).

    Wir loggen alle Fehler, werfen sie aber NICHT weiter — die aufrufende
    Stelle (update_live_test) soll den Test-Save nicht abbrechen nur weil
    GitHub down ist. Issue-Erstellung ist nice-to-have, kein Pflicht.
    """
    token = _get_token()
    if token is None:
        logger.info("[github] GITHUB_TOKEN not set, skipping issue creation")
        return None

    repo = _get_repo()
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    payload: dict[str, Any] = {
        "title": title[:200],  # GitHub-Limit ist 256, defensive Trim
        "body": body[:65000],  # GitHub-Limit ist ~65535
        "labels": labels if labels is not None else DEFAULT_LABELS,
    }

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            data = response.json()
            issue_url = data.get("html_url")
            issue_number = data.get("number")
            logger.info(
                "[github] created issue #%s in %s -> %s",
                issue_number,
                repo,
                issue_url,
            )
            return {"html_url": issue_url, "number": issue_number}
        # Bei Fehler nur loggen, nicht propagieren
        logger.warning(
            "[github] create_issue failed: %s %s - %s",
            response.status_code,
            response.reason_phrase,
            response.text[:300],
        )
        return None
    except httpx.HTTPError as e:
        logger.warning("[github] network error: %s", e)
        return None
    except Exception as e:  # noqa: BLE001
        logger.warning("[github] unexpected error: %s", e)
        return None


def add_comment(
    issue_number: int,
    body: str,
) -> bool:
    """Postet einen Kommentar zu einem bestehenden Issue.

    Wird beim 2., 3., n-ten Update genutzt — initial wird create_issue
    aufgerufen, danach add_comment fuer weitere Notizen.

    Returns True bei Erfolg, False bei jedem Fehler.
    """
    token = _get_token()
    if token is None:
        return False

    repo = _get_repo()
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    payload = {"body": body[:65000]}

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            logger.info("[github] added comment to issue #%s", issue_number)
            return True
        logger.warning(
            "[github] add_comment failed: %s %s",
            response.status_code,
            response.reason_phrase,
        )
        return False
    except httpx.HTTPError as e:
        logger.warning("[github] network error in add_comment: %s", e)
        return False
    except Exception as e:  # noqa: BLE001
        logger.warning("[github] unexpected error in add_comment: %s", e)
        return False

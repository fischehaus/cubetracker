"""Changelog/Patch-Notes-API.

Liefert die PATCH_NOTES als JSON. Source-of-Truth: `changelog/data.py`.
Endpoint ist nicht-authentifiziert (auch fuer Logged-Out-User sichtbar) —
die App-Version + Highlights sind oeffentlich, kein Privacy-Risiko.

Rate-Limit weggelassen — pure Konstanten-Antwort, billig.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from changelog.data import PATCH_NOTES

router = APIRouter(prefix="/api", tags=["changelog"])


@router.get("/changelog")
def get_changelog() -> dict[str, list[dict[str, Any]]]:
    """Alle Patch-Notes, neueste zuerst."""
    return {
        "patches": [
            {
                "version": pn.version,
                "released": pn.released.isoformat(),
                "title": pn.title,
                "highlights": list(pn.highlights),
                "commit": pn.commit,
            }
            for pn in PATCH_NOTES
        ],
    }

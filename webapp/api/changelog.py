"""Changelog/Patch-Notes-API.

Liefert die PATCH_NOTES als JSON. Source-of-Truth: `changelog/data.py`.

Auth-Verhalten (seit W.patchnotes-intern, 2026-05-26):
- Anonyme + eingeloggte Non-Admins sehen nur Eintraege mit `internal=False`
  (User-Changelog: nur das, was die App-Erfahrung sichtbar veraendert).
- Admins sehen alle Eintraege inkl. `internal`-Flag im JSON, damit das UI
  intern-markierte Eintraege visuell hervorheben kann.

Endpoint bleibt anonym aufrufbar — kein 401 ohne Token, dank
get_current_user_optional. Rate-Limit weggelassen — billige Konstanten-Antwort.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.deps import get_current_user_optional
from changelog.data import PATCH_NOTES
from db.models import User

# KEIN prefix="/api" hier! main.py wrappt bereits alle Router unter /api
# (api_router = APIRouter(prefix="/api")). Ein zweites /api an dieser Stelle
# wuerde die Route auf /api/api/changelog legen (Doppel-Prefix-Bug, W.api-prefix).
router = APIRouter(tags=["changelog"])


@router.get("/changelog")
def get_changelog(
    user: User | None = Depends(get_current_user_optional),
) -> dict[str, list[dict[str, Any]]]:
    """Patch-Notes, neueste zuerst. Filter: Admins sehen alles inkl.
    `internal`-Flag; anonyme + Non-Admins sehen nur internal=False.
    """
    is_admin = user is not None and user.is_admin
    patches: list[dict[str, Any]] = []
    for pn in PATCH_NOTES:
        if not is_admin and pn.internal:
            continue
        entry: dict[str, Any] = {
            "version": pn.version,
            "released": pn.released.isoformat(),
            "title": pn.title,
            "highlights": list(pn.highlights),
            "commit": pn.commit,
        }
        if is_admin:
            entry["internal"] = pn.internal
        patches.append(entry)
    return {"patches": patches}

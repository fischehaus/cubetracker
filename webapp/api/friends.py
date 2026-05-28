"""Friends-API (Phase W.9).

Endpoints:
    GET    /friends/list                — eigene Liste (friends+pending)
    GET    /friends/search?q=...        — User per Display-Name suchen
    POST   /friends/lookup-email        — User per exakter Email finden
    POST   /friends/request             — Anfrage senden
    POST   /friends/{id}/accept         — eingehende Anfrage annehmen
    DELETE /friends/{id}                — abbrechen/ablehnen/entfreunden

Privacy-Design:
- User-Suche per Display-Name: nur User mit is_discoverable=true tauchen auf.
- Email-Lookup: exakte Adresse Pflicht, auch für nicht-discoverable User
  findbar. Begründung: man kann nur die Email kennen wenn man sie kennt —
  also ist's kein Enumeration-Pfad.
- Self-Match überall rausgefiltert.
- Friend-Request darf nur über Lookup-Result-IDs gestellt werden (nicht
  "irgendeine User-ID" sondern eine zuvor durch Suche/Email-Lookup
  ermittelte). Backend prüft das nicht explizit, weil der Client eh die
  ID kennen muss — und ein Boeswilliger kann ohnehin per Brute-Force
  IDs probieren. Mitigation: Rate-Limit.

Rate-Limits:
- Suche  : 60/min — generoeser als CRUD, kostet wenig
- Mutation: 30/min — gegen Friend-Spam
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session as OrmSession

from auth.deps import get_current_user, require_not_demo
from auth.rate_limit import limiter
from db.database import get_db
from db.models import Friendship, User
from friends.service import (
    FriendsServiceError,
    accept_request,
    list_for_user,
    lookup_user_by_email,
    remove_friendship,
    search_discoverable_users,
    send_request,
    status_between,
)

# Type-Alias für die Pre-Loaded Friendship-Map (siehe _bulk_status_map)
_StatusMap = dict[int, tuple[str, int | None]]

router = APIRouter(prefix="/friends", tags=["friends"])

# Display-Name-Suche ist breit (prefix-match) und nur auf discoverable User
SEARCH_LIMIT = "60/minute"
# Email-Lookup ist exakter Match -> nuetzbar für Brute-Force von Emails;
# QA-Fix M1 hält das halbiert + zusätzlich nur authentifizierte User.
EMAIL_LOOKUP_LIMIT = "30/minute"
MUTATION_LIMIT = "30/minute"


# ============================================================
# Schemas
# ============================================================


class FriendUserBrief(BaseModel):
    """Mini-Darstellung eines Users — ohne private Felder (Email!)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str | None
    # email wird NUR für accepted-Friends mit-ausgeliefert (Friend-Mail-
    # Wunsch). Bei pending requests / suchen NICHT. Wird im Endpoint
    # gesteuert (per separate Helper-Funktion). Default None.
    email: EmailStr | None = None


class FriendshipRead(BaseModel):
    """Eine Friendship-Row aus Sicht des current_user.

    other = der jeweils andere User (egal ob requester oder target).
    direction zeigt aus current_user-Sicht: hat er die Anfrage geschickt
    ("outgoing") oder bekommen ("incoming")?
    """

    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str  # "pending" | "accepted"
    direction: str  # "outgoing" | "incoming"
    other: FriendUserBrief
    created_at: str
    accepted_at: str | None


class FriendsListResponse(BaseModel):
    friends: list[FriendshipRead]
    incoming_pending: list[FriendshipRead]
    outgoing_pending: list[FriendshipRead]


class FriendSearchResult(BaseModel):
    """User-Suchtreffer mit Beziehungs-Status zu current_user."""

    id: int
    display_name: str | None
    # email NICHT zurückgeben — sonst wäre Suche ein Email-Leak für
    # discoverable User.
    relationship: str  # "none" | "outgoing_pending" | "incoming_pending" | "accepted"
    friendship_id: int | None = None


class FriendSearchResponse(BaseModel):
    results: list[FriendSearchResult]


class FriendRequestPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_user_id: int


class EmailLookupPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=255)


class EmailLookupResponse(BaseModel):
    found: bool
    user: FriendSearchResult | None = None


# ============================================================
# Helpers
# ============================================================


def _to_friendship_read(fs: Friendship, current_user_id: int) -> FriendshipRead:
    """Konvertiert Friendship-Row in Frontend-Sicht (other + direction)."""
    if fs.requester_id == current_user_id:
        other = fs.target
        direction = "outgoing"
    else:
        other = fs.requester
        direction = "incoming"
    # Email nur für accepted-Friends ausliefern — sie sind aktiv verbunden,
    # Email-Versand untereinander ist gewollter Friend-Feature-Stub
    # (W.10+). Pending-Anfragen leaken keine Email.
    email = other.email if fs.status == "accepted" else None
    return FriendshipRead(
        id=fs.id,
        status=fs.status,
        direction=direction,
        other=FriendUserBrief(
            id=other.id, display_name=other.display_name, email=email
        ),
        created_at=fs.created_at.isoformat() if fs.created_at else "",
        accepted_at=fs.accepted_at.isoformat() if fs.accepted_at else None,
    )


def _to_search_result(
    db: OrmSession, current_user: User, candidate: User
) -> FriendSearchResult:
    relationship, fs = status_between(db, current_user, candidate.id)
    return FriendSearchResult(
        id=candidate.id,
        display_name=candidate.display_name,
        relationship=relationship,
        friendship_id=fs.id if fs else None,
    )


def _bulk_status_map(
    db: OrmSession, current_user: User, candidate_ids: list[int]
) -> _StatusMap:
    """QA-Fix M2: statt N+1 status_between-Queries (eine pro Search-Treffer)
    holen wir alle relevanten Friendships in EINER Query und mappen sie.

    Returns: {candidate_id -> (relationship_string, friendship_id|None)}
    Default für nicht-vorhandene IDs: ("none", None).
    """
    if not candidate_ids:
        return {}
    rows = db.execute(
        select(Friendship).where(
            or_(
                (Friendship.requester_id == current_user.id)
                & (Friendship.target_id.in_(candidate_ids)),
                (Friendship.target_id == current_user.id)
                & (Friendship.requester_id.in_(candidate_ids)),
            )
        )
    ).scalars().all()
    out: _StatusMap = {}
    for fs in rows:
        other_id = (
            fs.target_id if fs.requester_id == current_user.id else fs.requester_id
        )
        if fs.status == "accepted":
            out[other_id] = ("accepted", fs.id)
        elif fs.requester_id == current_user.id:
            out[other_id] = ("outgoing_pending", fs.id)
        else:
            out[other_id] = ("incoming_pending", fs.id)
    return out


# ============================================================
# Endpoints
# ============================================================


@router.get("/list", response_model=FriendsListResponse)
def get_friends_list(
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> FriendsListResponse:
    """Alle Friendships des aktuellen Users gruppiert.

    Email der Freunde wird nur bei accepted-Status ausgeliefert.
    """
    groups = list_for_user(db, current_user)
    return FriendsListResponse(
        friends=[_to_friendship_read(fs, current_user.id) for fs in groups["friends"]],
        incoming_pending=[
            _to_friendship_read(fs, current_user.id)
            for fs in groups["incoming_pending"]
        ],
        outgoing_pending=[
            _to_friendship_read(fs, current_user.id)
            for fs in groups["outgoing_pending"]
        ],
    )


@router.get("/search", response_model=FriendSearchResponse)
@limiter.limit(SEARCH_LIMIT)
def search_users(
    request: Request,
    q: str = Query(..., min_length=2, max_length=64),
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
) -> FriendSearchResponse:
    """User-Suche per display_name (Prefix, case-insensitive).

    Nur User mit is_discoverable=true tauchen auf. Self-Match raus.
    Liefert pro Treffer den aktuellen Beziehungs-Status mit, damit das
    Frontend gleich den richtigen Button zeigt (Anfragen / Akzeptieren /
    Bereits-Freund).
    """
    candidates = search_discoverable_users(db, current_user, q)
    # QA-Fix M2: bulk-status-Lookup statt N+1.
    status_map = _bulk_status_map(db, current_user, [c.id for c in candidates])
    results = [
        FriendSearchResult(
            id=c.id,
            display_name=c.display_name,
            relationship=status_map.get(c.id, ("none", None))[0],
            friendship_id=status_map.get(c.id, ("none", None))[1],
        )
        for c in candidates
    ]
    return FriendSearchResponse(results=results)


@router.post("/lookup-email", response_model=EmailLookupResponse)
@limiter.limit(EMAIL_LOOKUP_LIMIT)
def lookup_email(
    request: Request,
    payload: EmailLookupPayload,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> EmailLookupResponse:
    """Exakter Email-Match. Umgeht is_discoverable, weil exakte Email
    schon ein Beleg ist dass beide sich kennen.

    Antwort für 'nicht gefunden' und 'inaktiv' ist identisch ({found:false}),
    sodass kein Account-Existence-Probing möglich ist.
    """
    user = lookup_user_by_email(db, current_user, payload.email)
    if user is None:
        return EmailLookupResponse(found=False, user=None)
    return EmailLookupResponse(
        found=True, user=_to_search_result(db, current_user, user)
    )


@router.post("/request", response_model=FriendshipRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(MUTATION_LIMIT)
def post_friend_request(
    request: Request,
    payload: FriendRequestPayload,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> FriendshipRead:
    """Neue Friend-Anfrage an einen User (per ID, von Search/Lookup-Result).

    Sicherheits-Checks im Service: kein self, target muss aktiv sein,
    keine Doppel-Anfrage. Bei reverse-pending → Auto-Accept (Sympathie-Path).
    """
    target = db.get(User, payload.target_user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden."
        )
    try:
        fs = send_request(db, current_user, target)
    except FriendsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    return _to_friendship_read(fs, current_user.id)


@router.post("/{friendship_id}/accept", response_model=FriendshipRead)
@limiter.limit(MUTATION_LIMIT)
def post_accept(
    request: Request,
    friendship_id: int,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> FriendshipRead:
    """Eingehende Anfrage annehmen.

    Idempotent: schon-accepted ist OK (Doppel-Klick-Schutz).
    """
    try:
        fs = accept_request(db, current_user, friendship_id)
    except FriendsServiceError as e:
        # 404 wenn nicht gefunden, 403 wenn fremde Anfrage, 400 sonst
        msg = str(e)
        if "nicht gefunden" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=msg
            ) from e
        if "Empfänger" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=msg
            ) from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=msg
        ) from e
    return _to_friendship_read(fs, current_user.id)


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(MUTATION_LIMIT)
def delete_friendship(
    request: Request,
    friendship_id: int,
    current_user: User = Depends(require_not_demo),
    db: OrmSession = Depends(get_db),
) -> None:
    """Friendship löschen — Mehrzweck-Endpoint (abbrechen, ablehnen,
    entfreunden). Beide Seiten dürfen bei accepted-Status löschen.
    """
    try:
        remove_friendship(db, current_user, friendship_id)
    except FriendsServiceError as e:
        msg = str(e)
        if "nicht gefunden" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=msg
            ) from e
        if "gehört" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=msg
            ) from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=msg
        ) from e

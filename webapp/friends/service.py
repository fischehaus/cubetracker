"""Friend-System-Service (Phase W.9).

Pure-Logic-Module mit DB-Session-Parameter. Stateless, exception-driven.

Workflow:
    send_request(A, B)  -> Friendship(requester=A, target=B, status='pending')
    accept_request(B, friendship_id) -> status='accepted', accepted_at=now
    remove_friendship(user, friendship_id) -> db.delete(friendship)

Symmetrie:
    "Sind A und B Freunde?" wird via OR-Suche beantwortet — entweder gibt's
    eine Row (requester=A, target=B) oder (requester=B, target=A) mit
    status='accepted'. find_friendship_between() macht das.

Privacy:
    User-Suche per display_name liefert nur User mit is_discoverable=true.
    Such-Query muss min 2 Zeichen lang sein (kein 1-Buchstaben-Enumerieren).
    Self-User wird aus dem Result-Set herausgefiltert.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

from db.models import Friendship, User


class FriendsServiceError(Exception):
    """Generischer Service-Fehler (Caller mapped auf passende HTTP-Codes)."""


# ============================================================
# Suche
# ============================================================


def search_discoverable_users(
    db: OrmSession,
    current_user: User,
    query: str,
    limit: int = 20,
) -> list[User]:
    """Sucht User mit is_discoverable=true deren display_name `query` matcht
    (Prefix-Match, case-insensitive).

    - min 2 Zeichen query (verhindert Massen-Enumeration durch 1-Buchstaben)
    - Self-User aus Ergebnis raus
    - Inaktive User raus (keine Freundschaft mit Karteileichen)
    - Max `limit` Ergebnisse (default 20)
    """
    q = query.strip()
    if len(q) < 2:
        return []
    # ILIKE statt LIKE damit case-insensitive auf Postgres. SQLite-fallback
    # wäre LIKE — wir laufen aber in Prod immer auf Postgres.
    pattern = f"{q}%"
    stmt = (
        select(User)
        .where(User.is_discoverable.is_(True))
        .where(User.is_active.is_(True))
        .where(User.id != current_user.id)
        .where(User.display_name.ilike(pattern))
        .order_by(User.display_name)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def lookup_user_by_email(
    db: OrmSession, current_user: User, email: str
) -> User | None:
    """Exakter Email-Match — case-insensitive. Self-User raus, inaktiv raus.

    Email-Lookup umgeht is_discoverable bewusst NICHT — das Friend-System
    soll nicht zur Email-Enumeration werden. Stattdessen muss der Anfragende
    die Email-Adresse exakt eingeben (was nur funktioniert wenn jemand sie
    ihm vorher gesagt hat).
    """
    normalized = email.strip().lower()
    if not normalized:
        return None
    user = db.scalar(select(User).where(User.email == normalized))
    if user is None:
        return None
    if user.id == current_user.id:
        return None
    if not user.is_active:
        return None
    return user


# ============================================================
# Friend-Status
# ============================================================


FriendStatusBetween = Literal[
    "none", "outgoing_pending", "incoming_pending", "accepted"
]


def find_friendship_between(
    db: OrmSession, user_a_id: int, user_b_id: int
) -> Friendship | None:
    """Sucht die Friendship-Row zwischen zwei Usern, egal welche Richtung."""
    if user_a_id == user_b_id:
        return None
    stmt = select(Friendship).where(
        or_(
            (Friendship.requester_id == user_a_id)
            & (Friendship.target_id == user_b_id),
            (Friendship.requester_id == user_b_id)
            & (Friendship.target_id == user_a_id),
        )
    )
    return db.scalar(stmt)


def status_between(
    db: OrmSession, current_user: User, other_user_id: int
) -> tuple[FriendStatusBetween, Friendship | None]:
    """Aus Sicht von current_user: welcher Status besteht mit other?

    Returns (status_string, friendship_or_none). Wird im /friends/search
    Ergebnis pro Treffer mitgeliefert, damit Frontend gleich den
    richtigen Button (Anfragen / Akzeptieren / Bereits-Freund) zeigt.
    """
    fs = find_friendship_between(db, current_user.id, other_user_id)
    if fs is None:
        return "none", None
    if fs.status == "accepted":
        return "accepted", fs
    # pending
    if fs.requester_id == current_user.id:
        return "outgoing_pending", fs
    return "incoming_pending", fs


# ============================================================
# Listing
# ============================================================


def list_for_user(db: OrmSession, current_user: User) -> dict[str, list[Friendship]]:
    """Alle Friendships eines Users gruppiert.

    Returns:
        {
            "friends": [...]               # status='accepted', beide Richtungen
            "incoming_pending": [...]       # ich bin target, status='pending'
            "outgoing_pending": [...]       # ich bin requester, status='pending'
        }
    """
    own_rows = db.execute(
        select(Friendship).where(
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.target_id == current_user.id,
            )
        )
    ).scalars().all()

    friends: list[Friendship] = []
    incoming: list[Friendship] = []
    outgoing: list[Friendship] = []
    for fs in own_rows:
        if fs.status == "accepted":
            friends.append(fs)
        elif fs.requester_id == current_user.id:
            outgoing.append(fs)
        else:
            incoming.append(fs)
    return {
        "friends": friends,
        "incoming_pending": incoming,
        "outgoing_pending": outgoing,
    }


# ============================================================
# Mutationen
# ============================================================


def send_request(
    db: OrmSession, requester: User, target: User
) -> Friendship:
    """Neue Friend-Request anlegen.

    Wenn schon eine Friendship existiert:
    - status='accepted' -> Error "Ihr seid bereits Freunde."
    - status='pending' & requester=current -> Error "Anfrage laeuft bereits."
    - status='pending' & requester=other  -> Error "Anfrage liegt schon
      bei dir, bitte unter Eingehende Anfragen annehmen."

    QA-Fix H2: KEIN Auto-Accept mehr. Wenn B vorher A angefragt hat und A
    klickt jetzt "Anfragen", würde Auto-Accept B's Email an A leaken
    (FriendshipRead.email wird ab status='accepted' mit-geliefert). User
    muss aktiv "Annehmen" klicken — keine Magic-Path-Privacy-Surprise.

    QA-Fix H1: cross-direction-Race ist auf DB-Ebene durch functional
    UniqueIndex (LEAST, GREATEST) abgesichert. Wenn trotzdem ein
    IntegrityError kommt (zwei parallele Sessions, beide sehen None,
    beide INSERTen): rollback + Retry mit find_friendship_between.
    """
    if requester.id == target.id:
        raise FriendsServiceError("Du kannst dich nicht selbst befreunden.")
    if not target.is_active:
        raise FriendsServiceError("Dieser User ist deaktiviert.")

    def _check_existing() -> None:
        existing = find_friendship_between(db, requester.id, target.id)
        if existing is None:
            return
        if existing.status == "accepted":
            raise FriendsServiceError("Ihr seid bereits Freunde.")
        # pending
        if existing.requester_id == requester.id:
            raise FriendsServiceError("Anfrage laeuft bereits.")
        # Andere Richtung pending — explizit auf Inbox verweisen statt
        # automatisch zu akzeptieren (H2).
        raise FriendsServiceError(
            "Diese Person hat dir bereits eine Freundes-Anfrage geschickt. "
            "Bitte unter 'Eingehende Anfragen' annehmen."
        )

    _check_existing()

    fs = Friendship(
        requester_id=requester.id,
        target_id=target.id,
        status="pending",
    )
    db.add(fs)
    try:
        db.commit()
    except IntegrityError:
        # Race: parallele Session hat eine konkurrierende Row gelegt zwischen
        # unserem _check_existing und db.commit(). Functional unique index
        # auf (LEAST, GREATEST) hat den Konflikt erkannt. Rollback +
        # erneut den Status pruefen — meldet jetzt die richtige Begründung.
        db.rollback()
        _check_existing()
        # Falls _check_existing nichts wirft (extrem unwahrscheinlich, z.B.
        # andere Session hat die Row inzwischen wieder gelöscht), retry
        # einmal — sonst geben wir generisch auf.
        fs = Friendship(
            requester_id=requester.id,
            target_id=target.id,
            status="pending",
        )
        db.add(fs)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise FriendsServiceError(
                "Anfrage konnte nicht angelegt werden — bitte erneut versuchen."
            ) from e
    db.refresh(fs)
    return fs


def accept_request(
    db: OrmSession, current_user: User, friendship_id: int
) -> Friendship:
    """Anfrage annehmen. Nur target darf annehmen.

    Idempotent: schon-accepted-Friendship wird ohne Fehler durchgereicht
    (vermeidet UI-Race wenn Doppel-Klick).
    """
    fs = db.get(Friendship, friendship_id)
    if fs is None:
        raise FriendsServiceError("Anfrage nicht gefunden.")
    if fs.target_id != current_user.id:
        raise FriendsServiceError("Nur der Empfaenger kann die Anfrage annehmen.")
    if fs.status == "accepted":
        return fs  # idempotent
    if fs.status != "pending":
        raise FriendsServiceError(f"Unerwarteter Status: {fs.status}")
    fs.status = "accepted"
    fs.accepted_at = datetime.now(UTC)
    db.commit()
    db.refresh(fs)
    return fs


def remove_friendship(
    db: OrmSession, current_user: User, friendship_id: int
) -> None:
    """Friendship löschen. Ein einziger Endpunkt deckt drei Use-Cases ab:

    - eigene ausgehende pending Anfrage abbrechen (current=requester)
    - eingehende pending Anfrage ablehnen (current=target)
    - bestehenden Friend entfernen (current=requester ODER target,
      status='accepted')

    Symmetrisch für 'accepted': beide Seiten dürfen unfriend'n.
    """
    fs = db.get(Friendship, friendship_id)
    if fs is None:
        raise FriendsServiceError("Anfrage/Friendship nicht gefunden.")
    if fs.requester_id != current_user.id and fs.target_id != current_user.id:
        raise FriendsServiceError("Diese Anfrage gehört nicht dir.")
    db.delete(fs)
    db.commit()

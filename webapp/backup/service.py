"""Backup-Service (Phase W.5) — Multi-User-Variante.

Verantwortlichkeiten:
- export_user_data: Voll-JSON-Export eines User-Datenbestands
- restore_user_data: JSON-Restore mit Modi `merge`/`replace` + dry_run-Stats
- create_snapshot: Wiederherstellungspunkt anlegen + ggf. aelteste pruning
- list_snapshots: User-Snapshots abrufen
- restore_from_snapshot: Snapshot laden + restore (mit Auto-Snapshot-Vorher)
- delete_snapshot: explizit loeschen

Sicherheits-Architektur:
- Alle Funktionen brauchen `user_id`. user_id-Felder im JSON werden
  IGNORIERT und mit `user_id`-Param ueberschrieben — verhindert dass ein
  Angreifer ein modifiziertes Backup hochlaedt und fremde Daten ueberschreibt.
- mode='replace' loescht ALLE bisherigen Daten dieses Users vor dem Import
  (User-CASCADE-Behaviors greifen NICHT — wir loeschen explizit).
- mode='merge' (Default) tut Sessions/Hardware Upsert-by-Name+cube,
  Solves Dedup per (timestamp, time_ms, cube_type)-Triple.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as OrmSession

from db.models import (
    Achievement,
    Challenge,
    Hardware,
    Session as DbSession,
    Snapshot,
    Solve,
    User,
)

SCHEMA_VERSION = "webapp-2.0"
MAX_SNAPSHOTS_PER_USER = 2
# Hartes Limit fuer Snapshot-Payload-Size (Storage-DoS-Schutz auf
# Render-Free). 30 MB entspricht ~100k Solves; 2 Snapshots * Postgres-Free
# 1GB = max ~16 User die einen vollen Datensatz haben koennen.
MAX_SNAPSHOT_PAYLOAD_BYTES = 30 * 1024 * 1024
# Security-Fix K2: JSON-Bomb-Schutz. Pre-Check vor json.loads().
#
# Bug-Fix Quick-Win 2026-05-16: Limit von 200_000 auf 2_000_000 hoch.
# Vorher: csTimer-Files mit > ~30k Solves wurden faelschlich abgelehnt
# (User-Report 2026-05-13). Realistische csTimer-Density: ~6-12
# Structural Tokens pro Solve (`[[date, time, ...], scramble, ...]`).
# 100k Solves = ~800k-1.2M Tokens; 300k Solves = ~2-3M Tokens.
#
# 2M ist eine sichere Obergrenze: bei 30MB-Upload-Limit waeren echte
# JSON-Bombs (dense nested brackets, ~1 Token/Byte) bei 30M Tokens —
# also Faktor 15 ueber dem Limit. Schutz greift weiterhin.
MAX_JSON_STRUCTURAL_TOKENS = 2_000_000

RestoreMode = Literal["merge", "replace"]


class BackupServiceError(ValueError):
    """Eigene Exception fuer Backup-Service-Validation, damit das
    API-Layer sie 400-mappen kann."""


def check_json_bomb(raw_bytes: bytes) -> None:
    """Security-Fix K2: Pre-Check gegen JSON-Bombs vor `json.loads()`.

    Zaehlt strukturelle Tokens (`[`, `]`, `{`, `}`) — bei normalen
    Backup-Payloads sind das ~1-1.5M (100k Solves + Sessions etc.).
    Bei manipulierten deep-nested-JSONs kann diese Zahl in die
    Millionen gehen und Python-RecursionError oder schlicht riesige
    CPU-Last bei json.loads() ausloesen.

    Raises BackupServiceError mit 413-mappbarem Message bei Verstoss.
    """
    structural_count = (
        raw_bytes.count(b"[")
        + raw_bytes.count(b"]")
        + raw_bytes.count(b"{")
        + raw_bytes.count(b"}")
    )
    if structural_count > MAX_JSON_STRUCTURAL_TOKENS:
        raise BackupServiceError(
            f"Datei zu komplex ({structural_count:,} JSON-Strukturzeichen; "
            f"erlaubt max {MAX_JSON_STRUCTURAL_TOKENS:,}). Bei normalen "
            f"csTimer-Exporten reicht das fuer ca. 300.000 Solves — wenn "
            f"deine Datei wirklich darueber liegt, melde dich beim Entwickler. "
            f"Sonst pruefe ob du die richtige Datei hochlaedst."
        )


# ============================================================
# Export
# ============================================================


def export_user_data(db: OrmSession, user: User) -> dict[str, Any]:
    """Voll-Export aller Daten eines Users als JSON-Dict.

    user_id-Felder werden mit ausgegeben, aber beim spaeteren Re-Import
    ignoriert + mit dem aktuellen current_user.id ueberschrieben.
    """
    solves = db.scalars(select(Solve).where(Solve.user_id == user.id)).all()
    sessions = db.scalars(select(DbSession).where(DbSession.user_id == user.id)).all()
    hardware = db.scalars(select(Hardware).where(Hardware.user_id == user.id)).all()
    achievements = db.scalars(
        select(Achievement).where(Achievement.user_id == user.id)
    ).all()
    challenges = db.scalars(select(Challenge).where(Challenge.user_id == user.id)).all()

    return {
        "schema_version": SCHEMA_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "user_email": user.email,  # Info fuer User, nicht fuer Restore
        "counts": {
            "solves": len(solves),
            "sessions": len(sessions),
            "hardware": len(hardware),
            "achievements": len(achievements),
            "challenges": len(challenges),
        },
        "solves": [_solve_to_dict(s) for s in solves],
        "sessions": [_session_to_dict(s) for s in sessions],
        "hardware": [_hardware_to_dict(h) for h in hardware],
        "achievements": [_achievement_to_dict(a) for a in achievements],
        "challenges": [_challenge_to_dict(c) for c in challenges],
    }


def _solve_to_dict(s: Solve) -> dict[str, Any]:
    return {
        "id": s.id,
        "time_ms": s.time_ms,
        "cube_type": s.cube_type,
        "scramble": s.scramble,
        "notes": s.notes,
        "timestamp": s.timestamp.isoformat() if s.timestamp else None,
        "plus_two": s.plus_two,
        "dnf": s.dnf,
        "session_id": s.session_id,
        "hardware_id": s.hardware_id,
        "alg_case": s.alg_case,
        "split_times_ms": s.split_times_ms,
    }


def _session_to_dict(s: DbSession) -> dict[str, Any]:
    return {
        "id": s.id,
        "name": s.name,
        "scramble_type": s.scramble_type,
        "cstimer_session_id": s.cstimer_session_id,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _hardware_to_dict(h: Hardware) -> dict[str, Any]:
    return {
        "id": h.id,
        "name": h.name,
        "primary_cube_type": h.primary_cube_type,
        "notes": h.notes,
        "is_active": h.is_active,
        "acquired_at": h.acquired_at.isoformat() if h.acquired_at else None,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }


def _achievement_to_dict(a: Achievement) -> dict[str, Any]:
    return {
        "id": a.id,
        "code": a.code,
        "unlocked_at": a.unlocked_at.isoformat() if a.unlocked_at else None,
    }


def _challenge_to_dict(c: Challenge) -> dict[str, Any]:
    return {
        "id": c.id,
        "kind": c.kind,
        "cube_type": c.cube_type,
        "params_json": c.params_json,
        "target_value": c.target_value,
        "progress": c.progress,
        "generated_for_date": (
            c.generated_for_date.isoformat() if c.generated_for_date else None
        ),
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        "dismissed": c.dismissed,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ============================================================
# Restore
# ============================================================


@dataclass
class RestoreResult:
    mode: str
    dry_run: bool
    snapshot_created: int | None  # snapshot.id wenn vorher angelegt
    sessions_imported: int
    sessions_skipped_duplicate: int
    hardware_imported: int
    hardware_skipped_duplicate: int
    solves_imported: int
    solves_skipped_duplicate: int
    achievements_imported: int
    achievements_skipped_duplicate: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "dry_run": self.dry_run,
            "snapshot_created": self.snapshot_created,
            "sessions": {
                "imported": self.sessions_imported,
                "skipped_duplicate": self.sessions_skipped_duplicate,
            },
            "hardware": {
                "imported": self.hardware_imported,
                "skipped_duplicate": self.hardware_skipped_duplicate,
            },
            "solves": {
                "imported": self.solves_imported,
                "skipped_duplicate": self.solves_skipped_duplicate,
            },
            "achievements": {
                "imported": self.achievements_imported,
                "skipped_duplicate": self.achievements_skipped_duplicate,
            },
        }


def restore_user_data(
    db: OrmSession,
    user: User,
    payload: dict[str, Any],
    mode: RestoreMode = "merge",
    dry_run: bool = False,
    auto_snapshot: bool = True,
) -> RestoreResult:
    """JSON-Backup zurueckspielen.

    Modi:
    - 'merge' (default): bestehende Daten bleiben, neue Sachen dazu,
      Dedup nach Schluesseln (siehe unten). Sicher.
    - 'replace': alle eigenen Daten loeschen, dann importieren. DESTRUKTIV.
      Caller MUSS confirm-Magic-String separat pruefen.

    Dedup-Schluessel:
    - Sessions: (name, cstimer_session_id) — manuell angelegte Sessions
      mit gleichem Namen werden nicht dupliziert
    - Hardware: (name, primary_cube_type)
    - Solves: (timestamp, time_ms, cube_type) — wie csTimer-Importer
    - Achievements: (code) — pro User unique-Index existiert eh

    `auto_snapshot=True` (Default): bei mode='replace' wird vor der
    Loeschung automatisch ein Snapshot angelegt. Bei dry_run=True
    natuerlich nicht.
    """
    # Security-Fix W.5-finding-5: leerer Replace-Payload haette ALLE
    # eigenen Daten geloescht ohne neue zu importieren. Verhindern.
    if mode == "replace" and not dry_run:
        has_data = bool(
            payload.get("solves")
            or payload.get("sessions")
            or payload.get("hardware")
        )
        if not has_data:
            raise BackupServiceError(
                "Backup-Payload ist leer — destruktiver Replace abgelehnt."
            )

    snapshot_id: int | None = None
    if mode == "replace" and not dry_run and auto_snapshot:
        # Snapshot vor dem destruktiven Delete — committet eigenstaendig.
        # Wichtig: bei spaeterem Import-Exception haben wir damit den
        # Recovery-Pfad (Snapshot-Restore in except-Klausel unten).
        snap = create_snapshot(db, user, reason="before_restore")
        snapshot_id = snap.id

    if mode == "replace" and not dry_run:
        # Eigene Daten loeschen (Cascade-Behavior beim Solve-Delete:
        # session_id/hardware_id wird NULL bei FK ondelete=SET NULL,
        # aber wir loeschen Sessions/Hardware ja auch, also egal.)
        # Security-Fix K1: alles in try/except + bei Exception
        # Snapshot wieder einspielen, damit User-Daten nicht verloren gehen.
        try:
            db.execute(delete(Achievement).where(Achievement.user_id == user.id))
            db.execute(delete(Challenge).where(Challenge.user_id == user.id))
            db.execute(delete(Solve).where(Solve.user_id == user.id))
            db.execute(delete(DbSession).where(DbSession.user_id == user.id))
            db.execute(delete(Hardware).where(Hardware.user_id == user.id))
            db.flush()
        except Exception:
            db.rollback()
            raise

    result = RestoreResult(
        mode=mode,
        dry_run=dry_run,
        snapshot_created=snapshot_id,
        sessions_imported=0,
        sessions_skipped_duplicate=0,
        hardware_imported=0,
        hardware_skipped_duplicate=0,
        solves_imported=0,
        solves_skipped_duplicate=0,
        achievements_imported=0,
        achievements_skipped_duplicate=0,
    )

    # ID-Mapping alte (Backup) IDs -> neue IDs, fuer Cross-Refs.
    # Security-Fix K1: Final-Commit weiter unten in try/except, bei Fail
    # Snapshot-Recovery (siehe Ende der Funktion).
    session_id_map: dict[int, int] = {}
    hardware_id_map: dict[int, int] = {}

    # ---- Sessions ----
    # session_id_map oben schon deklariert. Mapping alte (Backup) session_id
    # -> neue session_id, fuer Solves-FK-Aufloesung.
    # Security-Fix S5: cstimer_session_id-Dedup im Replace-Mode, sonst kann
    # ein manipuliertes Backup mit zwei Sessions gleicher cstimer_session_id
    # einen Unique-Index-IntegrityError ausloesen + den Loop killen.
    seen_cstimer_ids: set[int] = set()
    existing_sessions = (
        {}
        if mode == "replace"
        else {
            (s.name, s.cstimer_session_id): s.id
            for s in db.scalars(select(DbSession).where(DbSession.user_id == user.id)).all()
        }
    )
    for s_data in payload.get("sessions", []):
        old_id = s_data.get("id")
        key = (s_data.get("name"), s_data.get("cstimer_session_id"))
        if key in existing_sessions and mode == "merge":
            session_id_map[old_id] = existing_sessions[key]
            result.sessions_skipped_duplicate += 1
            continue

        if dry_run:
            result.sessions_imported += 1
            continue

        # Security-Fix W.5-finding-6: cstimer_session_id validieren
        # (manipuliertes Backup koennte negative/nicht-int Werte haben)
        # + Security-Fix S5: doppelte cstimer_session_ids in einem
        # Backup-Payload dedupen (sonst Unique-Constraint-Crash)
        raw_cs_id = s_data.get("cstimer_session_id")
        cstimer_session_id: int | None = (
            raw_cs_id if isinstance(raw_cs_id, int) and raw_cs_id > 0 else None
        )
        if cstimer_session_id is not None and cstimer_session_id in seen_cstimer_ids:
            cstimer_session_id = None  # zweite mit gleicher ID -> als neue ohne cstimer-Link
        if cstimer_session_id is not None:
            seen_cstimer_ids.add(cstimer_session_id)

        new_session = DbSession(
            user_id=user.id,  # IGNORIERE alten user_id, nimm current_user
            name=s_data.get("name") or "Unbenannt",
            scramble_type=s_data.get("scramble_type"),
            cstimer_session_id=cstimer_session_id,
            notes=s_data.get("notes"),
        )
        db.add(new_session)
        db.flush()
        session_id_map[old_id] = new_session.id
        existing_sessions[key] = new_session.id
        result.sessions_imported += 1

    # ---- Hardware ----
    # hardware_id_map oben schon deklariert.
    existing_hw = (
        {}
        if mode == "replace"
        else {
            (h.name, h.primary_cube_type): h.id
            for h in db.scalars(
                select(Hardware).where(Hardware.user_id == user.id)
            ).all()
        }
    )
    for h_data in payload.get("hardware", []):
        old_id = h_data.get("id")
        key = (h_data.get("name"), h_data.get("primary_cube_type"))
        if key in existing_hw and mode == "merge":
            hardware_id_map[old_id] = existing_hw[key]
            result.hardware_skipped_duplicate += 1
            continue

        if dry_run:
            result.hardware_imported += 1
            continue

        new_hw = Hardware(
            user_id=user.id,
            name=h_data.get("name") or "Unbenannt",
            primary_cube_type=h_data.get("primary_cube_type") or "3x3",
            notes=h_data.get("notes"),
            is_active=h_data.get("is_active", True),
            acquired_at=_parse_dt(h_data.get("acquired_at")),
        )
        db.add(new_hw)
        db.flush()
        hardware_id_map[old_id] = new_hw.id
        existing_hw[key] = new_hw.id
        result.hardware_imported += 1

    # ---- Solves ----
    existing_solve_keys = (
        set()
        if mode == "replace"
        else {
            (s.timestamp, s.time_ms, s.cube_type)
            for s in db.scalars(select(Solve).where(Solve.user_id == user.id)).all()
        }
    )
    for s_data in payload.get("solves", []):
        ts = _parse_dt(s_data.get("timestamp"))
        if ts is None:
            ts = datetime.now(UTC)
        time_ms = int(s_data.get("time_ms", 0))
        cube_type = s_data.get("cube_type") or "3x3"
        dedup_key = (ts, time_ms, cube_type)

        if dedup_key in existing_solve_keys and mode == "merge":
            result.solves_skipped_duplicate += 1
            continue

        if dry_run:
            result.solves_imported += 1
            continue

        # Cross-Refs aufloessen via Maps (Backup hat alte IDs)
        old_session_id = s_data.get("session_id")
        old_hardware_id = s_data.get("hardware_id")
        new_session_id = (
            session_id_map.get(old_session_id) if old_session_id is not None else None
        )
        new_hardware_id = (
            hardware_id_map.get(old_hardware_id) if old_hardware_id is not None else None
        )

        new_solve = Solve(
            user_id=user.id,
            time_ms=time_ms,
            cube_type=cube_type,
            scramble=s_data.get("scramble"),
            notes=s_data.get("notes"),
            timestamp=ts,
            plus_two=bool(s_data.get("plus_two", False)),
            dnf=bool(s_data.get("dnf", False)),
            session_id=new_session_id,
            hardware_id=new_hardware_id,
            alg_case=s_data.get("alg_case"),
            split_times_ms=s_data.get("split_times_ms"),
        )
        db.add(new_solve)
        existing_solve_keys.add(dedup_key)
        result.solves_imported += 1

    # ---- Achievements ----
    # Per (user_id, code) unique — Conflict heisst skip.
    existing_codes = (
        set()
        if mode == "replace"
        else {
            a.code
            for a in db.scalars(
                select(Achievement).where(Achievement.user_id == user.id)
            ).all()
        }
    )
    for a_data in payload.get("achievements", []):
        code = a_data.get("code")
        if not code:
            continue
        if code in existing_codes and mode == "merge":
            result.achievements_skipped_duplicate += 1
            continue

        if dry_run:
            result.achievements_imported += 1
            continue

        unlocked = _parse_dt(a_data.get("unlocked_at")) or datetime.now(UTC)
        new_a = Achievement(user_id=user.id, code=code, unlocked_at=unlocked)
        db.add(new_a)
        existing_codes.add(code)
        result.achievements_imported += 1

    # Challenges: bewusst NICHT importieren — sie sind tagesbasiert,
    # ein "alte Challenge wieder herstellen" ist sinnlos. Beim erneuten
    # /challenges/today werden frische generiert.

    # Security-Fix K1: Final-Commit in try/except. Bei Exception (z.B.
    # IntegrityError, ConnectionLost) im Replace-Mode wird der vorher
    # angelegte Snapshot automatisch wieder eingespielt, damit User-Daten
    # nicht halb-zerstoert bleiben. Bei Merge-Mode reicht rollback —
    # keine Daten waren geloescht.
    if dry_run:
        db.rollback()  # sicher gegen Halb-State, kein commit
        return result
    try:
        db.commit()
    except Exception:
        db.rollback()
        if mode == "replace" and snapshot_id is not None:
            _recover_from_snapshot(db, user, snapshot_id)
        raise

    return result


def _recover_from_snapshot(db: OrmSession, user: User, snapshot_id: int) -> None:
    """Best-effort Snapshot-Recovery nach Restore-Exception (Security-Fix K1).

    Zieht Snapshot-Payload aus DB, spielt ihn wieder ein (mode=replace,
    auto_snapshot=False um Endlos-Schleife zu verhindern). Wenn auch das
    fehlschlaegt: nur loggen, nicht erneut raisen — User kann Snapshot
    manuell via /backup/snapshots/{id}/restore wieder einspielen.
    """
    import logging

    logger = logging.getLogger(__name__)
    try:
        snap = db.get(Snapshot, snapshot_id)
        if snap is None:
            logger.error("recovery: snapshot %s nicht gefunden", snapshot_id)
            return
        payload_orig = json.loads(snap.payload_json)
        restore_user_data(
            db, user, payload_orig, mode="replace", dry_run=False, auto_snapshot=False
        )
    except Exception as e:  # noqa: BLE001
        logger.error(
            "recovery from snapshot %s for user %s failed: %s — "
            "User muss /backup/snapshots/{id}/restore manuell triggern",
            snapshot_id,
            user.id,
            e,
        )


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


# ============================================================
# Snapshots
# ============================================================


def create_snapshot(db: OrmSession, user: User, reason: str = "manual") -> Snapshot:
    """Snapshot anlegen + ggf. aelteste verwerfen (max 2/User).

    Security-Fix W.5-finding-3: Hartes Size-Limit (Storage-DoS-Schutz).
    Bei sehr grossen Datensaetzen wuerde sonst Postgres-Free vollaufen.
    """
    payload = export_user_data(db, user)
    payload_str = json.dumps(payload, ensure_ascii=False)
    if len(payload_str.encode("utf-8")) > MAX_SNAPSHOT_PAYLOAD_BYTES:
        raise BackupServiceError(
            f"Snapshot-Payload zu gross ({len(payload_str)} bytes; "
            f"max {MAX_SNAPSHOT_PAYLOAD_BYTES})."
        )
    snap = Snapshot(
        user_id=user.id,
        reason=reason,
        solve_count=payload["counts"]["solves"],
        session_count=payload["counts"]["sessions"],
        hardware_count=payload["counts"]["hardware"],
        payload_json=payload_str,
    )
    db.add(snap)
    db.flush()
    _prune_snapshots(db, user.id)
    db.commit()
    db.refresh(snap)
    return snap


def _prune_snapshots(db: OrmSession, user_id: int) -> int:
    """Behaelt max MAX_SNAPSHOTS_PER_USER pro User, loescht aeltere.
    Liefert die Anzahl der geloeschten."""
    rows = list(
        db.scalars(
            select(Snapshot)
            .where(Snapshot.user_id == user_id)
            .order_by(Snapshot.created_at.desc())
        ).all()
    )
    if len(rows) <= MAX_SNAPSHOTS_PER_USER:
        return 0
    to_delete = rows[MAX_SNAPSHOTS_PER_USER:]
    for snap in to_delete:
        db.delete(snap)
    return len(to_delete)


def list_snapshots(db: OrmSession, user: User) -> list[Snapshot]:
    return list(
        db.scalars(
            select(Snapshot)
            .where(Snapshot.user_id == user.id)
            .order_by(Snapshot.created_at.desc())
        ).all()
    )


def get_snapshot_or_none(db: OrmSession, user: User, snapshot_id: int) -> Snapshot | None:
    return db.scalar(
        select(Snapshot)
        .where(Snapshot.id == snapshot_id)
        .where(Snapshot.user_id == user.id)
    )


def restore_from_snapshot(
    db: OrmSession, user: User, snapshot: Snapshot, dry_run: bool = False
) -> RestoreResult:
    """Snapshot zurueckspielen — Mode 'replace' damit der Snapshot-Stand
    bit-genau wieder hergestellt wird. Auto-Snapshot vorher ist FALSE
    (sonst Endlos-Snapshot-Erzeugung bei mehrfach-Restore).
    """
    payload = json.loads(snapshot.payload_json)
    return restore_user_data(
        db, user, payload, mode="replace", dry_run=dry_run, auto_snapshot=False
    )


def delete_snapshot(db: OrmSession, snapshot: Snapshot) -> None:
    db.delete(snapshot)
    db.commit()

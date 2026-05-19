// AdminUsersPanel — User-Tabelle mit Inline-Aktionen.
//
// Aktionen:
//   - is_active toggle (deaktivieren/aktivieren)
//   - email_verified toggle (manuell verifizieren bei Mail-Problemen)
//   - Mail senden (Modal mit Subject + Body)
//   - Hard-Delete (DSGVO, Confirm-Dialog mit Pflicht-Typing)
//
// Self-Protection: der eingeloggte Admin sieht bei sich selbst keine
// destruktiven Buttons (Backend würde 400 zurueckgeben, aber wir
// blenden die Knoepfe sowieso aus damit der Fehler erst gar nicht
// kommt).

import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { InfoButton } from "./InfoButton";
import {
  useAdminDeleteUser,
  useAdminPatchUser,
  useAdminSendEmail,
  useAdminUsers,
  type AdminUser,
} from "../lib/api";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 1000 / 86400);
    if (days === 0) return "heute";
    if (days === 1) return "gestern";
    if (days < 7) return `vor ${days}d`;
    if (days < 30) return `vor ${Math.floor(days / 7)}w`;
    if (days < 365) return `vor ${Math.floor(days / 30)}mo`;
    return `vor ${Math.floor(days / 365)}y`;
  } catch {
    return iso;
  }
}

export function AdminUsersPanel() {
  const { user: me } = useAuth();
  const myId = me?.id ?? -1;
  const isAdmin = me?.is_admin ?? false;
  const { data, isLoading, error, refetch, isFetching } = useAdminUsers(isAdmin);

  // Inline-State für Confirm-/Mail-Dialoge
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [mailFor, setMailFor] = useState<AdminUser | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">Lade User-Liste …</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">
          Fehler beim Laden:{" "}
          {error instanceof Error ? error.message : "unbekannt"}
        </p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-purple-300">
            User-Liste{" "}
            <span className="text-sm text-gray-500">({data.count})</span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">User-Liste</p>
            <p>
              Alle registrierten User mit Solve-Count, Last-Active, Status-
              Badges. Aktionen pro User: Mail senden, Email manuell als
              verifiziert markieren (Support-Hilfe), Deaktivieren/Aktivieren,
              DSGVO-Hard-Delete (mit Pflicht-Confirm-String). Du kannst
              dich selbst nicht deaktivieren/löschen.
            </p>
          </InfoButton>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-600 disabled:opacity-50"
        >
          {isFetching ? "…" : "↻"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-700">
              <th className="py-2 pr-3">Email / Name</th>
              <th className="py-2 pr-3">Solves</th>
              <th className="py-2 pr-3">Zuletzt aktiv</th>
              <th className="py-2 pr-3">Reg.</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isMe={u.id === myId}
                onWantDelete={() => {
                  setConfirmDelete(u);
                  setDeleteTyped("");
                }}
                onWantMail={() => setMailFor(u)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmDeleteDialog
          user={confirmDelete}
          typed={deleteTyped}
          onTypedChange={setDeleteTyped}
          onClose={() => {
            setConfirmDelete(null);
            setDeleteTyped("");
          }}
        />
      )}
      {mailFor && (
        <MailUserDialog user={mailFor} onClose={() => setMailFor(null)} />
      )}
    </div>
  );
}

// ============================================================
// User-Zeile
// ============================================================

function UserRow({
  user,
  isMe,
  onWantDelete,
  onWantMail,
}: {
  user: AdminUser;
  isMe: boolean;
  onWantDelete: () => void;
  onWantMail: () => void;
}) {
  const patch = useAdminPatchUser();

  const toggleActive = () =>
    patch.mutate({
      userId: user.id,
      patch: { is_active: !user.is_active },
    });

  const toggleVerified = () =>
    patch.mutate({
      userId: user.id,
      patch: { email_verified: !user.email_verified },
    });

  // Phase W.admin-toggle (2026-05-17): is_admin toggle. Backend faengt
  // "letzter Admin" → 400 ab (siehe api/admin.py:update_user).
  const toggleAdmin = () =>
    patch.mutate({
      userId: user.id,
      patch: { is_admin: !user.is_admin },
    });

  return (
    <tr className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
      <td className="py-2 pr-3">
        <div className="font-mono text-gray-200">
          {user.email}
          {user.is_admin && (
            <span
              className="ml-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-200"
              title="Admin (via DB-Spalte users.is_admin)"
            >
              ADMIN
            </span>
          )}
          {isMe && (
            <span className="ml-2 text-[10px] uppercase text-gray-500">
              (du)
            </span>
          )}
        </div>
        {user.display_name && (
          <div className="text-xs text-gray-500">{user.display_name}</div>
        )}
      </td>
      <td className="py-2 pr-3 text-gray-300">
        {user.solve_count.toLocaleString("de-DE")}
      </td>
      <td className="py-2 pr-3 text-gray-300" title={user.last_solve_at ?? ""}>
        {fmtRelative(user.last_solve_at)}
      </td>
      <td className="py-2 pr-3 text-gray-400" title={user.created_at ?? ""}>
        {fmtDate(user.created_at)}
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              user.is_active
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {user.is_active ? "aktiv" : "deaktiviert"}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              user.email_verified
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            {user.email_verified ? "verifiziert" : "unverifiziert"}
          </span>
        </div>
      </td>
      <td className="py-2 pr-0">
        <div className="flex flex-wrap justify-end gap-1.5 text-xs">
          <button
            onClick={onWantMail}
            disabled={patch.isPending}
            className="rounded bg-purple-600/30 px-2 py-1 text-purple-200 hover:bg-purple-600/50 disabled:opacity-50"
            title="Mail an diesen User"
          >
            ✉ Mail
          </button>
          {!user.email_verified && (
            <button
              onClick={toggleVerified}
              disabled={patch.isPending}
              className="rounded bg-emerald-600/30 px-2 py-1 text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
              title="Email als verifiziert markieren (Support-Hilfe)"
            >
              ✓ verifizieren
            </button>
          )}
          {!isMe && (
            <button
              onClick={toggleAdmin}
              disabled={patch.isPending}
              className={`rounded px-2 py-1 disabled:opacity-50 ${
                user.is_admin
                  ? "bg-purple-600/30 text-purple-200 hover:bg-purple-600/50"
                  : "bg-gray-700/40 text-gray-300 hover:bg-purple-600/30 hover:text-purple-200"
              }`}
              title={
                user.is_admin
                  ? "Admin-Status entziehen (mind. 1 Admin muss uebrig bleiben)"
                  : "Zum Admin machen (volle Admin-UI-Berechtigung)"
              }
            >
              {user.is_admin ? "★ Admin abnehmen" : "☆ Admin machen"}
            </button>
          )}
          {!isMe && (
            <button
              onClick={toggleActive}
              disabled={patch.isPending}
              className={`rounded px-2 py-1 disabled:opacity-50 ${
                user.is_active
                  ? "bg-yellow-600/30 text-yellow-200 hover:bg-yellow-600/50"
                  : "bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50"
              }`}
              title={
                user.is_active
                  ? "Deaktivieren (Login geblockt, Daten bleiben)"
                  : "Reaktivieren"
              }
            >
              {user.is_active ? "⏸ deaktivieren" : "▶ aktivieren"}
            </button>
          )}
          {!isMe && (
            <button
              onClick={onWantDelete}
              disabled={patch.isPending}
              className="rounded bg-red-600/30 px-2 py-1 text-red-200 hover:bg-red-600/50 disabled:opacity-50"
              title="DSGVO-Löschen (Cascade, alle Daten weg)"
            >
              🗑 löschen
            </button>
          )}
        </div>
        {patch.isError && (
          <div className="mt-1 text-right text-[10px] text-red-300">
            {patch.error?.message}
          </div>
        )}
      </td>
    </tr>
  );
}

// ============================================================
// Confirm-Delete-Dialog
// ============================================================

function ConfirmDeleteDialog({
  user,
  typed,
  onTypedChange,
  onClose,
}: {
  user: AdminUser;
  typed: string;
  onTypedChange: (s: string) => void;
  onClose: () => void;
}) {
  const del = useAdminDeleteUser();
  const expected = `DELETE_USER_${user.id}`;
  const canDelete = typed === expected && !del.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-red-500/40 bg-gray-900 p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-lg font-semibold text-red-300">
          User wirklich löschen?
        </h4>
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            User <strong>{user.email}</strong> (ID {user.id}) + ALLE Daten
            werden unwiderruflich gelöscht — Solves, Sessions, Hardware,
            Snapshots, Achievements (Cascade).
          </p>
          <p className="text-yellow-300">
            DSGVO-Pflicht-Operation. Nicht rueckgaengig zu machen.
          </p>
        </div>
        <label className="flex flex-col text-xs text-gray-400">
          Zum Bestaetigen tippe <code className="text-red-300">{expected}</code>:
          <input
            type="text"
            value={typed}
            onChange={(e) => onTypedChange(e.target.value)}
            autoFocus
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 focus:border-red-500 focus:outline-none"
            placeholder={expected}
          />
        </label>
        {del.isError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {del.error?.message}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={() =>
              del.mutate({ userId: user.id }, { onSuccess: onClose })
            }
            disabled={!canDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {del.isPending ? "Löschen …" : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Mail-User-Dialog
// ============================================================

function MailUserDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const send = useAdminSendEmail();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const submit = () => {
    if (!subject.trim() || !body.trim()) return;
    send.mutate(
      { userId: user.id, subject: subject.trim(), body: body.trim() },
      {
        onSuccess: (r) => {
          if (r.success) {
            onClose();
          }
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-lg font-semibold text-purple-300">
          Mail an {user.email}
        </h4>
        <label className="flex flex-col text-xs text-gray-400">
          Betreff
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            autoFocus
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          />
          <span className="mt-0.5 text-[10px] text-gray-500">
            Wird automatisch zu „[cubetracker] {subject || "…"}"
          </span>
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          Text (Plain — Newlines werden im Mail-HTML zu &lt;br&gt;)
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={4000}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
            placeholder="Hi, ich wollte dir noch sagen …"
          />
          <span className="mt-0.5 text-[10px] text-gray-500">
            {body.length} / 4000
          </span>
        </label>
        {send.isError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {send.error?.message}
          </div>
        )}
        {send.data && !send.data.success && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Send fehlgeschlagen: {send.data.error ?? "unbekannt"}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={
              send.isPending || !subject.trim() || !body.trim()
            }
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {send.isPending ? "Sende …" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

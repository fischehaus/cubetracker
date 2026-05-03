// SessionList: Verwaltung aller Sessions (Phase 5b-3).
//
// Liste aller Sessions, mit Inline-Edit fuer Name + Notizen,
// Loeschen mit Confirm. Neue Session anlegen via Inline-Form.
//
// Loeschen entfernt nur die Session — betroffene Solves bleiben
// erhalten, verlieren aber ihre session_id (FK SET NULL).

import { useState } from "react";
import {
  useCreateSession,
  useDeleteSession,
  useSessions,
  useUpdateSession,
} from "../lib/api";
import type { Session } from "../lib/types";

type EditState = { id: number; field: "name" | "notes"; value: string } | null;

export function SessionList() {
  const { data: sessions, isLoading } = useSessions();
  const create = useCreateSession();
  const update = useUpdateSession();
  const del = useDeleteSession();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<EditState>(null);

  function startEdit(s: Session, field: "name" | "notes") {
    setEditing({
      id: s.id,
      field,
      value: field === "name" ? s.name : (s.notes ?? ""),
    });
  }

  function saveEdit() {
    if (!editing) return;
    const payload =
      editing.field === "name"
        ? { name: editing.value.trim() || undefined }
        : { notes: editing.value.trim() || null };
    if (editing.field === "name" && !editing.value.trim()) return;
    update.mutate(
      { id: editing.id, payload },
      { onSuccess: () => setEditing(null) }
    );
  }

  function addNew() {
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setNewName("");
          setShowAddForm(false);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Sessions werden geladen …
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-100">
          Sessions{" "}
          <span className="text-base text-gray-400">
            ({sessions?.length ?? 0})
          </span>
        </h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700"
        >
          {showAddForm ? "Abbrechen" : "+ Neue Session"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded border border-gray-700 bg-gray-800/40 p-4 flex gap-2 items-end flex-wrap">
          <label className="flex flex-col text-sm text-gray-400 flex-1 min-w-[14rem]">
            Name
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNew();
                if (e.key === "Escape") setShowAddForm(false);
              }}
              autoFocus
              placeholder="z.B. „3x3 Speed Training"
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          </label>
          <button
            onClick={addNew}
            disabled={create.isPending || !newName.trim()}
            className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Anlegen
          </button>
        </div>
      )}

      {!sessions || sessions.length === 0 ? (
        <p className="text-base text-gray-500">
          Noch keine Sessions. Kommen automatisch beim csTimer-Import oder
          beim ersten Solve mit „+ Neue Session" im TIMER.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const isEditingName =
              editing?.id === s.id && editing.field === "name";
            const isEditingNotes =
              editing?.id === s.id && editing.field === "notes";
            return (
              <li
                key={s.id}
                className="rounded border border-gray-700 bg-gray-900/40 p-3"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Name (editierbar via click) */}
                  {isEditingName ? (
                    <input
                      type="text"
                      value={editing!.value}
                      onChange={(e) =>
                        setEditing({ ...editing!, value: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      autoFocus
                      className="rounded border border-purple-500 bg-gray-800 px-2 py-1 text-base text-gray-100 focus:outline-none"
                    />
                  ) : (
                    <span
                      className="text-lg text-gray-100 font-medium cursor-pointer hover:text-purple-300"
                      onClick={() => startEdit(s, "name")}
                      title="Click zum Umbenennen"
                    >
                      {s.name}
                    </span>
                  )}
                  {s.scramble_type && (
                    <span className="text-xs text-gray-500 rounded bg-gray-800 px-2 py-0.5">
                      {s.scramble_type}
                    </span>
                  )}
                  {s.cstimer_session_id !== null && (
                    <span
                      className="text-xs text-gray-500"
                      title={`csTimer-ID ${s.cstimer_session_id}`}
                    >
                      cs#{s.cstimer_session_id}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Session „${s.name}" wirklich loeschen? Solves bleiben erhalten, verlieren aber die Zuordnung.`
                        )
                      )
                        del.mutate(s.id);
                    }}
                    className="ml-auto text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                    title="Session loeschen — Solves bleiben"
                  >
                    🗑
                  </button>
                </div>
                {/* Notes (editierbar via click) */}
                <div className="mt-2">
                  {isEditingNotes ? (
                    <input
                      type="text"
                      value={editing!.value}
                      onChange={(e) =>
                        setEditing({ ...editing!, value: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      autoFocus
                      placeholder="Notizen zur Session …"
                      className="w-full rounded border border-purple-500 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:outline-none"
                    />
                  ) : (
                    <div
                      className="text-sm text-gray-400 cursor-pointer min-h-[1em]"
                      onClick={() => startEdit(s, "notes")}
                      title="Click zum Bearbeiten"
                    >
                      {s.notes ?? (
                        <span className="text-gray-600 italic">+ Notiz</span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Click auf Name oder Notiz zum Bearbeiten (Enter speichert, Esc bricht ab).
      </p>
    </div>
  );
}

// SessionList: Verwaltung aller Sessions (Phase 5b-3 + 5c).
//
// Features:
// - Liste aller Sessions mit name, scramble_type, cstimer-id-badge, notes
// - Click-to-edit für name + notes (Enter speichert, Esc bricht ab)
// - „+ Neue Session"-Button mit Inline-Form
// - Aktionen pro Session: Mergen ↔ Löschen
// - Löschen mit Modal: 'Solves verwaisen' (default) oder 'in andere Session
//   verschieben' — vermeidet versehentlichen Daten-Verlust
// - Mergen mit Modal: Ziel-Session auswählen, Solves wandern + Notes appended

import { useState } from "react";
import {
  useCreateSession,
  useDeleteSession,
  useMergeSession,
  useSessions,
  useUpdateSession,
} from "../lib/api";
import type { Session } from "../lib/types";
import { InfoButton } from "./InfoButton";

type EditState = { id: number; field: "name" | "notes"; value: string } | null;
type ModalState =
  | { kind: "delete"; session: Session; targetId: number | null }
  | { kind: "merge"; source: Session; targetId: number | null }
  | null;

export function SessionList() {
  const { data: sessions, isLoading } = useSessions();
  const create = useCreateSession();
  const update = useUpdateSession();
  const del = useDeleteSession();
  const merge = useMergeSession();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<EditState>(null);
  const [modal, setModal] = useState<ModalState>(null);

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

  function executeDelete() {
    if (!modal || modal.kind !== "delete") return;
    del.mutate(
      { id: modal.session.id, moveSolvesTo: modal.targetId },
      { onSuccess: () => setModal(null) }
    );
  }

  function executeMerge() {
    if (!modal || modal.kind !== "merge" || modal.targetId === null) return;
    merge.mutate(
      { sourceId: modal.source.id, targetId: modal.targetId },
      { onSuccess: () => setModal(null) }
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
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            Sessions{" "}
            <span className="text-base text-gray-400">
              ({sessions?.length ?? 0})
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Sessions</p>
            <p>
              Sessions strukturieren dein Training (z.B. „OH", „PLL-Drill",
              „Cold-Solves"). Solves werden einer Session zugeordnet, Stats
              können pro Session gefiltert werden. „Merge"-Funktion kombiniert
              Sessions, „Migrate" verschiebt Solves vor dem Löschen.
            </p>
          </InfoButton>
        </div>
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
                  {/* Name (editierbar) */}
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
                  {/* Aktionen rechts */}
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() =>
                        setModal({ kind: "merge", source: s, targetId: null })
                      }
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-purple-700/50 hover:text-purple-100"
                      title="In andere Session mergen — Solves wandern, Notizen werden angehaengt"
                      disabled={!sessions || sessions.length < 2}
                    >
                      ⇆ Mergen
                    </button>
                    <button
                      onClick={() =>
                        setModal({ kind: "delete", session: s, targetId: null })
                      }
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title="Löschen — mit optionaler Solve-Migration"
                    >
                      🗑 Löschen
                    </button>
                  </div>
                </div>
                {/* Notes (editierbar) */}
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
                      className="text-sm text-gray-400 cursor-pointer min-h-[1em] whitespace-pre-wrap"
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
        Click auf Name oder Notiz zum Bearbeiten. Mergen verschiebt alle
        Solves in eine andere Session, löschen kann optional Solves
        umlegen statt sie verwaisen zu lassen.
      </p>

      {/* ============================================================
          Modal: Löschen — mit optionaler Migration
          ============================================================ */}
      {modal?.kind === "delete" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            Session „{modal.session.name}" löschen?
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Was soll mit den Solves dieser Session passieren?
          </p>
          <div className="space-y-3 mb-5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                checked={modal.targetId === null}
                onChange={() =>
                  setModal({ ...modal, targetId: null })
                }
                className="mt-1 accent-purple-500"
              />
              <div>
                <div className="text-base text-gray-100">
                  Solves verwaisen lassen
                </div>
                <div className="text-xs text-gray-500">
                  session_id wird NULL — Solves bleiben in der Liste, ohne
                  Session-Zuordnung.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                checked={modal.targetId !== null}
                onChange={() => {
                  // ersten anderen Sessions als Default
                  const first = sessions?.find((x) => x.id !== modal.session.id);
                  setModal({ ...modal, targetId: first?.id ?? null });
                }}
                className="mt-1 accent-purple-500"
              />
              <div className="flex-1">
                <div className="text-base text-gray-100 mb-1">
                  Solves in andere Session verschieben
                </div>
                <select
                  value={modal.targetId ?? ""}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      targetId: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  disabled={modal.targetId === null}
                  className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                >
                  {sessions
                    ?.filter((x) => x.id !== modal.session.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </div>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setModal(null)}
              className="text-sm rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
            >
              Abbrechen
            </button>
            <button
              onClick={executeDelete}
              disabled={del.isPending}
              className="text-sm rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {del.isPending ? "Lösche …" : "Endgültig löschen"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ============================================================
          Modal: Mergen
          ============================================================ */}
      {modal?.kind === "merge" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            „{modal.source.name}" mergen
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Alle Solves dieser Session wandern in die Ziel-Session. Notizen
            werden in der Ziel-Session angehaengt. Diese Session wird danach
            gelöscht. Aktion ist <strong>nicht umkehrbar</strong>.
          </p>
          <label className="flex flex-col text-sm text-gray-400 mb-5">
            Ziel-Session
            <select
              value={modal.targetId ?? ""}
              onChange={(e) =>
                setModal({
                  ...modal,
                  targetId: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="">— bitte wählen —</option>
              {sessions
                ?.filter((x) => x.id !== modal.source.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setModal(null)}
              className="text-sm rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
            >
              Abbrechen
            </button>
            <button
              onClick={executeMerge}
              disabled={merge.isPending || modal.targetId === null}
              className="text-sm rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {merge.isPending ? "Merge …" : "Mergen"}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ============================================================
// Helper: Modal-Overlay (Backdrop + Centered Card)
// Bewusst inline + simpel — keine externe Dialog-Lib nötig.
// ============================================================
function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="rounded-lg border border-gray-700 bg-gray-900 p-6 max-w-md w-[90%] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

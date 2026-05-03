// HardwareList: Verwaltung des Cube-Inventars (Phase 5 / F16).
//
// Zeigt alle Hardware-Eintraege als gruppierte Liste pro cube_type,
// mit Inline-Form fuer „neuer Eintrag" und Quick-Actions (Aktiv-toggle,
// Notiz editieren, Loeschen).
//
// Special: „Aus Seed-Datei laden"-Button, falls die Tabelle leer ist —
// der spielt einmalig die Standard-Liste vom 2026-05-03 ein.

import { useMemo, useState } from "react";
import {
  useCreateHardware,
  useDeleteHardware,
  useHardware,
  useSeedHardware,
  useUpdateHardware,
} from "../lib/api";
import { COMMON_CUBE_TYPES } from "../lib/format";
import type { Hardware } from "../lib/types";

export function HardwareList() {
  const { data: hardware, isLoading } = useHardware();
  const create = useCreateHardware();
  const update = useUpdateHardware();
  const del = useDeleteHardware();
  const seed = useSeedHardware();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCube, setNewCube] = useState("3x3");
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{
    id: number;
    value: string;
  } | null>(null);

  // Gruppieren nach primary_cube_type
  const grouped = useMemo(() => {
    if (!hardware) return [];
    const map = new Map<string, Hardware[]>();
    for (const h of hardware) {
      const arr = map.get(h.primary_cube_type) ?? [];
      arr.push(h);
      map.set(h.primary_cube_type, arr);
    }
    // Stable sort: bekannte Cube-Types in der COMMON-Reihenfolge zuerst,
    // dann die unbekannten alphabetisch.
    const order = new Map<string, number>();
    COMMON_CUBE_TYPES.forEach((c, i) => order.set(c, i));
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = order.get(a) ?? 1000;
      const bi = order.get(b) ?? 1000;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
  }, [hardware]);

  function addNew() {
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), primary_cube_type: newCube },
      {
        onSuccess: () => {
          setNewName("");
          setShowAddForm(false);
        },
      }
    );
  }

  function handleSeed(force: boolean) {
    seed.mutate(force, {
      onSuccess: (r) => {
        if (r.skipped_because_not_empty) {
          setSeedMessage(
            "Inventar ist nicht leer. Force-Knopf darunter laedt zusaetzlich (kann Duplikate erzeugen)."
          );
        } else {
          setSeedMessage(`${r.loaded} Eintraege geladen.`);
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Inventar wird geladen …
      </div>
    );
  }

  const isEmpty = !hardware || hardware.length === 0;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-100">
          Hardware-Inventar{" "}
          <span className="text-base text-gray-400">
            ({hardware?.length ?? 0} {hardware?.length === 1 ? "Cube" : "Cubes"})
          </span>
        </h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700"
        >
          {showAddForm ? "Abbrechen" : "+ Neuer Cube"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded border border-gray-700 bg-gray-800/40 p-4 flex gap-2 flex-wrap items-end">
          <label className="flex flex-col text-sm text-gray-400">
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
              placeholder="z.B. Weilong v11"
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none w-56"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-400">
            Cube-Type
            <select
              value={newCube}
              onChange={(e) => setNewCube(e.target.value)}
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              {COMMON_CUBE_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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

      {/* Empty-state mit Seed-Knopf */}
      {isEmpty && (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-4 mb-4">
          <p className="text-base text-blue-100 mb-2">
            Inventar ist leer. Lade die Standard-Liste vom 2026-05-03
            (~37 Cubes ueber 11 Cube-Types)?
          </p>
          <button
            onClick={() => handleSeed(false)}
            disabled={seed.isPending}
            className="text-sm rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {seed.isPending ? "Laedt …" : "Aus Seed-Datei laden"}
          </button>
          {seedMessage && (
            <p className="mt-2 text-sm text-blue-200">{seedMessage}</p>
          )}
        </div>
      )}

      {seedMessage && !isEmpty && (
        <p className="text-sm text-gray-400 mb-3">{seedMessage}</p>
      )}

      {/* Gruppierte Liste */}
      <div className="space-y-5">
        {grouped.map(([cube, items]) => (
          <div key={cube}>
            <h3 className="text-base font-semibold text-gray-300 mb-2">
              {cube}{" "}
              <span className="text-sm text-gray-500 font-normal">
                ({items.length})
              </span>
            </h3>
            <ul className="space-y-1.5">
              {items.map((h) => {
                const isEditingThis = editingNotes?.id === h.id;
                return (
                  <li
                    key={h.id}
                    className={`flex items-center gap-3 rounded border px-3 py-2 ${
                      h.is_active
                        ? "border-gray-700 bg-gray-900/40"
                        : "border-gray-800 bg-gray-900/20 opacity-60"
                    }`}
                  >
                    <span className="text-base text-gray-100 font-medium min-w-[12rem]">
                      {h.name}
                    </span>
                    {isEditingThis ? (
                      <input
                        type="text"
                        value={editingNotes!.value}
                        onChange={(e) =>
                          setEditingNotes({ ...editingNotes!, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            update.mutate(
                              {
                                id: h.id,
                                payload: { notes: editingNotes!.value || null },
                              },
                              { onSuccess: () => setEditingNotes(null) }
                            );
                          }
                          if (e.key === "Escape") setEditingNotes(null);
                        }}
                        autoFocus
                        className="flex-1 rounded border border-purple-500 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:outline-none"
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm text-gray-400 cursor-pointer truncate"
                        onClick={() =>
                          setEditingNotes({ id: h.id, value: h.notes ?? "" })
                        }
                        title="Click zum Bearbeiten"
                      >
                        {h.notes ?? (
                          <span className="text-gray-600 italic">+ Notiz</span>
                        )}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        update.mutate({
                          id: h.id,
                          payload: { is_active: !h.is_active },
                        })
                      }
                      className={`text-xs rounded px-2 py-1 ${
                        h.is_active
                          ? "bg-emerald-700/40 text-emerald-200 hover:bg-emerald-700/60"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                      title={h.is_active ? "Aktiv" : "Inaktiv (z.B. verkauft)"}
                    >
                      {h.is_active ? "aktiv" : "inaktiv"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`„${h.name}" wirklich loeschen?`))
                          del.mutate(h.id);
                      }}
                      className="text-sm rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title="Loeschen — betroffene Solves verlieren ihre Hardware-Zuordnung"
                    >
                      🗑
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Click auf eine Notiz zum Bearbeiten (Enter speichert). Loeschen
        entfernt nur den Hardware-Eintrag — alte Solves bleiben erhalten,
        verlieren aber die Hardware-Zuordnung.
      </p>
    </div>
  );
}

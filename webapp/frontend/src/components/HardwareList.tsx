// HardwareList: Verwaltung des Cube-Inventars.
//
// Seit W.hardware-auto-seed (2026-05-14): jeder User bekommt die
// 30-Cube-Liste automatisch beim Register, mit is_active=false. Daher
// kein Seed-Button mehr — die Liste ist immer da.
//
// Features:
// - Gruppierung pro primary_cube_type
// - Selektion per Checkbox + "alle in Gruppe markieren"
// - Bulk-Aktionen pro Gruppe: aktiv-setzen / inaktiv-setzen / löschen
// - Inline-Edit auf Name + Notiz (Click-to-Edit ODER expliziter
//   "Umbenennen"-Button — beide Wege führen ins gleiche Edit-Feld)

import { useMemo, useState } from "react";
import {
  useBulkDeleteHardware,
  useBulkUpdateHardware,
  useCreateHardware,
  useDeleteHardware,
  useHardware,
  useUpdateHardware,
} from "../lib/api";
import { COMMON_CUBE_TYPES } from "../lib/format";
import type { Hardware } from "../lib/types";
import { InfoButton } from "./InfoButton";

export function HardwareList() {
  const { data: hardware, isLoading } = useHardware();
  const create = useCreateHardware();
  const update = useUpdateHardware();
  const del = useDeleteHardware();
  const bulkUpdate = useBulkUpdateHardware();
  const bulkDelete = useBulkDeleteHardware();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCube, setNewCube] = useState("3x3");

  // Edit-State (Name oder Notiz, jeweils einzeln pro Eintrag)
  const [editing, setEditing] = useState<{
    id: number;
    field: "name" | "notes";
    value: string;
  } | null>(null);

  // Selektions-State für Bulk-Aktionen — Set aus Hardware-IDs.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Gruppieren nach primary_cube_type
  const grouped = useMemo(() => {
    if (!hardware) return [];
    const map = new Map<string, Hardware[]>();
    for (const h of hardware) {
      const arr = map.get(h.primary_cube_type) ?? [];
      arr.push(h);
      map.set(h.primary_cube_type, arr);
    }
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
      },
    );
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectGroupAll(items: Hardware[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Alle dieser Gruppe abwaehlen
        for (const h of items) next.delete(h.id);
      } else {
        for (const h of items) next.add(h.id);
      }
      return next;
    });
  }

  function bulkActivate(items: Hardware[], is_active: boolean) {
    const ids = items.filter((h) => selected.has(h.id)).map((h) => h.id);
    if (ids.length === 0) return;
    bulkUpdate.mutate(
      { ids, is_active },
      {
        onSuccess: () => {
          setSelected((prev) => {
            const next = new Set(prev);
            for (const id of ids) next.delete(id);
            return next;
          });
        },
      },
    );
  }

  function bulkDeleteGroup(items: Hardware[]) {
    const ids = items.filter((h) => selected.has(h.id)).map((h) => h.id);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `${ids.length} markierte Hardware-Einträge wirklich löschen?\n` +
          `Betroffene Solves verlieren ihre Hardware-Zuordnung, bleiben aber erhalten.`,
      )
    )
      return;
    bulkDelete.mutate(
      { ids },
      {
        onSuccess: () => {
          setSelected((prev) => {
            const next = new Set(prev);
            for (const id of ids) next.delete(id);
            return next;
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Inventar wird geladen …
      </div>
    );
  }

  const totalCount = hardware?.length ?? 0;
  const activeCount = hardware?.filter((h) => h.is_active).length ?? 0;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            Hardware-Inventar{" "}
            <span className="text-base text-gray-400">
              ({activeCount} aktiv von {totalCount})
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Hardware-Inventar</p>
            <p>
              Deine Cube-Sammlung. Jeder neue User bekommt automatisch 30
              Standard-Cubes (alle inaktiv) — markier die ab die du wirklich
              besitzt + Bulk-Aktiviere sie. Aktive Cubes erscheinen im
              Timer-Hardware-Selector + im Hardware-Vergleich. Solves
              behalten ihre Hardware-Zuordnung auch nach Löschen.
            </p>
          </InfoButton>
        </div>
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

      {/* Empty-State falls noch nichts da (extremer Edge-Case nach
          Auto-Seed-Backfill — User hat ALLES gelöscht). */}
      {totalCount === 0 && (
        <div className="rounded border border-gray-700 bg-gray-800/30 p-4 mb-4 text-sm text-gray-400">
          Inventar ist leer. Lege oben einen neuen Cube an, oder logge dich
          ab + wieder ein damit die Standard-Liste neu geseedet wird.
        </div>
      )}

      {/* Gruppierte Liste mit Bulk-Aktionen */}
      <div className="space-y-5">
        {grouped.map(([cube, items]) => {
          const selectedInGroup = items.filter((h) => selected.has(h.id));
          const allSelected =
            items.length > 0 && selectedInGroup.length === items.length;
          const someSelected = selectedInGroup.length > 0;

          return (
            <div key={cube}>
              {/* Group-Header mit "Alle markieren"-Checkbox + Bulk-Actions */}
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={() => selectGroupAll(items, allSelected)}
                    className="accent-purple-500 w-4 h-4"
                  />
                  <h3 className="text-base font-semibold text-gray-300">
                    {cube}{" "}
                    <span className="text-sm text-gray-500 font-normal">
                      ({items.filter((h) => h.is_active).length} aktiv /{" "}
                      {items.length})
                    </span>
                  </h3>
                </label>

                {someSelected && (
                  <div className="flex items-center gap-1.5 ml-auto text-xs">
                    <span className="text-gray-500">
                      {selectedInGroup.length} ausgewählt:
                    </span>
                    <button
                      onClick={() => bulkActivate(items, true)}
                      disabled={bulkUpdate.isPending}
                      className="rounded bg-emerald-700/40 px-2 py-1 text-emerald-200 hover:bg-emerald-700/60 disabled:opacity-50"
                    >
                      ▶ aktivieren
                    </button>
                    <button
                      onClick={() => bulkActivate(items, false)}
                      disabled={bulkUpdate.isPending}
                      className="rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                    >
                      ⏸ deaktivieren
                    </button>
                    <button
                      onClick={() => bulkDeleteGroup(items)}
                      disabled={bulkDelete.isPending}
                      className="rounded bg-red-700/40 px-2 py-1 text-red-200 hover:bg-red-700/60 disabled:opacity-50"
                    >
                      🗑 löschen
                    </button>
                  </div>
                )}
              </div>

              <ul className="space-y-1.5">
                {items.map((h) => (
                  <HardwareRow
                    key={h.id}
                    h={h}
                    selected={selected.has(h.id)}
                    onToggleSelected={() => toggleSelected(h.id)}
                    editing={editing}
                    setEditing={setEditing}
                    update={update}
                    del={del}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Auto-Seed: jeder neue User bekommt 30 Standard-Cubes mit
        is_active=false. Du markierst selbst was du wirklich besitzt
        (Checkbox + ▶ aktivieren). „Umbenennen"-Button oder Klick auf
        den Namen zum Editieren — Enter speichert, Esc bricht ab.
        Löschen entfernt nur den Hardware-Eintrag, alte Solves bleiben.
      </p>
    </div>
  );
}

// ============================================================
// Eine Hardware-Zeile (in eigene Komponente für Lesbarkeit)
// ============================================================

function HardwareRow({
  h,
  selected,
  onToggleSelected,
  editing,
  setEditing,
  update,
  del,
}: {
  h: Hardware;
  selected: boolean;
  onToggleSelected: () => void;
  editing: { id: number; field: "name" | "notes"; value: string } | null;
  setEditing: (
    e: { id: number; field: "name" | "notes"; value: string } | null,
  ) => void;
  // Mutations werden hochgereicht, damit isPending sichtbar bleibt
  update: ReturnType<typeof useUpdateHardware>;
  del: ReturnType<typeof useDeleteHardware>;
}) {
  const isEditingName = editing?.id === h.id && editing.field === "name";
  const isEditingNotes = editing?.id === h.id && editing.field === "notes";

  function startRename() {
    setEditing({ id: h.id, field: "name", value: h.name });
  }

  return (
    <li
      className={`flex items-center gap-3 rounded border px-3 py-2 ${
        h.is_active
          ? "border-gray-700 bg-gray-900/40"
          : "border-gray-800 bg-gray-900/20 opacity-60"
      } ${selected ? "ring-1 ring-purple-500/60" : ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelected}
        className="accent-purple-500 w-4 h-4"
        aria-label={`${h.name} auswählen`}
      />

      {/* Name (click-to-edit) */}
      {isEditingName ? (
        <input
          type="text"
          value={editing!.value}
          onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const newName = editing!.value.trim();
              if (!newName) return;
              update.mutate(
                { id: h.id, payload: { name: newName } },
                { onSuccess: () => setEditing(null) },
              );
            }
            if (e.key === "Escape") setEditing(null);
          }}
          autoFocus
          className="rounded border border-purple-500 bg-gray-800 px-2 py-1 text-base text-gray-100 focus:outline-none min-w-[12rem]"
        />
      ) : (
        <span
          className="text-base text-gray-100 font-medium min-w-[12rem] cursor-pointer hover:text-purple-300"
          onClick={startRename}
          title="Klick zum Umbenennen"
        >
          {h.name}
        </span>
      )}

      {/* Notes (click-to-edit) */}
      {isEditingNotes ? (
        <input
          type="text"
          value={editing!.value}
          onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update.mutate(
                {
                  id: h.id,
                  payload: { notes: editing!.value.trim() || null },
                },
                { onSuccess: () => setEditing(null) },
              );
            }
            if (e.key === "Escape") setEditing(null);
          }}
          autoFocus
          className="flex-1 rounded border border-purple-500 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:outline-none"
        />
      ) : (
        <span
          className="flex-1 text-sm text-gray-400 cursor-pointer truncate"
          onClick={() =>
            setEditing({
              id: h.id,
              field: "notes",
              value: h.notes ?? "",
            })
          }
          title="Klick zum Bearbeiten"
        >
          {h.notes ?? <span className="text-gray-600 italic">+ Notiz</span>}
        </span>
      )}

      {/* Aktionen */}
      <button
        onClick={startRename}
        disabled={isEditingName}
        className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-purple-700/40 hover:text-purple-100 disabled:opacity-50"
        title="Umbenennen — alternativer Weg zum Klick auf den Namen"
      >
        ✎ umbenennen
      </button>
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
        title={h.is_active ? "Aktiv (Klick zum Deaktivieren)" : "Inaktiv (Klick zum Aktivieren)"}
      >
        {h.is_active ? "aktiv" : "inaktiv"}
      </button>
      <button
        onClick={() => {
          if (
            window.confirm(
              `Hardware „${h.name}" wirklich löschen?\n\nBetroffene Solves bleiben erhalten, verlieren aber ihre Hardware-Zuordnung.`,
            )
          )
            del.mutate(h.id);
        }}
        className="text-sm rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
        title="Löschen — Solves bleiben, hardware_id wird NULL"
      >
        🗑
      </button>
    </li>
  );
}

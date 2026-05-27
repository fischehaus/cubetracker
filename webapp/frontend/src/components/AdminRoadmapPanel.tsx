// AdminRoadmapPanel (Phase W.roadmap-admin-ui, 2026-05-28).
//
// Admin-CRUD-UI für Roadmap-Items. Liest alle Items aus dem GET /roadmap-
// Endpoint (admin sieht auch internal=True). Bietet:
//
// - Liste gruppiert nach Phase (P1..P6)
// - Filter: Phase / Status (active/done/all) / Visibility (public/internal/all)
// - Inline-Edit pro Zeile (alle Felder)
// - "+ Neu"-Button mit Create-Form
// - Delete pro Zeile mit Confirm
//
// Cross-Admin: alle Admins sehen + bearbeiten alle Items (Backend hat
// keinen per-User-Filter, siehe webapp/api/admin.py:create/update/delete_
// roadmap_item).

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminCreateRoadmapItem,
  useAdminDeleteRoadmapItem,
  useAdminUpdateRoadmapItem,
  useRoadmap,
  type RoadmapItem,
  type RoadmapItemCreateInput,
  type RoadmapItemUpdateInput,
  type RoadmapStatus,
} from "../lib/api";
import { ROADMAP_PHASES_META } from "../lib/roadmap-phases";
import { InfoButton } from "./InfoButton";

const PHASE_IDS = ROADMAP_PHASES_META.map((p) => p.id);

type StatusFilter = "all" | RoadmapStatus;
type VisibilityFilter = "all" | "public" | "internal";

export function AdminRoadmapPanel() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useRoadmap();
  const createMut = useAdminCreateRoadmapItem();
  const updateMut = useAdminUpdateRoadmapItem();
  const deleteMut = useAdminDeleteRoadmapItem();

  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visFilter, setVisFilter] = useState<VisibilityFilter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const items = data?.items ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (phaseFilter !== "all" && it.phase_id !== phaseFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (visFilter === "public" && it.internal) return false;
      if (visFilter === "internal" && !it.internal) return false;
      return true;
    });
  }, [items, phaseFilter, statusFilter, visFilter]);

  // Grouping by phase
  const itemsByPhase = useMemo(() => {
    const out: Record<string, RoadmapItem[]> = {};
    for (const it of filteredItems) {
      if (!out[it.phase_id]) out[it.phase_id] = [];
      out[it.phase_id].push(it);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return out;
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">{t("adminRoadmap.loading")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">{t("adminRoadmap.errorGeneric")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-purple-300">
            {t("adminRoadmap.title")}{" "}
            <span className="text-sm text-gray-500">
              ({t("adminRoadmap.headerCount", { count: filteredItems.length })})
            </span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">{t("adminRoadmap.title")}</p>
            <p>{t("adminRoadmap.infoBody")}</p>
          </InfoButton>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700"
        >
          {showCreate ? t("adminRoadmap.addNewCancel") : t("adminRoadmap.addNewButton")}
        </button>
      </div>

      {/* Filter-Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 border-b border-gray-700 pb-3">
        <label className="flex items-center gap-1.5">
          {t("adminRoadmap.filterPhaseLabel")}
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">{t("adminRoadmap.filterAll")}</option>
            {PHASE_IDS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          {t("adminRoadmap.filterStatusLabel")}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">{t("adminRoadmap.filterAll")}</option>
            <option value="active">{t("adminRoadmap.filterActive")}</option>
            <option value="done">{t("adminRoadmap.filterDone")}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          {t("adminRoadmap.filterVisibilityLabel")}
          <select
            value={visFilter}
            onChange={(e) => setVisFilter(e.target.value as VisibilityFilter)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">{t("adminRoadmap.filterAll")}</option>
            <option value="public">{t("adminRoadmap.filterPublic")}</option>
            <option value="internal">{t("adminRoadmap.filterInternal")}</option>
          </select>
        </label>
      </div>

      {/* Create-Form */}
      {showCreate && (
        <CreateForm
          onSubmit={(input) =>
            createMut.mutate(input, { onSuccess: () => setShowCreate(false) })
          }
          busy={createMut.isPending}
        />
      )}

      {/* Items-Liste */}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          {items.length === 0
            ? t("adminRoadmap.emptyState")
            : t("adminRoadmap.emptyStateFiltered")}
        </p>
      ) : (
        <div className="space-y-5">
          {ROADMAP_PHASES_META.map((phase) => {
            const phaseItems = itemsByPhase[phase.id];
            if (!phaseItems || phaseItems.length === 0) return null;
            return (
              <div key={phase.id} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t("adminRoadmap.phaseSection", { phase: phase.id })} —{" "}
                  {t(phase.titleKey)}{" "}
                  <span className="text-gray-600">({phaseItems.length})</span>
                </h4>
                <ul className="space-y-1.5">
                  {phaseItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isEditing={editingId === item.id}
                      onStartEdit={() => setEditingId(item.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={(patch) =>
                        updateMut.mutate(
                          { id: item.id, patch },
                          { onSuccess: () => setEditingId(null) },
                        )
                      }
                      onDelete={() => {
                        if (
                          confirm(
                            t("adminRoadmap.deleteConfirm", {
                              title: item.title_de,
                            }),
                          )
                        ) {
                          deleteMut.mutate({ id: item.id });
                        }
                      }}
                      saveBusy={updateMut.isPending}
                      deleteBusy={deleteMut.isPending}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Create-Form
// ============================================================

function CreateForm({
  onSubmit,
  busy,
}: {
  onSubmit: (input: RoadmapItemCreateInput) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<RoadmapItemCreateInput>({
    phase_id: "P1",
    title_de: "",
    title_en: "",
    note_de: "",
    note_en: "",
    effort: "",
    status: "active",
    internal: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title_de.trim() || !form.title_en.trim()) return;
    onSubmit({
      ...form,
      note_de: form.note_de?.trim() || null,
      note_en: form.note_en?.trim() || null,
      effort: form.effort?.trim() || null,
    });
  }

  const valid = form.title_de.trim() && form.title_en.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-purple-500/30 bg-purple-500/5 p-3 space-y-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldPhase")}
          <select
            value={form.phase_id}
            onChange={(e) => setForm({ ...form, phase_id: e.target.value })}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          >
            {PHASE_IDS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldEffort")}
          <input
            type="text"
            value={form.effort ?? ""}
            onChange={(e) => setForm({ ...form, effort: e.target.value })}
            placeholder={t("adminRoadmap.fieldEffortPlaceholder")}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          />
        </label>
      </div>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldTitleDe")}
        <input
          type="text"
          value={form.title_de}
          onChange={(e) => setForm({ ...form, title_de: e.target.value })}
          required
          maxLength={256}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldTitleEn")}
        <input
          type="text"
          value={form.title_en}
          onChange={(e) => setForm({ ...form, title_en: e.target.value })}
          required
          maxLength={256}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldNoteDe")}
        <textarea
          value={form.note_de ?? ""}
          onChange={(e) => setForm({ ...form, note_de: e.target.value })}
          maxLength={2000}
          rows={2}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldNoteEn")}
        <textarea
          value={form.note_en ?? ""}
          onChange={(e) => setForm({ ...form, note_en: e.target.value })}
          maxLength={2000}
          rows={2}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldStatus")}
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as RoadmapStatus })
            }
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          >
            <option value="active">{t("adminRoadmap.statusActive")}</option>
            <option value="done">{t("adminRoadmap.statusDone")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-200 mt-4">
          <input
            type="checkbox"
            checked={form.internal ?? false}
            onChange={(e) => setForm({ ...form, internal: e.target.checked })}
            className="accent-amber-500 w-4 h-4"
          />
          {t("adminRoadmap.fieldInternal")}
        </label>
      </div>
      <button
        type="submit"
        disabled={busy || !valid}
        className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {busy ? t("adminRoadmap.addNewSubmitBusy") : t("adminRoadmap.addNewSubmit")}
      </button>
    </form>
  );
}

// ============================================================
// Item-Row mit Inline-Edit
// ============================================================

function ItemRow({
  item,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  saveBusy,
  deleteBusy,
}: {
  item: RoadmapItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: RoadmapItemUpdateInput) => void;
  onDelete: () => void;
  saveBusy: boolean;
  deleteBusy: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<RoadmapItemUpdateInput>({
    phase_id: item.phase_id,
    sort_order: item.sort_order,
    title_de: item.title_de,
    title_en: item.title_en,
    note_de: item.note_de,
    note_en: item.note_en,
    effort: item.effort,
    status: item.status,
    internal: item.internal,
  });

  if (!isEditing) {
    return (
      <li className="rounded border border-gray-700 bg-gray-900/40 p-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <span className="text-base text-gray-100 font-medium">
              {item.status === "done" ? "✓ " : ""}
              {item.title_de}
            </span>
            {item.internal ? (
              <span className="text-[10px] rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 px-1.5 py-0.5">
                {t("adminRoadmap.badgeInternal")}
              </span>
            ) : (
              <span className="text-[10px] rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 px-1.5 py-0.5">
                {t("adminRoadmap.badgePublic")}
              </span>
            )}
            {item.status === "done" && (
              <span className="text-[10px] rounded border border-gray-500/40 bg-gray-500/10 text-gray-300 px-1.5 py-0.5">
                {t("adminRoadmap.badgeDone")}
              </span>
            )}
            {item.effort && (
              <span className="text-xs text-gray-500 italic">
                ({item.effort})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onStartEdit}
              className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-purple-700/40 hover:text-purple-100"
            >
              {t("adminRoadmap.editButton")}
            </button>
            <button
              onClick={onDelete}
              disabled={deleteBusy}
              className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-red-700/40 hover:text-red-200 disabled:opacity-50"
            >
              {deleteBusy
                ? t("adminRoadmap.deleteBusy")
                : t("adminRoadmap.deleteButton")}
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400 italic">
          🇬🇧 {item.title_en}
        </div>
        {item.note_de && (
          <div className="text-xs text-gray-500 mt-1">{item.note_de}</div>
        )}
        {item.note_en && (
          <div className="text-xs text-gray-500 italic">🇬🇧 {item.note_en}</div>
        )}
      </li>
    );
  }

  // Edit-Mode
  return (
    <li className="rounded border border-purple-500/40 bg-purple-500/5 p-3 space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldPhase")}
          <select
            value={form.phase_id ?? item.phase_id}
            onChange={(e) => setForm({ ...form, phase_id: e.target.value })}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          >
            {PHASE_IDS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldSortOrder")}
          <input
            type="number"
            value={form.sort_order ?? item.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })
            }
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldStatus")}
          <select
            value={form.status ?? item.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as RoadmapStatus })
            }
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          >
            <option value="active">{t("adminRoadmap.statusActive")}</option>
            <option value="done">{t("adminRoadmap.statusDone")}</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          {t("adminRoadmap.fieldEffort")}
          <input
            type="text"
            value={form.effort ?? ""}
            onChange={(e) => setForm({ ...form, effort: e.target.value })}
            placeholder={t("adminRoadmap.fieldEffortPlaceholder")}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          />
        </label>
      </div>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldTitleDe")}
        <input
          type="text"
          value={form.title_de ?? ""}
          onChange={(e) => setForm({ ...form, title_de: e.target.value })}
          maxLength={256}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldTitleEn")}
        <input
          type="text"
          value={form.title_en ?? ""}
          onChange={(e) => setForm({ ...form, title_en: e.target.value })}
          maxLength={256}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldNoteDe")}
        <textarea
          value={form.note_de ?? ""}
          onChange={(e) => setForm({ ...form, note_de: e.target.value })}
          maxLength={2000}
          rows={2}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        {t("adminRoadmap.fieldNoteEn")}
        <textarea
          value={form.note_en ?? ""}
          onChange={(e) => setForm({ ...form, note_en: e.target.value })}
          maxLength={2000}
          rows={2}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={form.internal ?? false}
          onChange={(e) => setForm({ ...form, internal: e.target.checked })}
          className="accent-amber-500 w-4 h-4"
        />
        {t("adminRoadmap.fieldInternal")}
      </label>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancelEdit}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-600"
        >
          {t("adminRoadmap.cancelButton")}
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saveBusy}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {saveBusy
            ? t("adminRoadmap.saveButtonBusy")
            : t("adminRoadmap.saveButton")}
        </button>
      </div>
    </li>
  );
}

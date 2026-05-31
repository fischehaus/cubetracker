// AdminFeedbackInboxPanel (Phase W.feedback-inbox-ui, 2026-05-28).
//
// Admin-Inbox für User-Feedback aus dem FeedbackModal-"Per App"-Mode.
// Ersetzt den früheren Resend-Email-Versand: Nachrichten landen ab
// W.tester-role-db direkt in der DB-Tabelle feedback_messages.
//
// Layout:
// - Header mit Counter + Stats-Badges (offene Bugs prominent rot)
// - Filter-Bar: Status (Alle/Neu/Bearbeitung/Erledigt/Archiviert) +
//   Kategorie (Alle/Allgemein/Bug/Feature/Sonstiges)
// - Liste sortiert: status='new' oben, dann nach created_at desc
// - Pro Item: Kategorie-Badge + Datum + User-Name/Email + Status-Badge
//   + expandable Message + Antwort-Editor + Status-Quick-Toggles + Delete
//
// Skalierung: aktuell kein Pagination (bei < 50 Items overkill). Wenn
// die Inbox > 100 Items hat, sollte hier eine virtualisierte Liste oder
// Pagination dazukommen — Backlog-Item.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminDeleteFeedback,
  useAdminFeedbackMessages,
  useAdminFeedbackStats,
  useAdminUpdateFeedback,
  type FeedbackCategory,
  type FeedbackMessage,
  type FeedbackStatus,
} from "../lib/api";
import { getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { FeedbackToRoadmapModal } from "./FeedbackToRoadmapModal";

type StatusFilter = "all" | FeedbackStatus;
type CategoryFilter = "all" | FeedbackCategory;

const CATEGORY_LABELS: Record<FeedbackCategory, { icon: string; key: string }> = {
  general: { icon: "💬", key: "general" },
  bug: { icon: "🐛", key: "bug" },
  feature: { icon: "✨", key: "feature" },
  other: { icon: "📝", key: "other" },
};

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string; border: string }> = {
  new: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/40" },
  in_progress: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
  done: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
  archived: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/40" },
};

export function AdminFeedbackInboxPanel() {
  const { t, i18n } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // W.feedback-roadmap-pipeline: welches Feedback wird gerade in ein
  // Roadmap-Item umgewandelt (null = Modal zu). Liegt im Panel, damit das
  // Modal einmal über der ganzen Inbox liegt.
  const [roadmapForMsg, setRoadmapForMsg] = useState<FeedbackMessage | null>(
    null,
  );

  const { data, isLoading, error } = useAdminFeedbackMessages(true, {
    status: statusFilter,
    category: categoryFilter,
  });
  const { data: stats } = useAdminFeedbackStats(true);
  const updateMut = useAdminUpdateFeedback();
  const deleteMut = useAdminDeleteFeedback();

  // W.feedback-admin-tester-improvements (2026-05-28):
  // Archivierte Feedbacks standardmaessig ausblenden. Nur sichtbar
  // wenn der User explizit Status=Archiviert filtert. So bleibt die
  // Inbox aufgeraeumt — alte Items sind nicht weg, nur weggeklappt.
  const messages = useMemo(() => {
    const all = data?.messages ?? [];
    if (statusFilter === "all") {
      return all.filter((m) => m.status !== "archived");
    }
    return all;
  }, [data?.messages, statusFilter]);
  const totalOpen = stats?.total_open ?? 0;
  const openBugs = stats?.open_by_category?.bug ?? 0;
  const openFeatures = stats?.open_by_category?.feature ?? 0;
  const openGeneral = stats?.open_by_category?.general ?? 0;
  const openOther = stats?.open_by_category?.other ?? 0;

  const dateLocale = getIntlLocale(i18n.resolvedLanguage);
  const fmtDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(dateLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">{t("adminFeedback.loading")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">{t("adminFeedback.errorGeneric")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-purple-300">
            {t("adminFeedback.title")}{" "}
            <span className="text-sm text-gray-500">
              ({t("adminFeedback.headerCount", { count: messages.length })})
            </span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">{t("adminFeedback.title")}</p>
            <p>{t("adminFeedback.infoBody")}</p>
          </InfoButton>
        </div>
        {/* Stats-Badges für offene Items pro Kategorie + Quick-Add-Button.
            W.feedback-admin-tester-improvements: + Feedback-Button direkt
            neben den Stats, damit Admin schnell selbst was eintragen
            kann ohne ueber UserMenu zu gehen. Triggert das globale
            FeedbackModal via Custom-Event analog UserMenu → Settings. */}
        <div className="flex flex-wrap items-center gap-2">
          {totalOpen > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {openBugs > 0 && (
                <span className="rounded border border-red-500/40 bg-red-500/10 text-red-200 px-2 py-0.5">
                  🐛 {openBugs} {t("adminFeedback.openBugs")}
                </span>
              )}
              {openFeatures > 0 && (
                <span className="rounded border border-purple-500/40 bg-purple-500/10 text-purple-200 px-2 py-0.5">
                  ✨ {openFeatures} {t("adminFeedback.openFeatures")}
                </span>
              )}
              {openGeneral > 0 && (
                <span className="rounded border border-blue-500/40 bg-blue-500/10 text-blue-200 px-2 py-0.5">
                  💬 {openGeneral} {t("adminFeedback.openGeneral")}
                </span>
              )}
              {openOther > 0 && (
                <span className="rounded border border-gray-500/40 bg-gray-500/10 text-gray-300 px-2 py-0.5">
                  📝 {openOther} {t("adminFeedback.openOther")}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("cubetracker:open-feedback-modal"),
              )
            }
            className="text-xs rounded bg-purple-600/40 border border-purple-500/50 text-purple-100 px-3 py-1 hover:bg-purple-600/60 transition-colors"
            title={t("adminFeedback.quickAddTitle")}
          >
            {t("adminFeedback.quickAddButton")}
          </button>
        </div>
      </div>

      {/* Filter-Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 border-b border-gray-700 pb-3">
        <label className="flex items-center gap-1.5">
          {t("adminFeedback.filterStatusLabel")}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">{t("adminFeedback.filterAll")}</option>
            <option value="new">{t("adminFeedback.statusNew")}</option>
            <option value="in_progress">{t("adminFeedback.statusInProgress")}</option>
            <option value="done">{t("adminFeedback.statusDone")}</option>
            <option value="archived">{t("adminFeedback.statusArchived")}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          {t("adminFeedback.filterCategoryLabel")}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">{t("adminFeedback.filterAll")}</option>
            <option value="general">{t("adminFeedback.categoryGeneral")}</option>
            <option value="bug">{t("adminFeedback.categoryBug")}</option>
            <option value="feature">{t("adminFeedback.categoryFeature")}</option>
            <option value="other">{t("adminFeedback.categoryOther")}</option>
          </select>
        </label>
      </div>

      {/* Liste */}
      {messages.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          {data && data.count === 0
            ? t("adminFeedback.emptyState")
            : t("adminFeedback.emptyStateFiltered")}
        </p>
      ) : (
        <ul className="space-y-2">
          {messages.map((msg) => (
            <InboxRow
              key={msg.id}
              msg={msg}
              expanded={expandedId === msg.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === msg.id ? null : msg.id)
              }
              onUpdate={(patch) => {
                setUpdatingId(msg.id);
                updateMut.mutate(
                  { id: msg.id, patch },
                  { onSettled: () => setUpdatingId(null) },
                );
              }}
              onDelete={() => {
                if (
                  confirm(
                    t("adminFeedback.deleteConfirm", {
                      id: msg.id,
                      category: t(
                        `adminFeedback.category${
                          CATEGORY_LABELS[msg.category].key.charAt(0).toUpperCase() +
                          CATEGORY_LABELS[msg.category].key.slice(1)
                        }`,
                      ),
                    }),
                  )
                ) {
                  setDeletingId(msg.id);
                  deleteMut.mutate(
                    { id: msg.id },
                    { onSettled: () => setDeletingId(null) },
                  );
                }
              }}
              updateBusy={updateMut.isPending && updatingId === msg.id}
              deleteBusy={deleteMut.isPending && deletingId === msg.id}
              fmtDateTime={fmtDateTime}
              onConvertToRoadmap={() => setRoadmapForMsg(msg)}
            />
          ))}
        </ul>
      )}
      {roadmapForMsg && (
        <FeedbackToRoadmapModal
          msg={roadmapForMsg}
          onClose={() => setRoadmapForMsg(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// InboxRow — eine Feedback-Nachricht mit Inline-Antwort-Editor
// ============================================================

function InboxRow({
  msg,
  expanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onConvertToRoadmap,
  updateBusy,
  deleteBusy,
  fmtDateTime,
}: {
  msg: FeedbackMessage;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: { status?: FeedbackStatus; admin_response?: string | null }) => void;
  onDelete: () => void;
  onConvertToRoadmap: () => void;
  updateBusy: boolean;
  deleteBusy: boolean;
  fmtDateTime: (iso: string) => string;
}) {
  const { t } = useTranslation();
  const [responseDraft, setResponseDraft] = useState(msg.admin_response ?? "");
  const [showResponseEditor, setShowResponseEditor] = useState(false);
  // QA-Fix W.tester-feedback-qa: useState initialisiert nur einmal —
  // wenn der Admin antwortet → Query-Refetch → msg.admin_response
  // ist neu, aber responseDraft haengt am alten Init-Wert. Sync via
  // useEffect.
  useEffect(() => {
    setResponseDraft(msg.admin_response ?? "");
  }, [msg.admin_response]);

  const catLabel = CATEGORY_LABELS[msg.category as FeedbackCategory] ?? {
    icon: "📝",
    key: "other",
  };
  const statusColors = STATUS_COLORS[msg.status as FeedbackStatus] ?? STATUS_COLORS.new;
  const isNew = msg.status === "new";
  const hasResponse = !!msg.admin_response;
  const userSawResponse = hasResponse && !!msg.user_seen_response_at;

  return (
    <li
      className={`rounded border ${
        isNew ? "border-blue-500/40 bg-blue-500/5" : "border-gray-700 bg-gray-900/40"
      } p-3 space-y-2`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        {isNew && (
          <span
            className="w-2 h-2 rounded-full bg-blue-400 mt-1.5"
            title={t("adminFeedback.markerNew")}
            aria-hidden="true"
          />
        )}
        <span className="text-sm">{catLabel.icon}</span>
        <span className="text-sm text-gray-300 font-medium">
          {t(
            `adminFeedback.category${
              catLabel.key.charAt(0).toUpperCase() + catLabel.key.slice(1)
            }`,
          )}
        </span>
        <span
          className={`text-[10px] rounded border ${statusColors.border} ${statusColors.bg} ${statusColors.text} px-1.5 py-0.5`}
        >
          {t(
            `adminFeedback.status${
              msg.status === "in_progress"
                ? "InProgress"
                : msg.status.charAt(0).toUpperCase() + msg.status.slice(1)
            }`,
          )}
        </span>
        {hasResponse && (
          <span
            className={`text-[10px] rounded border px-1.5 py-0.5 ${
              userSawResponse
                ? "border-gray-500/40 bg-gray-500/10 text-gray-400"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            }`}
            title={
              userSawResponse
                ? t("adminFeedback.responseSeenAt", {
                    date: fmtDateTime(msg.user_seen_response_at as string),
                  })
                : t("adminFeedback.responseUnseen")
            }
          >
            {userSawResponse
              ? t("adminFeedback.replySeen")
              : t("adminFeedback.replyPending")}
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {fmtDateTime(msg.created_at)}
        </span>
      </div>

      {/* User-Info */}
      <div className="text-xs text-gray-500">
        {msg.user_id === null
          ? t("adminFeedback.userDeleted")
          : t("adminFeedback.fromUser", { id: msg.user_id })}
      </div>

      {/* Message: truncated → expandable */}
      <div
        className="text-sm text-gray-200 cursor-pointer whitespace-pre-wrap"
        onClick={onToggleExpand}
        title={expanded ? t("adminFeedback.collapse") : t("adminFeedback.expand")}
      >
        {expanded || msg.message.length <= 200
          ? msg.message
          : msg.message.slice(0, 200) + " …"}
      </div>

      {/* Quick-Toggles + Antwort-Edit-Button + Delete */}
      <div className="flex gap-2 flex-wrap">
        {msg.status !== "in_progress" && (
          <button
            onClick={() => onUpdate({ status: "in_progress" })}
            disabled={updateBusy}
            className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-amber-700/40 hover:text-amber-200 disabled:opacity-50"
          >
            {t("adminFeedback.quickToInProgress")}
          </button>
        )}
        {msg.status !== "done" && (
          <button
            onClick={() => onUpdate({ status: "done" })}
            disabled={updateBusy}
            className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-emerald-700/40 hover:text-emerald-200 disabled:opacity-50"
          >
            {t("adminFeedback.quickToDone")}
          </button>
        )}
        {msg.status !== "archived" && (
          <button
            onClick={() => onUpdate({ status: "archived" })}
            disabled={updateBusy}
            className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-gray-600 disabled:opacity-50"
          >
            {t("adminFeedback.quickToArchived")}
          </button>
        )}
        <button
          onClick={() => setShowResponseEditor((v) => !v)}
          className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-purple-700/40 hover:text-purple-100"
        >
          {showResponseEditor
            ? t("adminFeedback.hideReplyEditor")
            : hasResponse
              ? t("adminFeedback.editReply")
              : t("adminFeedback.addReply")}
        </button>
        <button
          onClick={onConvertToRoadmap}
          className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-purple-700/40 hover:text-purple-100"
          title={t("adminFeedback.toRoadmapTitle")}
        >
          {t("adminFeedback.toRoadmapButton")}
        </button>
        <button
          onClick={onDelete}
          disabled={deleteBusy}
          className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-200 hover:bg-red-700/40 hover:text-red-200 disabled:opacity-50 ml-auto"
        >
          {deleteBusy
            ? t("adminFeedback.deleteBusy")
            : t("adminFeedback.deleteButton")}
        </button>
      </div>

      {/* Bestehende Antwort anzeigen (read-only, wenn Editor zu) */}
      {hasResponse && !showResponseEditor && (
        <div className="rounded border border-purple-500/30 bg-purple-500/5 p-2 text-sm text-gray-300">
          <div className="text-[10px] text-purple-300 mb-1">
            {t("adminFeedback.replyLabel")}{" "}
            {msg.admin_response_at && fmtDateTime(msg.admin_response_at)}
          </div>
          <div className="whitespace-pre-wrap">{msg.admin_response}</div>
        </div>
      )}

      {/* Antwort-Editor */}
      {showResponseEditor && (
        <div className="space-y-2">
          <textarea
            value={responseDraft}
            onChange={(e) => setResponseDraft(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={t("adminFeedback.replyPlaceholder")}
            className="w-full rounded border border-purple-500/30 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setResponseDraft(msg.admin_response ?? "");
                setShowResponseEditor(false);
              }}
              className="text-xs rounded bg-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-600"
            >
              {t("adminFeedback.cancelButton")}
            </button>
            <button
              onClick={() => {
                const trimmed = responseDraft.trim() || null;
                onUpdate({
                  admin_response: trimmed,
                  status:
                    trimmed && msg.status === "new" ? "in_progress" : undefined,
                });
                setShowResponseEditor(false);
              }}
              disabled={updateBusy}
              className="text-xs rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {updateBusy
                ? t("adminFeedback.saveBusy")
                : t("adminFeedback.saveReplyButton")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

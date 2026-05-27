// MyFeedbackPanel (Phase W.feedback-user-view, 2026-05-28).
//
// Eigener „Mein Feedback"-Bereich für den User. Zeigt:
//   - Eigene Feedback-Nachrichten chronologisch absteigend
//   - Kategorie-Badge + Status-Badge + Datum
//   - Admin-Antwort wenn vorliegt (aufklappbar, blauer Dot bei
//     ungelesen — wird beim Aufklappen als gelesen markiert)
//
// Liegt in der Verwaltung → Meine Daten Sektion (zwischen MeineDatenCard
// und dem Format-Hint-Block).

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useMarkFeedbackResponseSeen,
  useMyFeedback,
  type FeedbackCategory,
  type FeedbackMessage,
  type FeedbackStatus,
} from "../lib/api";
import { getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";

const CATEGORY_ICONS: Record<FeedbackCategory, string> = {
  general: "💬",
  bug: "🐛",
  feature: "✨",
  other: "📝",
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

export function MyFeedbackPanel() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useMyFeedback();
  const markSeen = useMarkFeedbackResponseSeen();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
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

  // Wenn der User ein Item mit ungelesener Antwort aufklappt → als
  // gelesen markieren (Server-Update). Idempotent — wenn schon
  // gelesen, kein Re-Update.
  useEffect(() => {
    if (expandedId === null) return;
    const item = messages.find((m) => m.id === expandedId);
    if (!item) return;
    if (item.admin_response && !item.user_seen_response_at) {
      markSeen.mutate({ id: expandedId });
    }
  }, [expandedId, messages, markSeen]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">{t("myFeedback.loading")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">{t("myFeedback.errorGeneric")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium text-purple-300">
          {t("myFeedback.title")}{" "}
          {messages.length > 0 && (
            <span className="text-sm text-gray-500">({messages.length})</span>
          )}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("myFeedback.title")}</p>
          <p>{t("myFeedback.infoBody")}</p>
        </InfoButton>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-gray-500 italic">{t("myFeedback.emptyState")}</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((msg) => (
            <MyFeedbackRow
              key={msg.id}
              msg={msg}
              expanded={expandedId === msg.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === msg.id ? null : msg.id)
              }
              fmtDateTime={fmtDateTime}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MyFeedbackRow({
  msg,
  expanded,
  onToggleExpand,
  fmtDateTime,
}: {
  msg: FeedbackMessage;
  expanded: boolean;
  onToggleExpand: () => void;
  fmtDateTime: (iso: string) => string;
}) {
  const { t } = useTranslation();
  const catIcon = CATEGORY_ICONS[msg.category as FeedbackCategory] ?? "📝";
  const statusColors = STATUS_COLORS[msg.status as FeedbackStatus] ?? STATUS_COLORS.new;
  const hasResponse = !!msg.admin_response;
  const unread = hasResponse && !msg.user_seen_response_at;

  return (
    <li
      className={`rounded border ${
        unread
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-gray-700 bg-gray-900/40"
      } p-3 space-y-2`}
    >
      <div
        className="flex items-baseline gap-2 flex-wrap cursor-pointer"
        onClick={onToggleExpand}
        title={expanded ? t("myFeedback.collapse") : t("myFeedback.expand")}
      >
        {unread && (
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5"
            aria-hidden="true"
          />
        )}
        <span className="text-sm">{catIcon}</span>
        <span className="text-sm text-gray-300 font-medium">
          {t(
            `myFeedback.category${
              msg.category.charAt(0).toUpperCase() + msg.category.slice(1)
            }`,
          )}
        </span>
        <span
          className={`text-[10px] rounded border ${statusColors.border} ${statusColors.bg} ${statusColors.text} px-1.5 py-0.5`}
        >
          {t(
            `myFeedback.status${
              msg.status === "in_progress"
                ? "InProgress"
                : msg.status.charAt(0).toUpperCase() + msg.status.slice(1)
            }`,
          )}
        </span>
        {unread && (
          <span className="text-[10px] rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 px-1.5 py-0.5">
            {t("myFeedback.newResponseBadge")}
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {fmtDateTime(msg.created_at)}
        </span>
      </div>

      {/* Eigene Nachricht: truncated wenn nicht expanded */}
      <div className="text-sm text-gray-200 whitespace-pre-wrap">
        {expanded || msg.message.length <= 200
          ? msg.message
          : msg.message.slice(0, 200) + " …"}
      </div>

      {/* Admin-Antwort wenn vorhanden — bei expanded immer sichtbar */}
      {hasResponse && (expanded || unread) && (
        <div className="rounded border border-purple-500/30 bg-purple-500/5 p-2 text-sm text-gray-200">
          <div className="text-[11px] text-purple-300 mb-1 flex items-center gap-2">
            <span>{t("myFeedback.adminReplyLabel")}</span>
            {msg.admin_response_at && (
              <span className="text-gray-500">
                {fmtDateTime(msg.admin_response_at)}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap">{msg.admin_response}</div>
        </div>
      )}
    </li>
  );
}

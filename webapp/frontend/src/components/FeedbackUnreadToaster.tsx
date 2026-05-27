// FeedbackUnreadToaster (Phase W.feedback-user-view, 2026-05-28).
//
// Zeigt einen einmaligen Toast (5s, oben rechts) wenn der User
// ungelesene Admin-Antworten in seiner Feedback-Inbox hat.
//
// Verhalten:
// - Nur 1× pro Mount: useState-Flag verhindert dass beim Page-Refresh
//   sofort wieder erscheint (innerhalb derselben Browser-Session).
// - Klick auf den Toast triggert das Custom-Event
//   `cubetracker:goto-verwaltung-section` (analog UserMenu) und
//   springt direkt zur Meine-Daten-Sektion → MyFeedbackPanel.
// - Nach 6s autoclose.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useMyFeedbackUnreadCount } from "../lib/api";

export function FeedbackUnreadToaster() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { data } = useMyFeedbackUnreadCount(isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn || dismissed) return;
    if (data?.unread_count && data.unread_count > 0) {
      setVisible(true);
      // QA-Fix W.tester-feedback-qa: Variable nicht `t` nennen —
      // shadowed sonst `t` aus useTranslation im umgebenden Scope.
      const autohideTimer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(autohideTimer);
    }
  }, [isLoggedIn, dismissed, data?.unread_count]);

  if (!visible || !data?.unread_count) return null;

  return (
    <button
      type="button"
      onClick={() => {
        // Springe zum „Meine Daten"-Sub-Tab. Custom-Event-Pattern
        // analog UserMenu → VerwaltungTab.
        window.dispatchEvent(
          new CustomEvent("cubetracker:goto-verwaltung-section", {
            detail: { section: "daten" },
          }),
        );
        setVisible(false);
        setDismissed(true);
      }}
      className="fixed top-4 right-4 z-50 max-w-xs rounded-lg border border-emerald-500/50 bg-emerald-950/95 text-emerald-100 p-4 shadow-lg cursor-pointer hover:bg-emerald-900/95 text-left"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <span className="text-xl" aria-hidden="true">
          💬
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {data.unread_count === 1
              ? t("feedbackToaster.titleSingle")
              : t("feedbackToaster.titleMulti", { count: data.unread_count })}
          </p>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            {t("feedbackToaster.hint")}
          </p>
        </div>
        <span
          className="text-emerald-300 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
            setDismissed(true);
          }}
          aria-label={t("feedbackToaster.dismissAria")}
        >
          ×
        </span>
      </div>
    </button>
  );
}

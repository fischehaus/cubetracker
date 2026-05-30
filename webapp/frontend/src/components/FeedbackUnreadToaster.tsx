// FeedbackUnreadToaster (W.toast-manager-migration, 2026-05-30): jetzt
// Trigger-Listener mit Once-per-Mount-Flag. Pushed einen severity=info-
// Toast mit Click-Handler in den zentralen Hub (lib/toast.ts).
//
// Verhalten unverändert:
// - Nur 1× pro Mount (dedupKey verhindert Doppel-Push wenn Query
//   während desselben Mounts re-fetched).
// - Klick triggert custom-Event `cubetracker:goto-konto-section`
//   (W.ia-konto-usermenu) und springt zur MyFeedbackPanel-Sektion
//   (Konto & Daten → Daten).
// - 6 Sekunden Auto-Dismiss.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useMyFeedbackUnreadCount } from "../lib/api";
import { toast } from "../lib/toast";

const DEDUP_KEY = "feedback-unread-toast";
const AUTO_DISMISS_MS = 6000;

export function FeedbackUnreadToaster() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { data } = useMyFeedbackUnreadCount(isLoggedIn);
  // Once-per-Mount-Guard: verhindert Re-Push wenn der Query refetched
  // (z.B. wegen unrelated invalidate) und unread_count weiterhin >0 ist.
  const alreadyPushed = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || alreadyPushed.current) return;
    const unread = data?.unread_count ?? 0;
    if (unread <= 0) return;

    alreadyPushed.current = true;
    toast.info(
      unread === 1
        ? t("feedbackToaster.titleSingle")
        : t("feedbackToaster.titleMulti", { count: unread }),
      {
        title: t("feedbackToaster.hint"),
        icon: "💬",
        autoDismissMs: AUTO_DISMISS_MS,
        position: "TR",
        dedupKey: DEDUP_KEY,
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent("cubetracker:goto-konto-section", {
              detail: { section: "daten" },
            }),
          );
        },
      },
    );
  }, [isLoggedIn, data?.unread_count, t]);

  return null;
}

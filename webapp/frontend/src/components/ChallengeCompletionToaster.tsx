// ChallengeCompletionToaster (W.toast-manager, 2026-05-30): nur noch
// Trigger-Listener. Lauscht auf onChallengeCompleted (axios-Interceptor)
// und pushed pro Challenge einen Toast via lib/toast.ts.
// Render in <ToastHost />.
//
// Default-Position für severity=challenge ist BL (bottom-left), wie
// die ursprüngliche eigene Render-Schicht.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { onChallengeCompleted, useChallengesToday } from "../lib/api";
import {
  CHALLENGE_ICONS,
  challengeLabel,
  describeChallenge,
} from "../lib/challenges";
import { toast } from "../lib/toast";

export function ChallengeCompletionToaster() {
  const { t } = useTranslation();
  const { data } = useChallengesToday();

  useEffect(() => {
    const unsub = onChallengeCompleted((ids) => {
      if (!data) return;
      for (const cid of ids) {
        const c = data.challenges.find((x) => x.id === cid);
        if (!c) continue;
        toast.challenge({
          title: t("toasterChallenge.completedLabel", {
            label: challengeLabel(c.kind, t),
          }),
          message: describeChallenge(c, t),
          icon: CHALLENGE_ICONS[c.kind],
        });
      }
    });
    return unsub;
  }, [data, t]);

  return null;
}

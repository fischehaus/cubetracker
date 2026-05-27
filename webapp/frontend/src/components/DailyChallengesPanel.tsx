// DailyChallengesPanel: Voll-Ansicht der heutigen Daily Challenges (Phase 7b).
//
// - Header mit Datum + "Neu generieren"-Button
// - Grid der nicht-dismissten Challenges (ChallengeCard)
// - Hint, wenn alle dismissed/erfüllt

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useChallengesToday,
  useDismissChallenge,
  useRegenerateChallenges,
} from "../lib/api";
import { ChallengeCard } from "./ChallengeCard";
import { InfoButton } from "./InfoButton";

export function DailyChallengesPanel() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useChallengesToday();
  const regenerate = useRegenerateChallenges();
  const dismiss = useDismissChallenge();

  const visible = useMemo(
    () => data?.challenges.filter((c) => !c.dismissed) ?? [],
    [data]
  );

  const completedCount = useMemo(
    () => visible.filter((c) => c.completed_at !== null).length,
    [visible]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        {t("dailyChallenges.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        {t("dailyChallenges.errorPrefix")}
        {error.message}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("dailyChallenges.title")}{" "}
            <span className="text-base text-gray-400">
              {t("dailyChallenges.countSummary", {
                done: completedCount,
                total: visible.length,
              })}
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("dailyChallenges.title")}</p>
            <p>{t("dailyChallenges.infoBody")}</p>
          </InfoButton>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
          title={t("dailyChallenges.regenerateButtonTitle")}
        >
          {regenerate.isPending
            ? t("dailyChallenges.regenerateBusy")
            : t("dailyChallenges.regenerateButton")}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-base text-gray-400">
          {t("dailyChallenges.emptyState")}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">{t("dailyChallenges.footer")}</p>
    </div>
  );
}

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
import { Card, CardTitle, Button, EmptyState } from "./ui";

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
      <Card className="text-base text-gray-400">
        {t("dailyChallenges.loading")}
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger" className="text-red-300 text-base">
        {t("dailyChallenges.errorPrefix")}
        {error.message}
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CardTitle>
            {t("dailyChallenges.title")}{" "}
            <span className="text-base text-gray-400">
              {t("dailyChallenges.countSummary", {
                done: completedCount,
                total: visible.length,
              })}
            </span>
          </CardTitle>
          <InfoButton>
            <p className="font-medium mb-1">{t("dailyChallenges.title")}</p>
            <p>{t("dailyChallenges.infoBody")}</p>
          </InfoButton>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          title={t("dailyChallenges.regenerateButtonTitle")}
        >
          {regenerate.isPending
            ? t("dailyChallenges.regenerateBusy")
            : t("dailyChallenges.regenerateButton")}
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState size="sm" title={t("dailyChallenges.emptyState")} />
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
    </Card>
  );
}

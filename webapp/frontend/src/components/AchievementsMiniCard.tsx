// AchievementsMiniCard: kompakte Dashboard-Variante (A.3).
//
// Zeigt:
//  - Anzahl freigeschalteter / total
//  - die 3 zuletzt freigeschalteten Erfolge (icon + name)
//  - Link „Alle Erfolge ansehen" → wechselt zum Trainer-Tab
//
// Bewusst klein gehalten — für das Dashboard-Top-Row.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAchievements } from "../lib/api";
import { InfoButton } from "./InfoButton";
import { Card, EmptyState } from "./ui";
import type { AppTab } from "./TabBar";

interface Props {
  onSwitchTab: (tab: AppTab) => void;
}

export function AchievementsMiniCard({ onSwitchTab }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useAchievements();

  const summary = useMemo(() => {
    if (!data) return null;
    const unlocked = data.filter((a) => a.unlocked_at !== null);
    // sortiert nach unlocked_at desc, top 3
    const recent = [...unlocked]
      .sort((a, b) =>
        (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? "")
      )
      .slice(0, 3);
    return {
      unlocked: unlocked.length,
      total: data.length,
      recent,
    };
  }, [data]);

  if (isLoading || !summary) {
    return (
      <Card className="text-base text-gray-500">
        {t("achievementsMini.loading")}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-200">
            {t("achievementsMini.title")}
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">
              {t("achievementsMini.infoTitle")}
            </p>
            <p>{t("achievementsMini.infoBody")}</p>
          </InfoButton>
        </div>
        <span className="text-sm text-gray-500">
          {summary.unlocked} / {summary.total}
        </span>
      </div>

      {summary.recent.length === 0 ? (
        <EmptyState size="sm" icon="🏅" title={t("achievementsMini.emptyText")} />
      ) : (
        <ul className="space-y-1.5">
          {summary.recent.map((a) => (
            <li key={a.code} className="flex items-center gap-2 text-sm">
              <span className="text-base shrink-0">{a.icon}</span>
              <span className="text-yellow-100 truncate">{a.name}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onSwitchTab("trainer")}
        className="mt-3 text-sm text-purple-400 hover:text-purple-300"
      >
        {t("achievementsMini.viewAll")}
      </button>
    </Card>
  );
}

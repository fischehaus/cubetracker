// ActivityCard: ein einzelner Aktivitäts-Slice (heute ODER diese Woche)
// als eigenständige Card. Im DASHBOARD-Tab als Top-Row in 3 Spalten:
// [Heute] [Diese Woche] [Reminders].

import { useTranslation } from "react-i18next";
import { useTemporalStats } from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { Card } from "./ui";

interface Props {
  sessionId: number | null;
  slice: "today" | "week";
}

export function ActivityCard({ sessionId, slice }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTemporalStats(sessionId);
  const sliceLabel = slice === "today" ? t("activity.today") : t("activity.week");
  const infoBody =
    slice === "today" ? t("activity.infoBodyToday") : t("activity.infoBodyWeek");

  if (isLoading) {
    return (
      <Card className="text-gray-400 text-sm">
        {t("activity.loadingPrefix", { label: sliceLabel })}
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger" className="text-red-300 text-sm">
        {t("activity.errorPrefix", { message: error.message })}
      </Card>
    );
  }
  if (!data) return null;

  const s = data[slice];

  // Cube-Breakdown: top 3 nach count, Rest als „+N weitere"
  const cubeEntries = Object.entries(s.count_per_cube).sort(
    (a, b) => b[1] - a[1]
  );
  const top = cubeEntries.slice(0, 3);
  const restCount = cubeEntries.length - top.length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm uppercase tracking-wide text-gray-500">
          {sliceLabel}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{sliceLabel}</p>
          <p>{infoBody}</p>
        </InfoButton>
      </div>
      <div className="text-5xl font-bold text-gray-100 leading-none mb-1">
        {s.count}
        <span className="text-lg font-normal text-gray-500 ml-2">
          {s.count === 1
            ? t("activity.solveSingular")
            : t("activity.solvePlural")}
        </span>
      </div>

      {s.count > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-base">
            <div>
              <div className="text-xs text-gray-500">
                {t("activity.labelMean")}
              </div>
              <div className="font-mono text-gray-200 text-lg">
                {s.mean_ms != null ? formatTime(s.mean_ms) : "–"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                {t("activity.labelAo5")}
              </div>
              <div className="font-mono text-gray-200 text-lg">
                {s.current_ao5 != null ? formatTime(s.current_ao5) : "–"}
              </div>
            </div>
          </div>
          {top.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 text-sm">
              {top.map(([cube, n]) => (
                <span
                  key={cube}
                  className="rounded bg-gray-800 px-2 py-0.5 text-gray-300"
                >
                  {cube} <span className="text-gray-500">{n}</span>
                </span>
              ))}
              {restCount > 0 && (
                <span className="text-gray-500 self-center">
                  {t("activity.moreCount", { count: restCount })}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-base text-gray-500">
          {t("activity.noActivity")}
        </p>
      )}
    </Card>
  );
}

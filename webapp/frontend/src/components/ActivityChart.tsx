// ActivityChart: Bar-Chart der Solve-Anzahl pro Tag/Woche/Monat
// über einen wählbaren Zeitraum.
//
// Zeigt für jeden Bucket: count_valid (lila) + count_dnf (rot) als
// stacked bar. Granularität (Tag/Woche/Monat) und Zeitraum
// (30T/3M/6M/1J/3J/Alle) wählbar.
//
// Frontend-seitige X-Achsen-Heuristik: bei vielen Buckets nur jeden
// n-ten Tick anzeigen, sonst wird die Achse unleserlich.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActivity, type ActivityGranularity } from "../lib/api";
import { InfoButton } from "./InfoButton";
import { Card, CardTitle } from "./ui";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

// Range + Granularity-Optionen: nur Werte, Labels werden zur Render-Zeit
// via t() lokalisiert (siehe Component-Body).
const RANGE_VALUES: { value: number; key: string }[] = [
  { value: 30, key: "charts.actRange30Days" },
  { value: 90, key: "charts.actRange3Months" },
  { value: 180, key: "charts.actRange6Months" },
  { value: 365, key: "charts.actRange1Year" },
  { value: 1095, key: "charts.actRange3Years" },
  { value: 10000, key: "charts.actRangeAll" },
];

const GRANULARITY_VALUES: { value: ActivityGranularity; key: string }[] = [
  { value: "day", key: "charts.actGranPerDay" },
  { value: "week", key: "charts.actGranPerWeek" },
  { value: "month", key: "charts.actGranPerMonth" },
];

/**
 * Sinnvolle Tick-Strategie: bei vielen Buckets nur jeden n-ten Tick zeigen.
 * Recharts kann bei 365 Tages-Buckets sonst unleserliche Achse rendern.
 */
function tickInterval(bucketCount: number): number | "preserveStartEnd" {
  if (bucketCount <= 30) return 0; // alle ticks
  if (bucketCount <= 60) return Math.floor(bucketCount / 15);
  if (bucketCount <= 200) return Math.floor(bucketCount / 12);
  return "preserveStartEnd";
}

/**
 * Tick-Label kompakt formatieren je nach Granularität:
 *   day   "2026-05-03"  → "03" (Tag im Monat)
 *   week  "2026-W18"    → "W18"
 *   month "2026-05"     → "2026-05" (bleibt wie ist)
 *
 * Tooltip + Legend zeigen das volle Label, nur die Achse wird platzsparend.
 */
function formatTick(period: string, gran: ActivityGranularity): string {
  if (gran === "day") {
    // ISO-date YYYY-MM-DD → Tag
    const parts = period.split("-");
    return parts.length === 3 ? parts[2] : period;
  }
  if (gran === "week") {
    // YYYY-Www → Www (kuerzt Jahr weg)
    const m = period.match(/W\d+/);
    return m ? m[0] : period;
  }
  return period; // month bleibt als YYYY-MM
}

export function ActivityChart({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  const [granularity, setGranularity] = useState<ActivityGranularity>("day");
  const [days, setDays] = useState<number>(30);

  const { data, isLoading, error } = useActivity({
    granularity,
    days,
    cube_type: cubeType,
    session_id: sessionId,
  });

  // Stats fürs Card-Header (Summe, Avg pro Bucket, Max-Tag)
  const summary = useMemo(() => {
    if (!data || data.buckets.length === 0) return null;
    const counts = data.buckets.map((b) => b.count);
    const total = data.total_count;
    const nonZero = counts.filter((c) => c > 0);
    const avg = nonZero.length > 0 ? Math.round(total / nonZero.length) : 0;
    const max = Math.max(...counts);
    const maxBucket = data.buckets.find((b) => b.count === max);
    return {
      total,
      activeBuckets: nonZero.length,
      avgPerActive: avg,
      maxCount: max,
      maxPeriod: maxBucket?.period ?? null,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="text-gray-400 text-base">
        {t("charts.actLoading")}
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger" className="text-red-300 text-base">
        {t("charts.actErrorPrefix", { message: error.message })}
      </Card>
    );
  }
  if (!data) return null;

  const granDayLabel =
    granularity === "day"
      ? t("charts.actGranDay")
      : granularity === "week"
        ? t("charts.actGranWeek")
        : t("charts.actGranMonth");
  const granPluralLabel =
    granularity === "day"
      ? t("charts.actDaysWord")
      : granularity === "week"
        ? t("charts.actWeeksWord")
        : t("charts.actMonthsWord");

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CardTitle>
            {t("charts.actTitle")}{" "}
            <span className="text-base text-gray-400">
              {t("charts.actSolvesCount", { count: data.total_count })}
            </span>
          </CardTitle>
          <InfoButton>
            <p className="font-medium mb-1">{t("charts.actInfoTitle")}</p>
            <p>{t("charts.actInfoBody")}</p>
          </InfoButton>
        </div>
        <div className="flex gap-2 items-center text-sm">
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as ActivityGranularity)}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            title={t("charts.actGranTitle")}
          >
            {GRANULARITY_VALUES.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            title={t("charts.actRangeTitle")}
          >
            {RANGE_VALUES.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick-summary: gesamt, Schnitt pro aktivem Bucket, Spitzen-Periode */}
      {summary && summary.total > 0 && (
        <div className="mb-3 flex gap-4 flex-wrap text-sm text-gray-400">
          <span>
            <span className="text-gray-200 font-semibold">{summary.total}</span>{" "}
            {t("charts.actTotalCount")}
          </span>
          <span>
            ⌀{" "}
            <span className="text-gray-200 font-semibold">
              {summary.avgPerActive}
            </span>
            /{granDayLabel} ({t("charts.actAvgPrefix")} {summary.activeBuckets}{" "}
            {granPluralLabel})
          </span>
          {summary.maxPeriod && (
            <span>
              {t("charts.actPeakLabel")}{" "}
              <span className="text-gray-200 font-semibold">{summary.maxCount}</span>{" "}
              {t("charts.actPeakOn")} {summary.maxPeriod}
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data.buckets}
          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            interval={tickInterval(data.buckets.length)}
            tickFormatter={(v) => formatTick(String(v), granularity)}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 13 }} width={50} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v, name) => [
              name === "count_valid"
                ? t("charts.actTooltipValid", { count: v })
                : t("charts.actTooltipDnf", { count: v }),
              "",
            ]}
            labelFormatter={(label) =>
              t("charts.actTooltipPeriod", { label })
            }
          />
          <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
          <Bar
            dataKey="count_valid"
            stackId="x"
            fill="#a855f7"
            name={t("charts.actBarValid")}
          />
          <Bar
            dataKey="count_dnf"
            stackId="x"
            fill="#ef4444"
            name={t("charts.actBarDnf")}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-3 text-xs text-gray-500">{t("charts.actFooter")}</p>
    </Card>
  );
}

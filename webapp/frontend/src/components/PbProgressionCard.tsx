// PbProgressionCard (W.pb-history): PB-Verlauf als absteigende Treppe der
// persoenlichen Bestzeiten ueber die Zeit. Toggle zwischen Single / ao5 / ao12.
//
// Daten vom /stats/pb-history-Endpoint — die PB-Progression wird SERVERSEITIG
// ueber ALLE Solves des Filters berechnet (nicht nur ein geladenes Fenster),
// damit auch alte Rekorde korrekt erscheinen.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePbHistory } from "../lib/api";
import { InfoButton } from "./InfoButton";
import { Card, CardTitle, EmptyState } from "./ui";
import { formatDate, formatTime } from "../lib/format";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

type Metric = "single" | "ao5" | "ao12";

const METRIC_LABEL: Record<Metric, string> = {
  single: "Single",
  ao5: "ao5",
  ao12: "ao12",
};

const METRIC_COLOR: Record<Metric, string> = {
  single: "#eab308", // gold — PB-Thema
  ao5: "#10b981",
  ao12: "#3b82f6",
};

const METRICS: Metric[] = ["single", "ao5", "ao12"];

export function PbProgressionCard({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<Metric>("single");

  const params: { cube_type?: string; session_id?: number } = {};
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;
  const { data, isLoading, error } = usePbHistory(params);

  const series = data ? data[metric] : [];
  const allHaveAt = series.length > 0 && series.every((p) => p.at !== null);

  const chartData = useMemo(() => {
    if (series.length === 0) return [];
    const useTime = series.every((p) => p.at !== null);
    return series.map((p, i) => ({
      x: useTime && p.at ? new Date(p.at).getTime() : i + 1,
      ms: p.ms,
    }));
  }, [series]);

  const yDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 1000];
    const vals = chartData.map((d) => d.ms);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(500, (hi - lo) * 0.12);
    return [Math.max(0, lo - pad), hi + pad];
  }, [chartData]);

  const toggle = (
    <div className="flex gap-1">
      {METRICS.map((m) => (
        <button
          key={m}
          onClick={() => setMetric(m)}
          className={`rounded px-3 py-1.5 text-base ${
            metric === m
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {METRIC_LABEL[m]}
        </button>
      ))}
    </div>
  );

  const countLabel =
    series.length === 1
      ? t("charts.pbProgRecordSingular", { count: series.length })
      : t("charts.pbProgRecordPlural", { count: series.length });

  const header = (
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <CardTitle>
          {t("charts.pbProgTitle")}{" "}
          <span className="text-base text-gray-400">({countLabel})</span>
        </CardTitle>
        <InfoButton>
          <p className="font-medium mb-1">{t("charts.pbProgTitle")}</p>
          <p>{t("charts.pbProgInfoBody")}</p>
        </InfoButton>
      </div>
      {toggle}
    </div>
  );

  if (isLoading) {
    return (
      <Card className="text-gray-400 text-base">
        {t("charts.pbProgLoading")}
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger" className="text-red-300 text-base">
        {t("stats.errorPrefix", { message: error.message })}
      </Card>
    );
  }

  return (
    <Card>
      {header}
      {chartData.length === 0 ? (
        <EmptyState
          title={t("charts.pbProgEmpty", { metric: METRIC_LABEL[metric] })}
        />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              scale={allHaveAt ? "time" : "linear"}
              domain={["dataMin", "dataMax"]}
              stroke="#6b7280"
              tick={{ fontSize: 13 }}
              tickFormatter={(v: number) =>
                allHaveAt ? formatDate(new Date(v).toISOString()) : `#${v}`
              }
            />
            <YAxis
              stroke="#6b7280"
              tickFormatter={(ms: number) => formatTime(ms)}
              tick={{ fontSize: 13 }}
              width={60}
              domain={yDomain}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(v) => formatTime(typeof v === "number" ? v : Number(v))}
              labelFormatter={(x) =>
                allHaveAt
                  ? formatDate(new Date(Number(x)).toISOString())
                  : t("charts.pbProgRecordTooltip", { x })
              }
            />
            <Line
              type="stepAfter"
              dataKey="ms"
              stroke={METRIC_COLOR[metric]}
              strokeWidth={2}
              dot={{ r: 3, fill: METRIC_COLOR[metric] }}
              activeDot={{ r: 5 }}
              name={t("charts.pbProgLineName", { metric: METRIC_LABEL[metric] })}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

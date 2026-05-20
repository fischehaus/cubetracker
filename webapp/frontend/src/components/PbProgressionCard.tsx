// PbProgressionCard (W.pb-history): PB-Verlauf als absteigende Treppe der
// persoenlichen Bestzeiten ueber die Zeit. Toggle zwischen Single / ao5 / ao12.
//
// Daten vom /stats/pb-history-Endpoint — die PB-Progression wird SERVERSEITIG
// ueber ALLE Solves des Filters berechnet (nicht nur ein geladenes Fenster),
// damit auch alte Rekorde korrekt erscheinen.

import { useMemo, useState } from "react";
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

  const header = (
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <h3 className="text-2xl font-semibold text-gray-100">
          PB-Verlauf{" "}
          <span className="text-base text-gray-400">
            ({series.length} {series.length === 1 ? "Rekord" : "Rekorde"})
          </span>
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">PB-Verlauf</p>
          <p>
            Jeder Punkt = ein neuer persoenlicher Rekord (PB) zum Zeitpunkt, als
            er gesetzt wurde. Die Treppe geht nur runter — so siehst du deine
            Verbesserung ueber die Zeit. Umschaltbar: Single / ao5 / ao12.
          </p>
        </InfoButton>
      </div>
      {toggle}
    </div>
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-gray-400 text-base">
        PB-Verlauf wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        Fehler beim Laden: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      {header}
      {chartData.length === 0 ? (
        <p className="text-base text-gray-500">
          Noch keine {METRIC_LABEL[metric]}-PBs im aktuellen Filter.
        </p>
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
                  : `Rekord #${x}`
              }
            />
            <Line
              type="stepAfter"
              dataKey="ms"
              stroke={METRIC_COLOR[metric]}
              strokeWidth={2}
              dot={{ r: 3, fill: METRIC_COLOR[metric] }}
              activeDot={{ r: 5 }}
              name={`${METRIC_LABEL[metric]}-PB`}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// HistogramChart: Verteilung der Solve-Zeiten als Bar-Chart.
// Zeigt, wo die meisten deiner Zeiten liegen — gibt Auskunft über
// Form-Konsistenz (schmaler Peak) vs. Streuung (breite Verteilung).

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSolves, type SolveListParams } from "../lib/api";
import { InfoButton } from "./InfoButton";
import { buildHistogram } from "../lib/histogram";
import type { SolvePoint } from "../lib/rolling";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

export function HistogramChart({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  // Histogramm braucht möglichst viele Daten für aussagekraeftige
  // Verteilung. Default: alle (mit hartem Cap auf 100k zur Sicherheit).
  const params: SolveListParams = { limit: 100_000 };
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading, error } = useSolves(params);

  const data = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const points: SolvePoint[] = solves.map((s) => ({
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
    }));
    return buildHistogram(points);
  }, [solves]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-gray-400 text-base">
        {t("charts.histLoading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        {t("stats.errorPrefix", { message: error.message })}
      </div>
    );
  }
  if (!solves || solves.length === 0 || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-2xl font-semibold text-gray-100 mb-2">
          {t("charts.histTitle")}
        </h3>
        <p className="text-base text-gray-500">{t("charts.histEmpty")}</p>
      </div>
    );
  }

  const totalValid = data.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold text-gray-100">
            {t("charts.histTitle")}{" "}
            <span className="text-base text-gray-400">
              {t("charts.histValidCount", { count: totalValid })}
            </span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">{t("charts.histInfoTitle")}</p>
            <p>{t("charts.histInfoBody")}</p>
          </InfoButton>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 13 }} width={50} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v) => [t("charts.histCountTooltip", { count: v }), ""]}
            labelFormatter={(label) =>
              t("charts.histBinTooltip", { label })
            }
          />
          <Bar dataKey="count" fill="#a855f7" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// HistogramChart: Verteilung der Solve-Zeiten als Bar-Chart.
// Zeigt, wo die meisten deiner Zeiten liegen — gibt Auskunft ueber
// Form-Konsistenz (schmaler Peak) vs. Streuung (breite Verteilung).

import { useMemo } from "react";
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
import { buildHistogram } from "../lib/histogram";
import type { SolvePoint } from "../lib/rolling";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

export function HistogramChart({ cubeType, sessionId }: Props) {
  // Histogramm braucht moeglichst viele Daten fuer aussagekraeftige
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
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400">
        Histogramm wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-5 text-red-300">
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!solves || solves.length === 0 || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Verteilung</h3>
        <p className="text-sm text-gray-500">
          Keine validen Solves im aktuellen Filter.
        </p>
      </div>
    );
  }

  const totalValid = data.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-100">
          Verteilung{" "}
          <span className="text-sm text-gray-400">
            ({totalValid} valide Solves)
          </span>
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v) => [`${v} Solves`, ""]}
            labelFormatter={(label) => `Bin ${label}s`}
          />
          <Bar dataKey="count" fill="#a855f7" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

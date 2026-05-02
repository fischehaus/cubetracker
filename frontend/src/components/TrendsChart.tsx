// TrendsChart: Verlauf von Single-Zeit + ao5 + ao12 + ao100 ueber die Zeit.
// Clientseitig berechnet aus geladenen Solves (chronologisch sortiert).
//
// X-Achse: Solve-Index (1 = aeltester geladener Solve)
// Y-Achse: Zeit in Sekunden
// Linien: ao5 (gruen), ao12 (blau), ao100 (lila), Singles als Streupunkte (grau)

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSolves, type SolveListParams } from "../lib/api";
import { formatTime } from "../lib/format";
import { rollingAverages, type SolvePoint } from "../lib/rolling";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

interface ChartPoint {
  index: number;
  single: number | null; // null = DNF
  ao5: number | null;
  ao12: number | null;
  ao100: number | null;
}

export function TrendsChart({ cubeType, sessionId }: Props) {
  // Wir laden bewusst eine moderate Anzahl, sonst wird der Chart zu unruhig.
  // Selector erlaubt User, den Ausschnitt zu vergroessern.
  const [windowSize, setWindowSize] = useState<number>(500);
  const [showSingles, setShowSingles] = useState<boolean>(false);

  const params: SolveListParams = { limit: windowSize };
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading, error } = useSolves(params);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    // API liefert DESC (neueste zuerst). Fuer Trend-Chart chronologisch:
    const chronological = [...solves].reverse();
    const points: SolvePoint[] = chronological.map((s) => ({
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
    }));
    const ao5s = rollingAverages(points, 5);
    const ao12s = rollingAverages(points, 12);
    const ao100s = rollingAverages(points, 100);
    return chronological.map((s, i) => ({
      index: i + 1,
      single: s.dnf ? null : s.time_ms + (s.plus_two ? 2000 : 0),
      ao5: ao5s[i],
      ao12: ao12s[i],
      ao100: ao100s[i],
    }));
  }, [solves]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400">
        Trends werden geladen …
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
  if (!solves || solves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Trends</h3>
        <p className="text-sm text-gray-500">Keine Daten im aktuellen Filter.</p>
      </div>
    );
  }

  // Y-Achse: in Sekunden statt ms — Recharts default-Format ist sonst hoch
  const tickFormatter = (ms: number) => formatTime(ms);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-100">
          Trends <span className="text-sm text-gray-400">({chartData.length} Solves)</span>
        </h3>
        <div className="flex gap-2 items-center text-xs">
          <label className="flex items-center gap-1 text-gray-400">
            <input
              type="checkbox"
              checked={showSingles}
              onChange={(e) => setShowSingles(e.target.checked)}
              className="accent-purple-500"
            />
            Singles
          </label>
          <select
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
            title="Anzahl letzter Solves im Chart"
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={5000}>5000</option>
            <option value={100000}>Alle</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="index" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis
            stroke="#6b7280"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11 }}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v) => {
              if (v == null) return "–";
              return formatTime(typeof v === "number" ? v : Number(v));
            }}
            labelFormatter={(idx) => `Solve #${idx}`}
          />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
          {showSingles && (
            <Line
              type="monotone"
              dataKey="single"
              stroke="#6b7280"
              strokeWidth={1}
              dot={false}
              connectNulls={false}
              name="Single"
            />
          )}
          <Line
            type="monotone"
            dataKey="ao5"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            name="ao5"
          />
          <Line
            type="monotone"
            dataKey="ao12"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            name="ao12"
          />
          <Line
            type="monotone"
            dataKey="ao100"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            connectNulls
            name="ao100"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

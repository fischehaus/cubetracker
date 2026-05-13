// TrendsChart: Verlauf von Single-Zeit + ao5 + ao12 + ao100 ueber die Zeit.
// Clientseitig berechnet aus geladenen Solves (chronologisch sortiert).
//
// X-Achse: Solve-Index (1 = aeltester geladener Solve)
// Y-Achse: Zeit in Sekunden — smart auto-skaliert (P2..P98 mit Padding) und
//          manuell ueberschreibbar via min/max Inputs. Bei jedem Filter-
//          oder Window-Wechsel: zurueck zu auto, damit man nicht eine
//          alte Skala auf neue Daten sieht.
// Linien: ao5 (gruen), ao12 (blau), ao100 (lila), Singles als Streupunkte (grau)

import { useEffect, useMemo, useState } from "react";
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
import { InfoButton } from "./InfoButton";
import { computeYDomain, parseSecondsToMs } from "../lib/chart-utils";
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

  // Manuelle Y-Achsen-Override. Beide null → Auto-Modus.
  const [manualMin, setManualMin] = useState<string>("");
  const [manualMax, setManualMax] = useState<string>("");

  // Bei jedem Filter- oder Window-Wechsel: manuelle Werte zuruecksetzen.
  // Ohne diesen Reset wuerde z.B. eine 3x3-Skala (10s..14s) bei Wechsel
  // auf 2x2 die ganzen 2x2-Werte (3s..5s) abschneiden.
  useEffect(() => {
    setManualMin("");
    setManualMax("");
  }, [cubeType, sessionId, windowSize]);

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

  // Auto-Domain: nur aus den Avgs berechnen, nicht aus Singles. Singles
  // koennen wild streuen (DNFs, vergessene Timer) — die Avgs sind die
  // ehrliche Bandbreite des Hauptverlaufs.
  const autoDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 1000];
    const avgValues: (number | null)[] = [];
    for (const p of chartData) {
      avgValues.push(p.ao5, p.ao12, p.ao100);
    }
    return computeYDomain(avgValues);
  }, [chartData]);

  // Effektive Domain: manuelle Werte ueberschreiben jeweils einzeln.
  const manualMinMs = parseSecondsToMs(manualMin);
  const manualMaxMs = parseSecondsToMs(manualMax);
  const effectiveDomain: [number, number] = [
    manualMinMs ?? autoDomain[0],
    manualMaxMs ?? autoDomain[1],
  ];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-gray-400 text-base">
        Trends werden geladen …
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
  if (!solves || solves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-2xl font-semibold text-gray-100 mb-2">Trends</h3>
        <p className="text-base text-gray-500">Keine Daten im aktuellen Filter.</p>
      </div>
    );
  }

  const tickFormatter = (ms: number) => formatTime(ms);
  const isManual = manualMinMs !== null || manualMaxMs !== null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold text-gray-100">
            Trends <span className="text-base text-gray-400">({chartData.length} Solves)</span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">Trends-Chart</p>
            <p>
              Verlauf deiner Solve-Zeiten ueber Zeit. Punkte = einzelne
              Solves (Singles), Linien = gleitende Mittel (AO5/AO12).
              Y-Achse: Zeit (kleiner = besser). Hilft Plateaus + Sprung-
              Verbesserungen zu erkennen. Y-Bereich manuell setzbar fuer
              Detail-Fokus.
            </p>
          </InfoButton>
        </div>
        <div className="flex gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5 text-gray-400">
            <input
              type="checkbox"
              checked={showSingles}
              onChange={(e) => setShowSingles(e.target.checked)}
              className="accent-purple-500 w-4 h-4"
            />
            Singles
          </label>
          <select
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
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

      {/* Y-Achsen-Controls — Auto by default, manuelle Override-Inputs */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400 flex-wrap">
        <span>Y-Achse:</span>
        <span className="text-gray-500">
          auto {formatTime(autoDomain[0])} – {formatTime(autoDomain[1])}
        </span>
        <span className="text-gray-600">·</span>
        <label className="flex items-center gap-1.5">
          min
          <input
            type="text"
            value={manualMin}
            onChange={(e) => setManualMin(e.target.value)}
            placeholder="auto"
            className="w-20 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5">
          max
          <input
            type="text"
            value={manualMax}
            onChange={(e) => setManualMax(e.target.value)}
            placeholder="auto"
            className="w-20 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-100 focus:border-purple-500 focus:outline-none"
          />
        </label>
        {isManual && (
          <button
            onClick={() => {
              setManualMin("");
              setManualMax("");
            }}
            className="rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-600"
          >
            Reset
          </button>
        )}
        <span className="text-gray-500 ml-1 text-xs">in Sekunden, z.B. „10" oder „1:30"</span>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="index" stroke="#6b7280" tick={{ fontSize: 13 }} />
          <YAxis
            stroke="#6b7280"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 13 }}
            width={60}
            domain={effectiveDomain}
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
            formatter={(v) => {
              if (v == null) return "–";
              return formatTime(typeof v === "number" ? v : Number(v));
            }}
            labelFormatter={(idx) => `Solve #${idx}`}
          />
          <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
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

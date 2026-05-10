// AnalyseFilterBar: zentrale Filter-Leiste fuer den ANALYSE-Tab.
// Wirkt auf alle Karten unten (Stats, TrendsChart, ActivityChart,
// HistogramChart, HardwareCompareCard, SolveList).
//
// Phase L-2: Session-Selektor zog hier hin (war vorher global im Header).
// Damit ist der Filter klar lokal — was hier gewaehlt ist, gilt nur fuer
// ANALYSE; DASHBOARD/VERWALTUNG haben eigene Filter.

import { useSessions } from "../lib/api";
import { COMMON_CUBE_TYPES } from "../lib/format";

interface Props {
  cubeFilter: string;
  onCubeFilterChange: (s: string) => void;
  sessionId: number | null;
  onSessionIdChange: (id: number | null) => void;
}

export function AnalyseFilterBar({
  cubeFilter,
  onCubeFilterChange,
  sessionId,
  onSessionIdChange,
}: Props) {
  const { data: sessions } = useSessions();
  const hasFilter = !!cubeFilter || sessionId !== null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 flex items-center gap-4 flex-wrap">
      <span className="text-base font-semibold text-gray-300">Filter</span>

      <label className="flex items-center gap-2 text-base">
        <span className="text-gray-400">Cube</span>
        <select
          value={cubeFilter}
          onChange={(e) => onCubeFilterChange(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Alle</option>
          {COMMON_CUBE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-base">
        <span className="text-gray-400">Session</span>
        <select
          value={sessionId === null ? "__all__" : String(sessionId)}
          onChange={(e) =>
            onSessionIdChange(
              e.target.value === "__all__" ? null : parseInt(e.target.value, 10)
            )
          }
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="__all__">Alle Sessions</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {hasFilter && (
        <button
          onClick={() => {
            onCubeFilterChange("");
            onSessionIdChange(null);
          }}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-600"
        >
          Alle Filter zuruecksetzen
        </button>
      )}
    </div>
  );
}

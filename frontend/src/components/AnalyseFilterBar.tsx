// AnalyseFilterBar: zentrale Filter-Leiste fuer den ANALYSE-Tab.
// Cube-Filter wirkt auf alle Karten unten (TrendsChart, HistogramChart,
// SolveList, StatsCard). Session bleibt global im Header.
//
// Frueher hing der Cube-Filter im SolveList-Header — das war verwirrend
// (filterte er nur die Liste oder alles?). Jetzt explizit oben in der
// Filter-Leiste, mit Reset-Button und „aktive Filter"-Anzeige.

import { COMMON_CUBE_TYPES } from "../lib/format";

interface Props {
  cubeFilter: string;
  onCubeFilterChange: (s: string) => void;
}

export function AnalyseFilterBar({ cubeFilter, onCubeFilterChange }: Props) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 flex items-center gap-4 flex-wrap">
      <span className="text-sm font-semibold text-gray-300">Filter</span>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Cube</span>
        <select
          value={cubeFilter}
          onChange={(e) => onCubeFilterChange(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Alle</option>
          {COMMON_CUBE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {cubeFilter && (
        <button
          onClick={() => onCubeFilterChange("")}
          className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-600"
        >
          Filter zuruecksetzen
        </button>
      )}
      <span className="text-xs text-gray-500 ml-auto">
        Session-Filter sitzt oben im Header und gilt App-weit.
      </span>
    </div>
  );
}

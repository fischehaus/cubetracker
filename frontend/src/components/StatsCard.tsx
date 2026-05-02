// Stats-Card: zeigt Avg5/12/100, Best, Worst, Mean fuer die
// aktuell gefilterte Solve-Menge (cube_type + session_id).

import { useStats } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

interface StatRow {
  label: string;
  value: number | null;
  highlight?: boolean;
}

function Stat({ label, value, highlight }: StatRow) {
  return (
    <div
      className={`flex justify-between items-baseline border-b border-gray-800/60 py-2 ${
        highlight ? "border-purple-500/40" : ""
      }`}
    >
      <span className="text-base text-gray-400">{label}</span>
      <span
        className={`font-mono text-base ${
          value === null ? "text-gray-600" : "text-gray-100"
        } ${highlight ? "text-purple-300" : ""}`}
      >
        {value === null ? "–" : formatTime(value)}
      </span>
    </div>
  );
}

export function StatsCard({ cubeType, sessionId }: Props) {
  const params: { cube_type?: string; session_id?: number } = {};
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;

  const { data, isLoading, error } = useStats(params);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-gray-400 text-base">
        Stats werden geladen …
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
  if (!data || data.count === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">Statistiken</h2>
        <p className="text-base text-gray-500">
          Noch keine Solves im aktuellen Filter.
        </p>
      </div>
    );
  }

  const filterLabel =
    cubeType && sessionId !== null
      ? `${cubeType} • Session`
      : cubeType
      ? cubeType
      : sessionId !== null
      ? "Session"
      : "Alle Solves";

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-100">Statistiken</h2>
        <span className="text-sm text-gray-500">{filterLabel}</span>
      </div>

      {/* Counter — gross + bauchig */}
      <div className="grid grid-cols-3 gap-3 mb-5 text-center">
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">{data.count}</div>
          <div className="text-sm text-gray-500 mt-1">Solves</div>
        </div>
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">
            {data.count_valid}
          </div>
          <div className="text-sm text-gray-500 mt-1">Valide</div>
        </div>
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">
            {data.count_dnf}
          </div>
          <div className="text-sm text-gray-500 mt-1">DNF</div>
        </div>
      </div>

      {/* Singles */}
      <div className="mb-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          Singles
        </h3>
        <Stat label="Best (PB)" value={data.best_ms} highlight />
        <Stat label="Worst" value={data.worst_ms} />
        <Stat label="Mean" value={data.mean_ms} />
      </div>

      {/* Aktuelle Averages */}
      <div className="mb-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          Aktuelle Averages
        </h3>
        <Stat label="Ao5 (letzte 5)" value={data.current_ao5} />
        <Stat label="Ao12 (letzte 12)" value={data.current_ao12} />
        <Stat label="Ao100 (letzte 100)" value={data.current_ao100} />
      </div>

      {/* Beste Averages */}
      <div>
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          Beste Averages (PB)
        </h3>
        <Stat label="Best Ao5" value={data.best_ao5} highlight />
        <Stat label="Best Ao12" value={data.best_ao12} highlight />
        <Stat label="Best Ao100" value={data.best_ao100} highlight />
      </div>
    </div>
  );
}

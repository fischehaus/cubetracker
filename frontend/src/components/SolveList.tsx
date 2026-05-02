// Liste der Solves als Tabelle, mit Filter (Cube-Type, Session, Limit) und
// Loeschen/Toggle-Buttons. Zeigt rollende ao5/ao12 unter jeder Zeit, sowie
// PB-Marker (Best-Solve goldfarben) basierend auf Stats-API.

import { useMemo, useState } from "react";
import { useDeleteSolve, useSolves, useStats, useUpdateSolve, type SolveListParams } from "../lib/api";
import { COMMON_CUBE_TYPES, formatDate, formatSolveTime, formatTime } from "../lib/format";
import { rollingAverages, type SolvePoint } from "../lib/rolling";

interface Props {
  sessionId: number | null; // null = alle Sessions
  cubeFilter: string; // gemeinsamer Cube-Filter, vom Parent verwaltet
  onCubeFilterChange: (cube: string) => void;
}

// Auswahl-Optionen fuer den Limit-Selector. -1 steht fuer „alles".
const LIMIT_OPTIONS: { value: number; label: string }[] = [
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
  { value: -1, label: "Alle" },
];

export function SolveList({ sessionId, cubeFilter, onCubeFilterChange }: Props) {
  const [limit, setLimit] = useState<number>(100);

  const params: SolveListParams = {};
  // -1 (Alle) → wir setzen ein sehr hohes Limit. Backend verkraftet 50k+ ohne Probleme.
  if (limit === -1) params.limit = 100_000;
  else params.limit = limit;
  if (cubeFilter) params.cube_type = cubeFilter;
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading, error } = useSolves(params);

  // Stats fuer denselben Filter — fuer Best-Marker brauchen wir nur die best_solve_id
  const statsParams: { cube_type?: string; session_id?: number } = {};
  if (cubeFilter) statsParams.cube_type = cubeFilter;
  if (sessionId !== null) statsParams.session_id = sessionId;
  const { data: stats } = useStats(statsParams);
  const bestSolveId = stats?.best_solve_id ?? null;

  const del = useDeleteSolve();
  const update = useUpdateSolve();

  // Rolling ao5/ao12 berechnen — der API-Output ist DESC (neueste zuerst).
  // Fuer rollende Avgs brauchen wir chronologisch (alt → neu), also reversed.
  const { ao5Map, ao12Map } = useMemo(() => {
    if (!solves || solves.length === 0) {
      return {
        ao5Map: new Map<number, number | null>(),
        ao12Map: new Map<number, number | null>(),
      };
    }
    const chronological = [...solves].reverse();
    const points: SolvePoint[] = chronological.map((s) => ({
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
    }));
    const ao5s = rollingAverages(points, 5);
    const ao12s = rollingAverages(points, 12);
    const ao5M = new Map<number, number | null>();
    const ao12M = new Map<number, number | null>();
    chronological.forEach((s, i) => {
      ao5M.set(s.id, ao5s[i]);
      ao12M.set(s.id, ao12s[i]);
    });
    return { ao5Map: ao5M, ao12Map: ao12M };
  }, [solves]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400">
        Solves werden geladen …
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
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Solves</h2>
        <p className="text-gray-400">
          {cubeFilter
            ? `Keine Solves fuer "${cubeFilter}" vorhanden.`
            : "Noch keine Solves. Trag oben einen ein oder importier deine csTimer-Daten."}
        </p>
        {cubeFilter && (
          <button
            onClick={() => onCubeFilterChange("")}
            className="mt-3 text-sm text-purple-400 hover:text-purple-300"
          >
            Filter zuruecksetzen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-100">
          Solves <span className="text-sm text-gray-400">({solves.length})</span>
        </h2>
        <div className="flex gap-2 items-center">
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            title="Maximale Anzahl angezeigter Solves"
          >
            {LIMIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={cubeFilter}
            onChange={(e) => onCubeFilterChange(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="">Alle Cube-Types</option>
            {COMMON_CUBE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2 pr-3 font-medium">Zeit</th>
              <th className="py-2 pr-3 font-medium">Cube</th>
              <th className="py-2 pr-3 font-medium">Notiz</th>
              <th className="py-2 pr-3 font-medium text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {solves.map((s) => {
              const isBest = s.id === bestSolveId;
              const ao5 = ao5Map.get(s.id) ?? null;
              const ao12 = ao12Map.get(s.id) ?? null;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    isBest ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="py-2 pr-3 font-mono align-top">
                    <div title={formatDate(s.timestamp)}>
                      {isBest && (
                        <span
                          className="inline-block mr-1.5 text-xs"
                          title="Persoenliche Bestzeit (PB)"
                        >
                          ★
                        </span>
                      )}
                      <span
                        className={
                          isBest
                            ? "text-yellow-300 font-semibold"
                            : "text-gray-100"
                        }
                      >
                        {formatSolveTime(s)}
                      </span>
                    </div>
                    {/* ao5/ao12 als kleine Sub-Zeile — wie csTimer-Liste */}
                    <div className="text-[10px] text-gray-500 mt-0.5 font-normal">
                      ao5 {ao5 !== null ? formatTime(ao5) : "–"} · ao12{" "}
                      {ao12 !== null ? formatTime(ao12) : "–"}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-gray-300 align-top">
                    {s.cube_type}
                  </td>
                  <td
                    className="py-2 pr-3 text-gray-400 text-xs max-w-xs truncate align-top"
                    title={s.notes ?? ""}
                  >
                    {s.notes ?? ""}
                  </td>
                  <td className="py-2 pr-3 text-right space-x-2 align-top">
                    {!s.dnf && (
                      <button
                        onClick={() =>
                          update.mutate({
                            id: s.id,
                            payload: { plus_two: !s.plus_two },
                          })
                        }
                        className={`text-xs rounded px-2 py-1 ${
                          s.plus_two
                            ? "bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                        title="+2-Strafe togglen"
                      >
                        +2
                      </button>
                    )}
                    <button
                      onClick={() =>
                        update.mutate({ id: s.id, payload: { dnf: !s.dnf } })
                      }
                      className={`text-xs rounded px-2 py-1 ${
                        s.dnf
                          ? "bg-red-600/30 text-red-300 hover:bg-red-600/50"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                      title="DNF togglen"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Solve loeschen?")) del.mutate(s.id);
                      }}
                      className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title="Loeschen"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

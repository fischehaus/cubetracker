// Liste der Solves als Tabelle, mit Filter (Cube-Type, Session) und Loeschen-Button.
// Markiert Best-Solve (PB) goldfarben.

import { useDeleteSolve, useSolves, useStats, useUpdateSolve, type SolveListParams } from "../lib/api";
import { COMMON_CUBE_TYPES, formatDate, formatSolveTime } from "../lib/format";

interface Props {
  sessionId: number | null; // null = alle Sessions
  cubeFilter: string; // gemeinsamer Cube-Filter, vom Parent verwaltet
  onCubeFilterChange: (cube: string) => void;
}

export function SolveList({ sessionId, cubeFilter, onCubeFilterChange }: Props) {
  const params: SolveListParams = { limit: 100 };
  if (cubeFilter) params.cube_type = cubeFilter;
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading, error } = useSolves(params);

  // Stats fuer den selben Filter — fuer Best-Marker brauchen wir nur die best_solve_id
  const statsParams: { cube_type?: string; session_id?: number } = {};
  if (cubeFilter) statsParams.cube_type = cubeFilter;
  if (sessionId !== null) statsParams.session_id = sessionId;
  const { data: stats } = useStats(statsParams);
  const bestSolveId = stats?.best_solve_id ?? null;

  const del = useDeleteSolve();
  const update = useUpdateSolve();

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">
          Solves <span className="text-sm text-gray-400">(letzte {solves.length})</span>
        </h2>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2 pr-3 font-medium">Zeit</th>
              <th className="py-2 pr-3 font-medium">Cube</th>
              <th className="py-2 pr-3 font-medium">Datum</th>
              <th className="py-2 pr-3 font-medium">Notiz</th>
              <th className="py-2 pr-3 font-medium text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {solves.map((s) => {
              const isBest = s.id === bestSolveId;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    isBest ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="py-2 pr-3 font-mono">
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
                  </td>
                  <td className="py-2 pr-3 text-gray-300">{s.cube_type}</td>
                  <td className="py-2 pr-3 text-gray-400 text-xs">
                    {formatDate(s.timestamp)}
                  </td>
                  <td
                    className="py-2 pr-3 text-gray-400 text-xs max-w-xs truncate"
                    title={s.notes ?? ""}
                  >
                    {s.notes ?? ""}
                  </td>
                  <td className="py-2 pr-3 text-right space-x-2">
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

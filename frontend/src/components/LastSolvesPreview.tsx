// LastSolvesPreview: kompakte Live-Anzeige der letzten Solves +
// prominenter Live-ao5/ao12 fuer den TIMER-Tab.
//
// Bewusst klein und ohne Edit-Aktionen — die volle editierbare Liste
// wohnt im ANALYSE-Tab. Hier geht es nur um Sehen waehrend des Solvens.

import { useDeleteSolve, useSolves, useStats, useUpdateSolve } from "../lib/api";
import { formatSolveTime, formatTime } from "../lib/format";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

const PREVIEW_COUNT = 8;

export function LastSolvesPreview({ cubeType, sessionId }: Props) {
  const params: { cube_type?: string; session_id?: number; limit: number } = {
    limit: PREVIEW_COUNT,
    cube_type: cubeType,
  };
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves } = useSolves(params);

  const statsParams: { cube_type?: string; session_id?: number } = {
    cube_type: cubeType,
  };
  if (sessionId !== null) statsParams.session_id = sessionId;
  const { data: stats } = useStats(statsParams);

  const update = useUpdateSolve();
  const del = useDeleteSolve();
  const lastSolve = solves && solves.length > 0 ? solves[0] : null;
  const isLastPb = lastSolve != null && stats?.best_solve_id === lastSolve.id;

  return (
    <div className="space-y-4">
      {/* Live-Stats prominent: letzter Solve + ao5/ao12 */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
          Live ({cubeType})
        </h3>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500">Letzter Solve</div>
            <div className="flex items-baseline gap-2">
              {lastSolve ? (
                <>
                  <span
                    className={`font-mono text-3xl ${
                      isLastPb ? "text-yellow-300 font-bold" : "text-gray-100"
                    }`}
                  >
                    {formatSolveTime(lastSolve)}
                  </span>
                  {isLastPb && (
                    <span className="text-yellow-300 text-sm font-semibold">
                      ★ neue PB!
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-600 text-2xl">–</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">ao5</div>
              <div className="font-mono text-2xl text-gray-100">
                {stats?.current_ao5 != null ? formatTime(stats.current_ao5) : "–"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ao12</div>
              <div className="font-mono text-2xl text-gray-100">
                {stats?.current_ao12 != null ? formatTime(stats.current_ao12) : "–"}
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Actions auf den letzten Solve, damit „+2 nachtraeglich" und
            „doch DNF" nicht in den ANALYSE-Tab zwingen */}
        {lastSolve && (
          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2 flex-wrap">
            <span className="text-xs text-gray-500 self-center">Letzten Solve:</span>
            {!lastSolve.dnf && (
              <button
                onClick={() =>
                  update.mutate({
                    id: lastSolve.id,
                    payload: { plus_two: !lastSolve.plus_two },
                  })
                }
                className={`text-xs rounded px-2 py-1 ${
                  lastSolve.plus_two
                    ? "bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                +2
              </button>
            )}
            <button
              onClick={() =>
                update.mutate({
                  id: lastSolve.id,
                  payload: { dnf: !lastSolve.dnf },
                })
              }
              className={`text-xs rounded px-2 py-1 ${
                lastSolve.dnf
                  ? "bg-red-600/30 text-red-300 hover:bg-red-600/50"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              DNF
            </button>
            <button
              onClick={() => {
                if (confirm("Letzten Solve loeschen?")) del.mutate(lastSolve.id);
              }}
              className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Letzte 8 Solves zur Kontrolle */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
          Letzte {PREVIEW_COUNT} ({cubeType})
        </h3>
        {solves && solves.length > 0 ? (
          <ul className="space-y-1">
            {solves.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center justify-between text-sm font-mono py-1 ${
                  i === 0 ? "text-gray-100" : "text-gray-400"
                }`}
              >
                <span>{formatSolveTime(s)}</span>
                <span className="text-[10px] text-gray-600">#{solves.length - i}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Noch keine Solves fuer {cubeType}. Tipp eine Zeit links ein.
          </p>
        )}
      </div>
    </div>
  );
}

// OutlierCard: zeigt verdaechtige Solve-Zeiten gruppiert nach Cube-Type.
// Quick-Actions: DNF setzen oder loeschen — direkt aus der Card.
//
// Wird nur gerendert, wenn tatsaechlich Outliers gefunden werden — sonst
// bleibt der Platz im aside frei.
//
// Akzeptiert optional einen Session-Filter: wenn der User in einer
// bestimmten Session arbeitet, kann er sich auf deren Outliers
// beschraenken — Cube-uebergreifend bleibt es trotzdem.

import { useMemo } from "react";
import {
  useDeleteSolve,
  useSolves,
  useUpdateSolve,
  type SolveListParams,
} from "../lib/api";
import { formatTime } from "../lib/format";
import { findOutliers, type OutlierInput } from "../lib/outliers";

interface Props {
  sessionId: number | null;
}

export function OutlierCard({ sessionId }: Props) {
  // Cube-uebergreifend laden, optional auf Session einschraenken.
  const params: SolveListParams = { limit: 100_000 };
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading } = useSolves(params);
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  const groups = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const inputs: OutlierInput[] = solves.map((s) => ({
      id: s.id,
      time_ms: s.time_ms,
      cube_type: s.cube_type,
      dnf: s.dnf,
      plus_two: s.plus_two,
    }));
    return findOutliers(inputs);
  }, [solves]);

  if (isLoading) return null; // still — andere Cards zeigen das Loading
  if (groups.length === 0) return null; // nichts Verdaechtiges → Card weglassen

  const totalOutliers = groups.reduce((sum, g) => sum + g.outliers.length, 0);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-amber-200">
          Verdaechtige Zeiten
        </h2>
        <span className="text-xs text-amber-300/70">
          {totalOutliers} {totalOutliers === 1 ? "Solve" : "Solves"}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Solves, die deutlich vom typischen Tempo dieses Cubes abweichen
        (vermutlich Timer-Fehler oder vergessene Solves).
        {sessionId !== null && " Nur die aktive Session."}
      </p>

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.cube_type}>
            <div className="text-xs text-gray-400 mb-1">
              <span className="text-gray-200 font-medium">{g.cube_type}</span>
              <span className="ml-2">
                Median {formatTime(g.median_ms)} ueber {g.count_total} Solves
              </span>
            </div>
            <ul className="space-y-1">
              {g.outliers.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-xs bg-gray-900/40 rounded px-2 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={
                        o.reason === "too_fast"
                          ? "text-blue-300 font-mono"
                          : "text-red-300 font-mono"
                      }
                      title={
                        o.reason === "too_fast"
                          ? `${(o.factor * 100).toFixed(0)}% des Medians`
                          : `${o.factor.toFixed(1)}x Median`
                      }
                    >
                      {formatTime(o.effective_ms)}
                    </span>
                    <span className="text-gray-500 truncate">
                      {o.reason === "too_fast" ? "verdaechtig schnell" : "verdaechtig langsam"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => update.mutate({ id: o.id, payload: { dnf: true } })}
                      className="rounded bg-red-700/40 px-2 py-0.5 text-red-200 hover:bg-red-700/60"
                      title="Als DNF markieren — bleibt erhalten, fliegt aber aus den Stats"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Solve #${o.id} (${formatTime(o.effective_ms)}) wirklich loeschen?`))
                          del.mutate(o.id);
                      }}
                      className="rounded bg-gray-700 px-2 py-0.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title="Solve loeschen"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

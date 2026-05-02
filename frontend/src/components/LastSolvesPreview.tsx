// LastSolvesPreview: kompakte Live-Anzeige fuer den TIMER-Tab.
//
// Zeigt drei Bloecke:
//  1. LIVE-Card: letzter Solve, ao5, ao12, plus Form-Vergleich gegen das
//     Mittel der letzten N Solves (N waehlbar: 100/500/alle).
//  2. Letzte 8 Solves zur Kontrolle, mit Quick-Delete pro Solve
//     (vertippte Eingabe schnell wegmachen).
//
// Keine Edit-Aktionen ausser Delete und +2/DNF auf den letzten —
// die volle bearbeitbare Liste lebt im ANALYSE-Tab.

import { useMemo, useState } from "react";
import {
  useDeleteSolve,
  useSolves,
  useStats,
  useUpdateSolve,
} from "../lib/api";
import { formatSolveTime, formatTime } from "../lib/format";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

const PREVIEW_COUNT = 8;

interface WindowOption {
  value: number;
  label: string;
}
const WINDOW_OPTIONS: WindowOption[] = [
  { value: 100, label: "letzte 100" },
  { value: 500, label: "letzte 500" },
  { value: 100_000, label: "alle" },
];

export function LastSolvesPreview({ cubeType, sessionId }: Props) {
  // Window fuer Form-Vergleich (default 100, persistiert lokal pro session)
  const [windowSize, setWindowSize] = useState<number>(100);

  // Eine Query fuer die ausgewaehlte Fenstergroesse — Mini-Liste schneidet
  // sich daraus die ersten 8 Eintraege.
  const params: { cube_type: string; session_id?: number; limit: number } = {
    cube_type: cubeType,
    limit: windowSize,
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

  // Mittel der geladenen Window-Solves (effective_ms, DNF raus, +2 drin).
  const windowMean = useMemo<number | null>(() => {
    if (!solves || solves.length === 0) return null;
    const valid = solves
      .filter((s) => !s.dnf)
      .map((s) => s.time_ms + (s.plus_two ? 2000 : 0));
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }, [solves]);

  // Form: current_ao5 relativ zum Window-Mittel.
  // - negativ → aktuell besser (gruen)
  // - positiv → aktuell schlechter (rot)
  // - rund 0  → durchschnittlich (grau)
  const formPct: number | null = useMemo(() => {
    if (stats?.current_ao5 == null || windowMean == null || windowMean === 0)
      return null;
    return (stats.current_ao5 - windowMean) / windowMean;
  }, [stats, windowMean]);

  function formColor(p: number): string {
    if (p < -0.05) return "text-emerald-400";
    if (p > 0.05) return "text-red-400";
    return "text-gray-400";
  }

  return (
    <div className="space-y-4">
      {/* Live-Stats prominent: letzter Solve + ao5/ao12 + Form-Vergleich */}
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

          {/* Form-Vergleich: aktueller ao5 vs Mittel des Fensters */}
          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              Form vs.
              <select
                value={windowSize}
                onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
                className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-gray-100 focus:border-purple-500 focus:outline-none"
              >
                {WINDOW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {formPct !== null ? (
              <div className="flex items-baseline gap-3">
                <span
                  className={`font-mono text-2xl font-semibold ${formColor(formPct)}`}
                  title={`ao5 ${stats?.current_ao5 != null ? formatTime(stats.current_ao5) : "–"} vs. Mittel ${windowMean != null ? formatTime(windowMean) : "–"}`}
                >
                  {formPct < 0 ? "▼ " : formPct > 0 ? "▲ +" : "• "}
                  {(formPct * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  Mittel {windowMean != null ? formatTime(windowMean) : "–"}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                noch nicht genug Daten
              </div>
            )}
          </div>
        </div>

        {/* Quick-Actions auf den letzten Solve */}
        {lastSolve && (
          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2 flex-wrap">
            <span className="text-xs text-gray-500 self-center">Letzten:</span>
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

      {/* Letzte 8 Solves zur Kontrolle — mit Quick-Delete pro Eintrag */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
          Letzte {PREVIEW_COUNT} ({cubeType})
        </h3>
        {solves && solves.length > 0 ? (
          <ul className="space-y-1">
            {solves.slice(0, PREVIEW_COUNT).map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center justify-between text-sm font-mono py-1 ${
                  i === 0 ? "text-gray-100" : "text-gray-400"
                }`}
              >
                <span>{formatSolveTime(s)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">
                    #{solves.length - i}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm(`Solve ${formatSolveTime(s)} loeschen?`))
                        del.mutate(s.id);
                    }}
                    className="text-xs rounded bg-gray-800 px-1.5 py-0.5 text-gray-500 hover:bg-red-700/40 hover:text-red-200"
                    title="Solve loeschen (z.B. bei vertippter Eingabe)"
                  >
                    🗑
                  </button>
                </div>
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

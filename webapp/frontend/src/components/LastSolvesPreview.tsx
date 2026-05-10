// LastSolvesPreview: kompakte Live-Anzeige fuer den TIMER-Tab.
//
// Dazu eine kleine FormRow-Helper-Komponente fuer die Form-Vergleichszeilen.
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

  // Form-Helper: Prozent-Vergleich aktuelles aoX vs Window-Mittel.
  // negativ → besser (gruen), positiv → schlechter (rot), ~0 → grau.
  function pctVsWindow(currentAvg: number | null | undefined): number | null {
    if (currentAvg == null || windowMean == null || windowMean === 0) return null;
    return (currentAvg - windowMean) / windowMean;
  }
  function formColor(p: number): string {
    if (p < -0.05) return "text-emerald-400";
    if (p > 0.05) return "text-red-400";
    return "text-gray-400";
  }

  return (
    <div className="space-y-4">
      {/* Live-Stats prominent: letzter Solve + ao5/ao12 + Form-Vergleich */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-base uppercase tracking-wide text-gray-500 mb-4">
          Live ({cubeType})
        </h3>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Letzter Solve</div>
            <div className="flex items-baseline gap-3 mt-1">
              {lastSolve ? (
                <>
                  <span
                    className={`font-mono text-4xl ${
                      isLastPb ? "text-yellow-300 font-bold" : "text-gray-100"
                    }`}
                  >
                    {formatSolveTime(lastSolve)}
                  </span>
                  {isLastPb && (
                    <span className="text-yellow-300 text-base font-semibold">
                      ★ neue PB!
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-600 text-3xl">–</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-500">ao5</div>
              <div className="font-mono text-3xl text-gray-100">
                {stats?.current_ao5 != null ? formatTime(stats.current_ao5) : "–"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">ao12</div>
              <div className="font-mono text-3xl text-gray-100">
                {stats?.current_ao12 != null ? formatTime(stats.current_ao12) : "–"}
              </div>
            </div>
          </div>

          {/* Form-Vergleich: aktuelle ao5/ao12/ao100 vs Mittel des Fensters.
              Selector gilt fuer alle drei Zeilen gleichzeitig. */}
          <div className="pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500 mb-2">
              <div className="flex items-center gap-2">
                Form vs.
                <select
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
                >
                  {WINDOW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-gray-600">
                Mittel {windowMean != null ? formatTime(windowMean) : "–"}
              </span>
            </div>
            <div className="space-y-1.5">
              <FormRow
                label="ao5"
                pct={pctVsWindow(stats?.current_ao5)}
                colorFn={formColor}
              />
              <FormRow
                label="ao12"
                pct={pctVsWindow(stats?.current_ao12)}
                colorFn={formColor}
              />
              <FormRow
                label="ao100"
                pct={pctVsWindow(stats?.current_ao100)}
                colorFn={formColor}
              />
            </div>
          </div>
        </div>

        {/* Quick-Actions auf den letzten Solve */}
        {lastSolve && (
          <div className="mt-4 pt-3 border-t border-gray-800 flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500">Letzten:</span>
            {!lastSolve.dnf && (
              <button
                onClick={() =>
                  update.mutate({
                    id: lastSolve.id,
                    payload: { plus_two: !lastSolve.plus_two },
                  })
                }
                className={`text-sm rounded px-2.5 py-1.5 ${
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
              className={`text-sm rounded px-2.5 py-1.5 ${
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
              className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Letzte 8 Solves zur Kontrolle — mit Quick-Delete pro Eintrag */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-base uppercase tracking-wide text-gray-500 mb-3">
          Letzte {PREVIEW_COUNT} ({cubeType})
        </h3>
        {solves && solves.length > 0 ? (
          <ul className="space-y-1.5">
            {solves.slice(0, PREVIEW_COUNT).map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center justify-between text-base font-mono py-1.5 ${
                  i === 0 ? "text-gray-100" : "text-gray-400"
                }`}
              >
                <span>{formatSolveTime(s)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    #{solves.length - i}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm(`Solve ${formatSolveTime(s)} loeschen?`))
                        del.mutate(s.id);
                    }}
                    className="text-sm rounded bg-gray-800 px-2 py-1 text-gray-500 hover:bg-red-700/40 hover:text-red-200"
                    title="Solve loeschen (z.B. bei vertippter Eingabe)"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-gray-500">
            Noch keine Solves fuer {cubeType}. Tipp eine Zeit links ein.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper: eine Zeile im Form-Vergleichs-Block.
//   pct = null  → '–' (z.B. weil current_aoX noch nicht da ist)
//   pct < 0     → ▼ gruen (besser als baseline)
//   pct > 0     → ▲ rot   (schlechter)
//   pct ~ 0     → •  grau (durchschnittlich)
// ============================================================
function FormRow({
  label,
  pct,
  colorFn,
}: {
  label: string;
  pct: number | null;
  colorFn: (p: number) => string;
}) {
  if (pct === null) {
    return (
      <div className="flex items-baseline justify-between text-base">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-600 font-mono">–</span>
      </div>
    );
  }
  const arrow = pct < 0 ? "▼" : pct > 0 ? "▲" : "•";
  const sign = pct >= 0 ? "+" : "";
  return (
    <div className="flex items-baseline justify-between text-base">
      <span className="text-gray-300">{label}</span>
      <span className={`font-mono text-lg font-semibold ${colorFn(pct)}`}>
        {arrow} {sign}
        {(pct * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// OutlierCard: zeigt verdaechtige Solve-Zeiten gruppiert nach Cube-Type.
// Quick-Actions: DNF setzen oder loeschen — direkt aus der Card.
//
// Phase L-2: managed eigenen Session-Filter intern (vorher vom Aussen
// per prop) — die Card lebt jetzt im VERWALTUNG-Tab und hat dort
// keinen globalen Header-Filter mehr.

import { useMemo, useState } from "react";
import {
  useDeleteSolve,
  useSessions,
  useSolves,
  useUpdateSolve,
  type SolveListParams,
} from "../lib/api";
import { formatTime } from "../lib/format";
import {
  findOutliers,
  findOutliersBySession,
  type OutlierInput,
} from "../lib/outliers";

type GroupMode = "cube" | "session";

export function OutlierCard() {
  // Eigener session-filter (default 'alle')
  const [sessionId, setSessionId] = useState<number | null>(null);
  // Phase 8.1: Toggle Median-Berechnung pro Cube vs pro Session
  const [groupMode, setGroupMode] = useState<GroupMode>("cube");
  const { data: sessions } = useSessions();

  // Cube-uebergreifend laden, optional auf Session einschraenken.
  const params: SolveListParams = { limit: 100_000 };
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading } = useSolves(params);
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  const sessionNameById = useMemo(() => {
    const m = new Map<number, string>();
    sessions?.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sessions]);

  const groups = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const inputs: OutlierInput[] = solves.map((s) => ({
      id: s.id,
      time_ms: s.time_ms,
      cube_type: s.cube_type,
      dnf: s.dnf,
      plus_two: s.plus_two,
      session_id: s.session_id,
    }));
    return groupMode === "session"
      ? findOutliersBySession(inputs)
      : findOutliers(inputs);
  }, [solves, groupMode]);

  // Bei aktivem Filter aber leeren Daten zeigen wir trotzdem die card
  // mit dem selektor — sonst kann der user nicht zuruckwechseln.
  if (isLoading)
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Outliers werden geladen …
      </div>
    );

  const totalOutliers = groups.reduce((sum, g) => sum + g.outliers.length, 0);

  return (
    <div className={
      groups.length === 0
        ? "rounded-lg border border-gray-700 bg-gray-900/50 p-6"
        : "rounded-lg border border-amber-500/40 bg-amber-500/5 p-6"
    }>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className={
          groups.length === 0
            ? "text-2xl font-semibold text-gray-100"
            : "text-2xl font-semibold text-amber-200"
        }>
          Verdaechtige Zeiten
          {groups.length > 0 && (
            <span className="ml-2 text-sm text-amber-300/70 font-normal">
              ({totalOutliers} {totalOutliers === 1 ? "Solve" : "Solves"})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Phase 8.1: Toggle Median-pro-Cube vs Median-pro-Session.
              Sinnvoll wenn man mehrere Sessions desselben Cubes hat
              (z.B. „3x3 Training" + „3x3 Speed") — pro-Session-Median
              ist ehrlicher fuer Anomalie-Erkennung. */}
          <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1 text-xs">
            <button
              onClick={() => setGroupMode("cube")}
              className={`rounded px-2 py-1 font-medium transition ${
                groupMode === "cube"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              title="Median pro Cube-Type"
            >
              pro Cube
            </button>
            <button
              onClick={() => setGroupMode("session")}
              className={`rounded px-2 py-1 font-medium transition ${
                groupMode === "session"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              title="Median pro Session"
            >
              pro Session
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            Session:
            <select
              value={sessionId === null ? "__all__" : String(sessionId)}
              onChange={(e) =>
                setSessionId(
                  e.target.value === "__all__" ? null : parseInt(e.target.value, 10)
                )
              }
              className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="__all__">Alle Sessions</option>
              {sessions?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-base text-gray-400">
          Keine verdaechtigen Zeiten in
          {sessionId !== null ? " der gewaehlten Session" : " den Daten"}. ✅
        </p>
      ) : (
        <p className="text-sm text-gray-400 mb-4">
          Solves, die deutlich vom typischen Tempo dieses Cubes abweichen
          (vermutlich Timer-Fehler oder vergessene Solves).
          {sessionId !== null && " Nur die aktive Session."}
        </p>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          // Label je nach groupMode: cube-mode → cube-name; session-mode →
          // session-name (oder „ohne Session"). Lookup via sessionNameById.
          const label =
            groupMode === "cube"
              ? g.cube_type
              : g.session_id == null
              ? "Ohne Session"
              : sessionNameById.get(g.session_id) ?? `Session #${g.session_id}`;
          return (
          <div key={g.group_key}>
            <div className="text-sm text-gray-400 mb-2">
              <span className="text-gray-200 font-medium">{label}</span>
              <span className="ml-2">
                Median {formatTime(g.median_ms)} ueber {g.count_total} Solves
              </span>
            </div>
            <ul className="space-y-1.5">
              {g.outliers.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-sm bg-gray-900/40 rounded px-3 py-2"
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
                    <span className="text-gray-500 truncate text-xs">
                      {o.reason === "too_fast" ? "verdaechtig schnell" : "verdaechtig langsam"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => update.mutate({ id: o.id, payload: { dnf: true } })}
                      className="text-xs rounded bg-red-700/40 px-2 py-1 text-red-200 hover:bg-red-700/60"
                      title="Als DNF markieren — bleibt erhalten, fliegt aber aus den Stats"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Solve #${o.id} (${formatTime(o.effective_ms)}) wirklich loeschen?`))
                          del.mutate(o.id);
                      }}
                      className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title="Solve loeschen"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>
    </div>
  );
}

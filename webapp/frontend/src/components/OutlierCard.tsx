// OutlierCard: zeigt verdächtige Solve-Zeiten gruppiert nach Cube-Type.
// Quick-Actions: DNF setzen oder löschen — direkt aus der Card.
//
// Phase L-2: managed eigenen Session-Filter intern (vorher vom Aussen
// per prop) — die Card lebt jetzt im VERWALTUNG-Tab und hat dort
// keinen globalen Header-Filter mehr.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeleteSolve,
  useSessions,
  useSolves,
  useUpdateSolve,
  type SolveListParams,
} from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";
import {
  findOutliers,
  findOutliersBySession,
  type OutlierInput,
} from "../lib/outliers";

type GroupMode = "cube" | "session";

export function OutlierCard() {
  const { t } = useTranslation();
  // Eigener session-filter (default 'alle')
  const [sessionId, setSessionId] = useState<number | null>(null);
  // Phase 8.1: Toggle Median-Berechnung pro Cube vs pro Session
  const [groupMode, setGroupMode] = useState<GroupMode>("cube");
  const { data: sessions } = useSessions();

  // Cube-übergreifend laden, optional auf Session einschraenken.
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
        {t("outlierCard.loading")}
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
        <div className="flex items-center gap-2">
          <h2 className={
            groups.length === 0
              ? "text-2xl font-semibold text-gray-100"
              : "text-2xl font-semibold text-amber-200"
          }>
            {t("outlierCard.title")}
            {groups.length > 0 && (
              <span className="ml-2 text-sm text-amber-300/70 font-normal">
                {t(
                  totalOutliers === 1
                    ? "outlierCard.countSingular"
                    : "outlierCard.countPlural",
                  { count: totalOutliers },
                )}
              </span>
            )}
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("outlierCard.infoTitle")}</p>
            <p>{t("outlierCard.infoBody")}</p>
          </InfoButton>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Phase 8.1: Toggle Median-pro-Cube vs Median-pro-Session.
              Sinnvoll wenn man mehrere Sessions desselben Cubes hat
              (z.B. „3x3 Training" + „3x3 Speed") — pro-Session-Median
              ist ehrlicher für Anomalie-Erkennung. */}
          <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1 text-xs">
            <button
              onClick={() => setGroupMode("cube")}
              className={`rounded px-2 py-1 font-medium transition ${
                groupMode === "cube"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              title={t("outlierCard.modePerCubeTitle")}
            >
              {t("outlierCard.modePerCubeLabel")}
            </button>
            <button
              onClick={() => setGroupMode("session")}
              className={`rounded px-2 py-1 font-medium transition ${
                groupMode === "session"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              title={t("outlierCard.modePerSessionTitle")}
            >
              {t("outlierCard.modePerSessionLabel")}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            {t("outlierCard.sessionFilter")}
            <select
              value={sessionId === null ? "__all__" : String(sessionId)}
              onChange={(e) =>
                setSessionId(
                  e.target.value === "__all__" ? null : parseInt(e.target.value, 10)
                )
              }
              className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="__all__">{t("outlierCard.allSessions")}</option>
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
          {t(
            sessionId !== null
              ? "outlierCard.emptySession"
              : "outlierCard.emptyAll",
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-400 mb-4">
          {t(
            sessionId !== null
              ? "outlierCard.introSession"
              : "outlierCard.introAll",
          )}
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
              ? t("outlierCard.withoutSession")
              : sessionNameById.get(g.session_id) ??
                t("outlierCard.sessionFallback", { id: g.session_id });
          return (
          <div key={g.group_key}>
            <div className="text-sm text-gray-400 mb-2">
              <span className="text-gray-200 font-medium">{label}</span>
              <span className="ml-2">
                {t("outlierCard.medianSummary", {
                  time: formatTime(g.median_ms),
                  count: g.count_total,
                })}
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
                          ? t("outlierCard.factorTooFastTitle", {
                              percent: (o.factor * 100).toFixed(0),
                            })
                          : t("outlierCard.factorTooSlowTitle", {
                              factor: o.factor.toFixed(1),
                            })
                      }
                    >
                      {formatTime(o.effective_ms)}
                    </span>
                    <span className="text-gray-500 truncate text-xs">
                      {o.reason === "too_fast"
                        ? t("outlierCard.tooFast")
                        : t("outlierCard.tooSlow")}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => update.mutate({ id: o.id, payload: { dnf: true } })}
                      className="text-xs rounded bg-red-700/40 px-2 py-1 text-red-200 hover:bg-red-700/60"
                      title={t("outlierCard.dnfButtonTitle")}
                    >
                      {t("outlierCard.dnfButton")}
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            t("outlierCard.deleteConfirm", {
                              id: o.id,
                              time: formatTime(o.effective_ms),
                            }),
                          )
                        )
                          del.mutate(o.id);
                      }}
                      className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title={t("outlierCard.deleteButtonTitle")}
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

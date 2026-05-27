// Liste der Solves als Tabelle, mit Filter (Cube-Type, Session, Limit) und
// Löschen/Toggle-Buttons. Zeigt rollende ao5/ao12 unter jeder Zeit, sowie
// PB-Marker: aktueller Allzeit-Best gold ★, alte (ueberbotene) PBs dezent ☆
// (W.pb-history) — basierend auf Stats-API (best_solve_id + pb_solve_ids).
//
// F7: Inline-Edit für Zeit + Notizen — click auf den Wert wechselt in
// Edit-Mode, Enter speichert, Esc bricht ab. Cube-Type bleibt
// read-only (Änderungen seltener; ggf. später via Edit-Dialog).

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeleteSolve,
  useHardware,
  useSolves,
  useStats,
  useUpdateSolve,
  type SolveListParams,
} from "../lib/api";
import {
  formatDate,
  formatSolveTime,
  formatTime,
  parseTimeInput,
} from "../lib/format";
import {
  rollingAverages,
  rollingMeans,
  type SolvePoint,
} from "../lib/rolling";
import {
  nextSortState,
  sortIndicator,
  sortSolveRows,
  type SortDir,
  type SortKey,
} from "../lib/solve-sort";
import type { Solve } from "../lib/types";
import { InfoButton } from "./InfoButton";
import { SolveDetailModal } from "./SolveDetailModal";

interface Props {
  sessionId: number | null; // null = alle Sessions
  cubeFilter: string; // gemeinsamer Cube-Filter, vom Parent verwaltet
  onCubeFilterChange: (cube: string) => void;
}

// Auswahl-Optionen für den Limit-Selector. -1 steht für „alles".
// W.i18n-list: das "Alle"-Label wird zur Render-Zeit übersetzt
// (siehe useLimitOptions); die numerischen Labels bleiben sprach-
// unabhängig.
const LIMIT_VALUES: { value: number; label: string | null }[] = [
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
  { value: -1, label: null }, // „Alle" / „All" — i18n-gerendert
];

// Notes-Edit raus aus der Tabelle — wird nur noch im Detail-Modal angezeigt.
// Nur Zeit-Inline-Edit bleibt in der Tabelle.
type EditingState = { solveId: number; field: "time" } | null;

export function SolveList({ sessionId, cubeFilter, onCubeFilterChange }: Props) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState<number>(100);
  const [editing, setEditing] = useState<EditingState>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  // Solve, der gerade im Detail-Modal angezeigt wird (Phase L-3b)
  const [detailSolve, setDetailSolve] = useState<Solve | null>(null);
  // Sortierung: Default # desc (API liefert eh DESC, das spiegelt
  // chronologisch die neuesten oben).
  const [sortKey, setSortKey] = useState<SortKey>("num");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(clicked: SortKey) {
    const next = nextSortState({ key: sortKey, dir: sortDir }, clicked);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

  const params: SolveListParams = {};
  // -1 (Alle) → wir setzen ein sehr hohes Limit. Backend verkraftet 50k+ ohne Probleme.
  if (limit === -1) params.limit = 100_000;
  else params.limit = limit;
  if (cubeFilter) params.cube_type = cubeFilter;
  if (sessionId !== null) params.session_id = sessionId;
  const { data: solves, isLoading, error } = useSolves(params);

  // Stats für denselben Filter — für Best-Marker brauchen wir nur die best_solve_id
  const statsParams: { cube_type?: string; session_id?: number } = {};
  if (cubeFilter) statsParams.cube_type = cubeFilter;
  if (sessionId !== null) statsParams.session_id = sessionId;
  const { data: stats } = useStats(statsParams);
  const bestSolveId = stats?.best_solve_id ?? null;
  // W.pb-history: alle Solves, die je ein Single-PB waren (auch alte/ueberbotene).
  const pbSolveIds = useMemo(
    () => new Set<number>(stats?.pb_solve_ids ?? []),
    [stats],
  );
  // W.avg-pb-dots: Anker-IDs aller ao5/ao12-PBs (current best + alte).
  // Anker = letzter Solve im jeweiligen Best-Window (siehe calc.py).
  const ao5PbSolveIds = useMemo(
    () => new Set<number>(stats?.ao5_pb_solve_ids ?? []),
    [stats],
  );
  const ao12PbSolveIds = useMemo(
    () => new Set<number>(stats?.ao12_pb_solve_ids ?? []),
    [stats],
  );
  const bestAo5SolveId = stats?.best_ao5_solve_id ?? null;
  const bestAo12SolveId = stats?.best_ao12_solve_id ?? null;

  const del = useDeleteSolve();
  const update = useUpdateSolve();

  // Hardware-Lookup: id → name, für Anzeige in der Cube-Spalte
  const { data: hardware } = useHardware();
  const hardwareById = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of hardware ?? []) m.set(h.id, h.name);
    return m;
  }, [hardware]);

  // Rolling Mo3/AO5/AO12/AO100 — API liefert DESC, Rolling braucht
  // chronologisch. Reverse + per ID zurueckmappen.
  const { mo3Map, ao5Map, ao12Map, ao100Map } = useMemo(() => {
    const empty = {
      mo3Map: new Map<number, number | null>(),
      ao5Map: new Map<number, number | null>(),
      ao12Map: new Map<number, number | null>(),
      ao100Map: new Map<number, number | null>(),
    };
    if (!solves || solves.length === 0) return empty;
    const chronological = [...solves].reverse();
    const points: SolvePoint[] = chronological.map((s) => ({
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
    }));
    const mo3s = rollingMeans(points, 3);
    const ao5s = rollingAverages(points, 5);
    const ao12s = rollingAverages(points, 12);
    const ao100s = rollingAverages(points, 100);
    const mo3M = new Map<number, number | null>();
    const ao5M = new Map<number, number | null>();
    const ao12M = new Map<number, number | null>();
    const ao100M = new Map<number, number | null>();
    chronological.forEach((s, i) => {
      mo3M.set(s.id, mo3s[i]);
      ao5M.set(s.id, ao5s[i]);
      ao12M.set(s.id, ao12s[i]);
      ao100M.set(s.id, ao100s[i]);
    });
    return { mo3Map: mo3M, ao5Map: ao5M, ao12Map: ao12M, ao100Map: ao100M };
  }, [solves]);

  // Solvenummer-Berechnung: API liefert die letzten `limit` Solves in DESC.
  // Wir nehmen `stats.count` als Total + leiten die Nummer ab.
  // Wichtig: Solvenummer hängt am Solve, NICHT am Sortier-Index.
  // Sort-Reihenfolge ändert nur die UI-Reihenfolge, die Nummer bleibt.
  const sortedDisplay = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const totalCount = stats?.count ?? solves.length;
    const rows = solves.map((s, indexInDesc) => ({
      solve: s,
      solveNumber: totalCount - indexInDesc,
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
      mo3: mo3Map.get(s.id) ?? null,
      ao5: ao5Map.get(s.id) ?? null,
      ao12: ao12Map.get(s.id) ?? null,
      ao100: ao100Map.get(s.id) ?? null,
    }));
    return sortSolveRows(rows, sortKey, sortDir);
  }, [solves, stats?.count, mo3Map, ao5Map, ao12Map, ao100Map, sortKey, sortDir]);

  // Edit-Mode starten — nur noch Zeit, Notiz lebt im Detail-Modal.
  function startEdit(solveId: number, initial: string) {
    setEditing({ solveId, field: "time" });
    setDraftValue(initial);
    setEditError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraftValue("");
    setEditError(null);
  }

  // Save: parseTimeInput akzeptiert alle Formate inkl. csTimer-Stackmat.
  function saveEdit() {
    if (!editing) return;
    const ms = parseTimeInput(draftValue);
    if (ms === null) {
      setEditError(t("solveList.editError"));
      return;
    }
    update.mutate(
      { id: editing.solveId, payload: { time_ms: ms } },
      { onSuccess: cancelEdit, onError: (e) => setEditError(e.message) },
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-gray-400 text-base">
        {t("solveList.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        {t("solveList.errorPrefix", { message: error.message })}
      </div>
    );
  }
  if (!solves || solves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          {t("solveList.title")}
        </h2>
        <p className="text-base text-gray-400">
          {cubeFilter
            ? t("solveList.emptyWithFilter", { cube: cubeFilter })
            : t("solveList.emptyNoFilter")}
        </p>
        {cubeFilter && (
          <button
            onClick={() => onCubeFilterChange("")}
            className="mt-3 text-base text-purple-400 hover:text-purple-300"
          >
            {t("solveList.resetFilter")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("solveList.title")}{" "}
            <span className="text-base text-gray-400">
              ({solves.length}
              {cubeFilter && ` · ${cubeFilter}`})
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("solveList.infoTitle")}</p>
            <p>{t("solveList.infoBody")}</p>
          </InfoButton>
        </div>
        {/* Limit-Selektor bleibt list-spezifisch. Cube-Filter sitzt in
            der AnalyseFilterBar oben. */}
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
          title={t("solveList.limitTitle")}
        >
          {LIMIT_VALUES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label ?? t("solveList.limitAll")}
            </option>
          ))}
        </select>
      </div>

      {editError && (
        <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {editError}
        </div>
      )}

      {/* Mobile-First (2026-05-14):
          - Auf Phone sichtbar: #, Zeit, Mo3, AO5, Aktionen — der Rest
            (AO12, AO100, Cube, Hardware) erst ab md sichtbar.
          - overflow-x-auto bleibt als Fallback. */}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
              <SortableTh
                label={t("solveList.colNumber")}
                sortKey="num"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label={t("solveList.colTime")}
                sortKey="time"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label={t("solveList.colMo3")}
                sortKey="mo3"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label={t("solveList.colAo5")}
                sortKey="ao5"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label={t("solveList.colAo12")}
                sortKey="ao12"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
                hideOnMobile
              />
              <SortableTh
                label={t("solveList.colAo100")}
                sortKey="ao100"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
                hideOnMobile
              />
              <th className="py-2.5 pr-3 font-medium hidden md:table-cell">
                {t("solveList.colCube")}
              </th>
              <th className="py-2.5 pr-3 font-medium hidden md:table-cell">
                {t("solveList.colHardware")}
              </th>
              <th className="py-2.5 pr-3 font-medium text-right">
                {t("solveList.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDisplay.map((row) => {
              const s = row.solve;
              const isBest = s.id === bestSolveId;
              const isOldPb = !isBest && pbSolveIds.has(s.id);
              const isEditingTime =
                editing?.solveId === s.id && editing.field === "time";
              const hardwareName =
                s.hardware_id !== null
                  ? (hardwareById.get(s.hardware_id) ?? null)
                  : null;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    isBest ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="py-2 pr-3 text-sm text-gray-500 font-mono align-top">
                    {row.solveNumber}
                  </td>
                  <td className="py-2 pr-3 font-mono align-top">
                    {isEditingTime ? (
                      <input
                        type="text"
                        value={draftValue}
                        autoFocus
                        onChange={(e) => setDraftValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={() => {
                          if (!editError) saveEdit();
                        }}
                        className="w-24 rounded border border-purple-500 bg-gray-800 px-1 py-0.5 text-gray-100 text-sm focus:outline-none"
                      />
                    ) : (
                      <div
                        title={t("solveList.timeEditTitle", {
                          date: formatDate(s.timestamp),
                        })}
                        className="cursor-pointer"
                        onClick={() =>
                          startEdit(s.id, formatTime(s.time_ms))
                        }
                      >
                        {isBest && (
                          <span
                            className="inline-block mr-1.5 text-xs text-yellow-300"
                            title={t("solveList.pbStarTitle")}
                          >
                            ★
                          </span>
                        )}
                        {isOldPb && (
                          <span
                            className="inline-block mr-1.5 text-xs text-yellow-600/80"
                            title={t("solveList.pbOldTitle")}
                          >
                            ☆
                          </span>
                        )}
                        <span
                          className={
                            isBest
                              ? "text-yellow-300 font-semibold"
                              : isOldPb
                                ? "text-yellow-500/90"
                                : "text-gray-100"
                          }
                        >
                          {formatSolveTime(s)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm text-gray-500 align-top">
                    {row.mo3 !== null ? formatTime(row.mo3) : "–"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm align-top">
                    {row.ao5 !== null ? (
                      <span
                        className={
                          ao5PbSolveIds.has(s.id)
                            ? "text-cyan-300"
                            : "text-gray-500"
                        }
                      >
                        {ao5PbSolveIds.has(s.id) && (
                          <span
                            className="text-cyan-400 mr-1"
                            title={
                              s.id === bestAo5SolveId
                                ? t("solveList.ao5PbCurrentTitle")
                                : t("solveList.ao5PbOldTitle")
                            }
                          >
                            ●
                          </span>
                        )}
                        {formatTime(row.ao5)}
                      </span>
                    ) : (
                      <span className="text-gray-500">–</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm align-top hidden md:table-cell">
                    {row.ao12 !== null ? (
                      <span
                        className={
                          ao12PbSolveIds.has(s.id)
                            ? "text-emerald-300"
                            : "text-gray-500"
                        }
                      >
                        {ao12PbSolveIds.has(s.id) && (
                          <span
                            className="text-emerald-400 mr-1"
                            title={
                              s.id === bestAo12SolveId
                                ? t("solveList.ao12PbCurrentTitle")
                                : t("solveList.ao12PbOldTitle")
                            }
                          >
                            ●
                          </span>
                        )}
                        {formatTime(row.ao12)}
                      </span>
                    ) : (
                      <span className="text-gray-500">–</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm text-gray-500 align-top hidden md:table-cell">
                    {row.ao100 !== null ? formatTime(row.ao100) : "–"}
                  </td>
                  <td className="py-2 pr-3 text-gray-300 align-top hidden md:table-cell">
                    {s.cube_type}
                  </td>
                  <td
                    className="py-2 pr-3 text-sm text-gray-400 align-top hidden md:table-cell"
                    title={hardwareName ?? t("solveList.noHardwareTitle")}
                  >
                    {hardwareName ?? (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right space-x-2 align-top">
                    <button
                      onClick={() => setDetailSolve(s)}
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-purple-700/40 hover:text-purple-100"
                      title={t("solveList.detailsTitle")}
                    >
                      ℹ
                    </button>
                    {!s.dnf && (
                      <button
                        onClick={() =>
                          update.mutate({
                            id: s.id,
                            payload: { plus_two: !s.plus_two },
                          })
                        }
                        className={`text-sm rounded px-2.5 py-1.5 ${
                          s.plus_two
                            ? "bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                        title={t("solveList.plusTwoToggleTitle")}
                      >
                        +2
                      </button>
                    )}
                    <button
                      onClick={() =>
                        update.mutate({ id: s.id, payload: { dnf: !s.dnf } })
                      }
                      className={`text-sm rounded px-2.5 py-1.5 ${
                        s.dnf
                          ? "bg-red-600/30 text-red-300 hover:bg-red-600/50"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                      title={t("solveList.dnfToggleTitle")}
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("solveList.deleteConfirm"))) del.mutate(s.id);
                      }}
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
                      title={t("solveList.deleteTitle")}
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

      <p className="mt-3 text-xs text-gray-500">{t("solveList.tipFooter")}</p>

      {detailSolve && (
        <SolveDetailModal
          solve={detailSolve}
          ao5={ao5Map.get(detailSolve.id) ?? null}
          ao12={ao12Map.get(detailSolve.id) ?? null}
          isPb={detailSolve.id === bestSolveId}
          onClose={() => setDetailSolve(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Sortable Table Header
// ============================================================

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  hideOnMobile,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  /** Mobile-First: Spalte auf <md ausblenden (Details über ℹ-Button). */
  hideOnMobile?: boolean;
}) {
  const isActive = sortKey === activeKey;
  return (
    <th
      className={`py-2.5 pr-3 font-medium cursor-pointer select-none ${
        hideOnMobile ? "hidden md:table-cell" : ""
      } ${isActive ? "text-purple-300" : "hover:text-gray-300"}`}
      onClick={() => onClick(sortKey)}
    >
      {label}
      {sortIndicator(sortKey, activeKey, dir)}
    </th>
  );
}

// LastSolvesPreview: kompakte Live-Anzeige fuer den TIMER-Tab.
//
// Dazu eine kleine FormRow-Helper-Komponente fuer die Form-Vergleichszeilen.
//
// Zeigt zwei Bloecke:
//  1. LIVE-Card: letzter Solve, ao5, ao12, plus Form-Vergleich gegen das
//     Mittel der letzten N Solves (N waehlbar: 100/500/alle).
//  2. Letzte X Solves als sortierbare Tabelle (Solvenummer, Zeit, AO5,
//     AO12). X einstellbar 10/20/50/100. Sortierung per Spalten-Klick.
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
import { rollingAverages, type SolvePoint } from "../lib/rolling";
import {
  nextSortState,
  sortIndicator,
  sortSolveRows,
  type SortDir,
  type SortKey,
} from "../lib/solve-sort";
import { InfoButton } from "./InfoButton";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

// Lookback fuer AO12 — Tabelle zeigt X Zeilen, fetch holt X+11 damit auch
// der aelteste angezeigte Solve seinen AO12 hat (sonst muesste man "—" zeigen).
const AO_LOOKBACK = 11;

interface WindowOption {
  value: number;
  label: string;
}
const WINDOW_OPTIONS: WindowOption[] = [
  { value: 100, label: "letzte 100" },
  { value: 500, label: "letzte 500" },
  { value: 100_000, label: "alle" },
];

// X-Picker fuer die Letzte-Solves-Tabelle
const TABLE_SIZE_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
];

export function LastSolvesPreview({ cubeType, sessionId }: Props) {
  // Window fuer Form-Vergleich (default 100, persistiert lokal pro session)
  const [windowSize, setWindowSize] = useState<number>(100);

  // Tabelle: X-Picker + Sort-State. Default 20, Default-Sort: Solvenummer desc.
  const [tableSize, setTableSize] = useState<number>(20);
  const [sortKey, setSortKey] = useState<SortKey>("num");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Wir laden max(windowSize, tableSize + AO_LOOKBACK) — eine Query reicht
  // fuer beide Use-Cases (Form-Vergleich + Tabelle).
  const fetchLimit = Math.max(windowSize, tableSize + AO_LOOKBACK);
  const params: { cube_type: string; session_id?: number; limit: number } = {
    cube_type: cubeType,
    limit: fetchLimit,
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

  // Rolling AO5/AO12 pro Solve. API liefert DESC (neueste zuerst), Rolling
  // braucht chronologisch (alt -> neu). Wir reversen + mappen zurueck per ID.
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

  // Tabellen-Rows: nur die ersten tableSize aus DESC, plus Solvenummer +
  // AO5/AO12 angeflanscht. Solvenummer = totalCount - indexInDescOfList.
  // Wir nutzen stats.count als totalCount (= alle Solves matching Filter).
  const tableRows = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const totalCount = stats?.count ?? solves.length;
    return solves.slice(0, tableSize).map((s, indexInDesc) => ({
      solve: s,
      solveNumber: totalCount - indexInDesc,
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
      ao5: ao5Map.get(s.id) ?? null,
      ao12: ao12Map.get(s.id) ?? null,
    }));
  }, [solves, stats?.count, tableSize, ao5Map, ao12Map]);

  // Sortierte Anzeige — Sort beruehrt nur die UI, Solvenummer bleibt fest.
  const sortedRows = useMemo(
    () => sortSolveRows(tableRows, sortKey, sortDir),
    [tableRows, sortKey, sortDir],
  );

  function handleSort(clicked: SortKey) {
    const next = nextSortState({ key: sortKey, dir: sortDir }, clicked);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base uppercase tracking-wide text-gray-500">
            Live ({cubeType})
          </h3>
          <InfoButton align="right">
            <p className="font-medium mb-1">Live-Karte</p>
            <p>
              Zeigt deinen <strong>letzten Solve</strong> + die aktuellen
              Averages (AO5/AO12 = trimmed mean der letzten 5/12 Solves,
              WCA-konform). „Form vs" vergleicht dein aktuelles Niveau mit
              dem Mittel eines waehlbaren Fensters (letzte 100/500/alle).
              Gruen = besser als Schnitt, rot = schlechter.
            </p>
          </InfoButton>
        </div>

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

      {/* Letzte X Solves — sortierbare Tabelle mit AO5/AO12 als Spalten */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-base uppercase tracking-wide text-gray-500">
              Letzte Solves ({cubeType})
            </h3>
            <InfoButton>
              <p className="font-medium mb-1">Letzte Solves</p>
              <p>
                Die zuletzt eingetragenen Solves dieses Cube-Typs. Anzahl
                ueber den Selector waehlbar (10/20/50/100). Klick auf
                Spaltenkopf sortiert (Solvenummer, Zeit, AO5, AO12). DNF
                und leere Averages landen beim Sortieren am Ende.
              </p>
            </InfoButton>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Anzahl
            <select
              value={tableSize}
              onChange={(e) => setTableSize(parseInt(e.target.value, 10))}
              className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              {TABLE_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {sortedRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <SortableHeader
                    label="#"
                    sortKey="num"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label="Zeit"
                    sortKey="time"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label="AO5"
                    sortKey="ao5"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label="AO12"
                    sortKey="ao12"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <th className="py-1.5 pr-1 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const isNewest = row.solveNumber === (stats?.count ?? 0);
                  return (
                    <tr
                      key={row.solve.id}
                      className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/30 ${
                        isNewest ? "text-gray-100" : "text-gray-400"
                      }`}
                    >
                      <td className="py-1.5 pr-2 text-xs text-gray-500 font-mono">
                        {row.solveNumber}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">
                        {formatSolveTime(row.solve)}
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-gray-500">
                        {row.ao5 !== null ? formatTime(row.ao5) : "–"}
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-gray-500">
                        {row.ao12 !== null ? formatTime(row.ao12) : "–"}
                      </td>
                      <td className="py-1.5 pr-0 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Solve ${formatSolveTime(row.solve)} loeschen?`,
                              )
                            )
                              del.mutate(row.solve.id);
                          }}
                          className="text-xs rounded bg-gray-800 px-1.5 py-0.5 text-gray-500 hover:bg-red-700/40 hover:text-red-200"
                          title="Solve loeschen"
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
        ) : (
          <p className="text-base text-gray-500">
            Noch keine Solves fuer {cubeType}. Tipp eine Zeit rechts ein.
          </p>
        )}
        <p className="mt-2 text-[10px] text-gray-600">
          Klick auf Spaltenkopf zum Sortieren.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Sortable Table Header (kleiner Helper — nur fuer diese Komponente)
// ============================================================

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const isActive = sortKey === activeKey;
  return (
    <th
      className={`py-1.5 pr-2 font-medium cursor-pointer select-none ${
        isActive ? "text-purple-300" : "hover:text-gray-300"
      }`}
      onClick={() => onClick(sortKey)}
    >
      {label}
      {sortIndicator(sortKey, activeKey, dir)}
    </th>
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

// LastSolvesPreview: kompakte Live-Anzeige für den TIMER-Tab.
//
// Dazu eine kleine FormRow-Helper-Komponente für die Form-Vergleichszeilen.
//
// Zeigt zwei Bloecke:
//  1. LIVE-Card: letzter Solve, ao5, ao12, plus Form-Vergleich gegen das
//     Mittel der letzten N Solves (N wählbar: 100/500/alle).
//  2. Letzte X Solves als sortierbare Tabelle (Solvenummer, Zeit, AO5,
//     AO12). X einstellbar 10/20/50/100. Sortierung per Spalten-Klick.
//
// Keine Edit-Aktionen ausser Delete und +2/DNF auf den letzten —
// die volle bearbeitbare Liste lebt im ANALYSE-Tab.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeleteSolve,
  useSolves,
  useStats,
  useUpdateSolve,
} from "../lib/api";
import { formatSolveTime, formatTime } from "../lib/format";
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
import { InfoButton } from "./InfoButton";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

// Lookback für AO100 — Tabelle zeigt X Zeilen, fetch holt X+99 damit auch
// der älteste angezeigte Solve seinen AO100 hat (sonst müsste man "—" zeigen).
// War vorher 11 für AO12; jetzt 99 weil AO100 das größte Window ist.
const AO_LOOKBACK = 99;

// Window-Optionen: Label-Keys statt fester Labels — werden zur Render-
// Zeit via t() lokalisiert (siehe useWindowOptions im Component).
const WINDOW_VALUES: { value: number; key: string }[] = [
  { value: 100, key: "lastSolvesPreview.windowLast100" },
  { value: 500, key: "lastSolvesPreview.windowLast500" },
  { value: 100_000, key: "lastSolvesPreview.windowAll" },
];

// X-Picker für die Letzte-Solves-Tabelle.
// W.timer-lastsolves-all (2026-05-28): erweitert um 200/500/„Alle" auf
// User-Wunsch. Bei „Alle" (value = -1) wird intern fetchLimit = 100_000
// gesetzt (Backend verkraftet das problemlos, siehe SolveList.tsx).
// Bei > 100 Zeilen bekommt die Tabelle einen internen vertikalen Scroll
// (max-h-96 + overflow-y-auto) damit die Karte nicht ewig hoch wird.
const TABLE_SIZE_OPTIONS: {
  value: number;
  label: string | null;
  i18nKey?: string;
}[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: -1, label: null, i18nKey: "lastSolvesPreview.tableSizeAll" },
];

export function LastSolvesPreview({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  // Window für Form-Vergleich (default 100, persistiert lokal pro session)
  const [windowSize, setWindowSize] = useState<number>(100);

  // Tabelle: X-Picker + Sort-State. Default 20, Default-Sort: Solvenummer desc.
  const [tableSize, setTableSize] = useState<number>(20);
  const [sortKey, setSortKey] = useState<SortKey>("num");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Wir laden max(windowSize, tableSize + AO_LOOKBACK) — eine Query reicht
  // für beide Use-Cases (Form-Vergleich + Tabelle).
  // W.timer-lastsolves-all v2 (2026-05-28): BUG-FIX! vorher 100_000 als
  // Effektiv-Limit + AO_LOOKBACK 99 = 100_099 → Backend cap `le=100_000`
  // wirft 422 → Frontend zeigt KEINE Solves bei „Alle". Jetzt auf 50_000
  // gecappt (50_099 + 99 < 100_000). Realistisches Maximum fuer einen
  // einzelnen User; falls jemand >50k Solves hat, kann er den Analyse-
  // Tab nutzen (eigener Selector).
  const effectiveTableSize = tableSize === -1 ? 50_000 : tableSize;
  const fetchLimit = Math.max(windowSize, effectiveTableSize + AO_LOOKBACK);
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

  // W.timer-polish-pbs (2026-05-28): PB-Marker analog SolveList.
  // Backend liefert pb_solve_ids (alle alten Single-PBs), ao5_pb_solve_ids,
  // ao12_pb_solve_ids. Plus best_solve_id (aktueller Single-PB).
  const bestSolveId = stats?.best_solve_id ?? null;
  const pbSolveIds = useMemo(
    () => new Set<number>(stats?.pb_solve_ids ?? []),
    [stats?.pb_solve_ids],
  );
  const ao5PbSolveIds = useMemo(
    () => new Set<number>(stats?.ao5_pb_solve_ids ?? []),
    [stats?.ao5_pb_solve_ids],
  );
  const ao12PbSolveIds = useMemo(
    () => new Set<number>(stats?.ao12_pb_solve_ids ?? []),
    [stats?.ao12_pb_solve_ids],
  );
  const bestAo5SolveId = stats?.best_ao5_solve_id ?? null;
  const bestAo12SolveId = stats?.best_ao12_solve_id ?? null;

  // W.timer-polish-pbs: ao100-Toggle (default off). User-Wunsch: optional
  // ao100 als zusaetzliche Spalte in der Letzte-Solves-Tabelle anzeigen.
  // Persistiert via localStorage damit der Toggle ueber Reloads bleibt.
  const [showAo100, setShowAo100] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cubetracker.last_solves_show_ao100") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "cubetracker.last_solves_show_ao100",
        showAo100 ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [showAo100]);

  // Rolling Mo3 / AO5 / AO12 / AO100 pro Solve. API liefert DESC, Rolling
  // braucht chronologisch — reversen + per ID zurueckmappen.
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

  // Tabellen-Rows: nur die ersten tableSize aus DESC, plus Solvenummer +
  // AO5/AO12 angeflanscht. Solvenummer = totalCount - indexInDescOfList.
  // Wir nutzen stats.count als totalCount (= alle Solves matching Filter).
  const tableRows = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const totalCount = stats?.count ?? solves.length;
    return solves.slice(0, effectiveTableSize).map((s, indexInDesc) => ({
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
  }, [solves, stats?.count, effectiveTableSize, mo3Map, ao5Map, ao12Map, ao100Map]);

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
  // negativ → besser (grün), positiv → schlechter (rot), ~0 → grau.
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
            {t("lastSolvesPreview.liveTitle", { cube: cubeType })}
          </h3>
          <InfoButton align="right">
            <p className="font-medium mb-1">
              {t("lastSolvesPreview.liveInfoTitle")}
            </p>
            <p>{t("lastSolvesPreview.liveInfoBody")}</p>
          </InfoButton>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">
              {t("lastSolvesPreview.lastSolve")}
            </div>
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
                      {t("lastSolvesPreview.newPb")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-600 text-3xl">–</span>
              )}
            </div>
          </div>

          {/* 2x2-Grid mit den 4 aktuellen Averages. Mo3 wird clientseitig
              aus der bereits geladenen mo3Map abgeleitet (kein Backend-
              Endpoint dafür) — der neueste Solve hat die ID des letzten
              Mo3-Fenster-Endes.
              W.timer-polish-pbs: PB-Wert in kleinerer Schrift unter dem
              current-Wert (User-Wunsch). „PB 10.45" — gold wenn current
              gleich PB ist (= neuer Bestwert). */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-500">mo3</div>
              <div className="font-mono text-3xl text-gray-100">
                {lastSolve && mo3Map.get(lastSolve.id) != null
                  ? formatTime(mo3Map.get(lastSolve.id) as number)
                  : "–"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">ao5</div>
              <div className="font-mono text-3xl text-gray-100">
                {stats?.current_ao5 != null ? formatTime(stats.current_ao5) : "–"}
              </div>
              {stats?.best_ao5 != null && (
                <div
                  className={`text-xs font-mono mt-0.5 ${
                    stats.current_ao5 != null && stats.current_ao5 <= stats.best_ao5
                      ? "text-yellow-300"
                      : "text-gray-500"
                  }`}
                >
                  PB {formatTime(stats.best_ao5)}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">ao12</div>
              <div className="font-mono text-3xl text-gray-100">
                {stats?.current_ao12 != null ? formatTime(stats.current_ao12) : "–"}
              </div>
              {stats?.best_ao12 != null && (
                <div
                  className={`text-xs font-mono mt-0.5 ${
                    stats.current_ao12 != null && stats.current_ao12 <= stats.best_ao12
                      ? "text-yellow-300"
                      : "text-gray-500"
                  }`}
                >
                  PB {formatTime(stats.best_ao12)}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">ao100</div>
              <div className="font-mono text-3xl text-gray-100">
                {stats?.current_ao100 != null ? formatTime(stats.current_ao100) : "–"}
              </div>
              {stats?.best_ao100 != null && (
                <div
                  className={`text-xs font-mono mt-0.5 ${
                    stats.current_ao100 != null &&
                    stats.current_ao100 <= stats.best_ao100
                      ? "text-yellow-300"
                      : "text-gray-500"
                  }`}
                >
                  PB {formatTime(stats.best_ao100)}
                </div>
              )}
            </div>
          </div>

          {/* Form-Vergleich: aktuelle ao5/ao12/ao100 vs Mittel des Fensters.
              Selector gilt für alle drei Zeilen gleichzeitig. */}
          <div className="pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500 mb-2">
              <div className="flex items-center gap-2">
                {t("lastSolvesPreview.formVs")}
                <select
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
                >
                  {WINDOW_VALUES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.key)}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-gray-600">
                {windowMean != null
                  ? t("lastSolvesPreview.meanLabel", {
                      mean: formatTime(windowMean),
                    })
                  : t("lastSolvesPreview.meanDash")}
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
            <span className="text-sm text-gray-500">
              {t("lastSolvesPreview.lastActions")}
            </span>
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
                if (confirm(t("lastSolvesPreview.deleteLastConfirm"))) del.mutate(lastSolve.id);
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
              {t("lastSolvesPreview.tableTitle", { cube: cubeType })}
            </h3>
            <InfoButton>
              <p className="font-medium mb-1">
                {t("lastSolvesPreview.tableInfoTitle")}
              </p>
              <p>{t("lastSolvesPreview.tableInfoBody")}</p>
            </InfoButton>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* W.timer-polish-pbs: AO100-Toggle (Checkbox) — User-Wunsch.
                Aus der Tabelle waere AO100 normalerweise raus (zu eng auf
                der schmalen Sidebar), aber wer's anschalten will, kann. */}
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showAo100}
                onChange={(e) => setShowAo100(e.target.checked)}
                className="accent-purple-500 w-3 h-3"
              />
              {t("lastSolvesPreview.toggleAo100")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              {t("lastSolvesPreview.countLabel")}
              <select
                value={tableSize}
                onChange={(e) => setTableSize(parseInt(e.target.value, 10))}
                className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
              >
                {TABLE_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label ?? (o.i18nKey ? t(o.i18nKey) : "?")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {sortedRows.length > 0 ? (
          // 5 Spalten (#, Zeit, Mo3, AO5, AO12, Aktion) — passen in die
          // schmale Sidebar ohne horizontalen Scroll. AO100 ist in der
          // Live-Karte oben verfügbar; in der Tabelle wenig nützlich,
          // weil 100er-Fenster sich pro Zeile fast nicht ändert (User-
          // Wunsch 2026-05-17: AO100 aus der Tabelle raus).
          // W.timer-lastsolves-all v2 (2026-05-28): bei tableSize > 20
          // (statt vorher > 100) bekommt der Wrapper internen vertikalen
          // Scroll. User-Wunsch: max ca. 20 Zeilen sichtbar, danach
          // scrollen — egal welcher Selector-Wert gewaehlt ist. Plus
          // farb-passender Scrollbar (purple-thin) statt Browser-Default.
          // Sticky-Header bleibt beim Scrollen sichtbar.
          // Hoehe-Rechnung: ~36px pro Zeile * 20 + ~40px sticky-header
          // = ~760px. Mit max-h-[760px] reine Tailwind-Loesung.
          <div
            className={`overflow-x-auto ${
              tableSize === -1 || tableSize > 20
                ? "max-h-[760px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/40 [&::-webkit-scrollbar-thumb]:bg-purple-500/55 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-purple-500/80"
                : ""
            }`}
            style={
              tableSize === -1 || tableSize > 20
                ? {
                    // Firefox + Chrome 121+ native CSS-Properties.
                    // Webkit-Browser (Safari) styled via Tailwind
                    // arbitrary variants (className oben).
                    scrollbarColor:
                      "rgba(168, 85, 247, 0.55) rgba(31, 41, 55, 0.4)",
                    scrollbarWidth: "thin",
                  }
                : undefined
            }
          >
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900/95 z-10">
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <SortableHeader
                    label={t("lastSolvesPreview.colNumber")}
                    sortKey="num"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label={t("lastSolvesPreview.colTime")}
                    sortKey="time"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label={t("lastSolvesPreview.colMo3")}
                    sortKey="mo3"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label={t("lastSolvesPreview.colAo5")}
                    sortKey="ao5"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  <SortableHeader
                    label={t("lastSolvesPreview.colAo12")}
                    sortKey="ao12"
                    activeKey={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                  />
                  {showAo100 && (
                    <SortableHeader
                      label={t("lastSolvesPreview.colAo100")}
                      sortKey="ao100"
                      activeKey={sortKey}
                      dir={sortDir}
                      onClick={handleSort}
                    />
                  )}
                  <th className="py-1.5 pr-1 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const isNewest = row.solveNumber === (stats?.count ?? 0);
                  const s = row.solve;
                  // W.timer-polish-pbs: PB-Marker analog SolveList.
                  const isBest = s.id === bestSolveId;
                  const isOldPb = !isBest && pbSolveIds.has(s.id);
                  const isAo5Pb = ao5PbSolveIds.has(s.id);
                  const isAo12Pb = ao12PbSolveIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/30 ${
                        isBest
                          ? "bg-yellow-500/5"
                          : isNewest
                            ? "text-gray-100"
                            : "text-gray-400"
                      }`}
                    >
                      <td className="py-1.5 pr-2 text-xs text-gray-500 font-mono">
                        {row.solveNumber}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">
                        {isBest && (
                          <span
                            className="text-yellow-300 text-xs mr-1"
                            title={t("lastSolvesPreview.pbStarTitle")}
                          >
                            ★
                          </span>
                        )}
                        {isOldPb && (
                          <span
                            className="text-yellow-600/80 text-xs mr-1"
                            title={t("lastSolvesPreview.pbOldTitle")}
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
                                : ""
                          }
                        >
                          {formatSolveTime(s)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-gray-500">
                        {row.mo3 !== null ? formatTime(row.mo3) : "–"}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">
                        {row.ao5 !== null ? (
                          <span
                            className={
                              isAo5Pb ? "text-cyan-300" : "text-gray-500"
                            }
                          >
                            {isAo5Pb && (
                              <span
                                className="text-cyan-400 mr-1"
                                title={
                                  s.id === bestAo5SolveId
                                    ? t("lastSolvesPreview.ao5PbCurrentTitle")
                                    : t("lastSolvesPreview.ao5PbOldTitle")
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
                      <td className="py-1.5 pr-2 font-mono">
                        {row.ao12 !== null ? (
                          <span
                            className={
                              isAo12Pb ? "text-emerald-300" : "text-gray-500"
                            }
                          >
                            {isAo12Pb && (
                              <span
                                className="text-emerald-400 mr-1"
                                title={
                                  s.id === bestAo12SolveId
                                    ? t("lastSolvesPreview.ao12PbCurrentTitle")
                                    : t("lastSolvesPreview.ao12PbOldTitle")
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
                      {showAo100 && (
                        <td className="py-1.5 pr-2 font-mono text-gray-500">
                          {row.ao100 !== null ? formatTime(row.ao100) : "–"}
                        </td>
                      )}
                      <td className="py-1.5 pr-0 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                t("lastSolvesPreview.deleteRowConfirm", {
                                  time: formatSolveTime(s),
                                }),
                              )
                            )
                              del.mutate(s.id);
                          }}
                          className="text-xs rounded bg-gray-800 px-1.5 py-0.5 text-gray-500 hover:bg-red-700/40 hover:text-red-200"
                          title={t("lastSolvesPreview.deleteRowTitle")}
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
            {t("lastSolvesPreview.noSolves", { cube: cubeType })}
          </p>
        )}
        <p className="mt-2 text-[10px] text-gray-600">
          {t("lastSolvesPreview.sortHint")}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Sortable Table Header (kleiner Helper — nur für diese Komponente)
// ============================================================

function SortableHeader({
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
  /** Mobile-First: Spalte auf <md ausblenden (Sidebar ist eng auf Phone). */
  hideOnMobile?: boolean;
}) {
  const isActive = sortKey === activeKey;
  return (
    <th
      className={`py-1.5 pr-2 font-medium cursor-pointer select-none ${
        hideOnMobile ? "hidden md:table-cell" : ""
      } ${isActive ? "text-purple-300" : "hover:text-gray-300"}`}
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
//   pct < 0     → ▼ grün (besser als baseline)
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

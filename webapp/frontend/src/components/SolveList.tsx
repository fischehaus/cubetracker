// Liste der Solves als Tabelle, mit Filter (Cube-Type, Session, Limit) und
// Loeschen/Toggle-Buttons. Zeigt rollende ao5/ao12 unter jeder Zeit, sowie
// PB-Marker (Best-Solve goldfarben) basierend auf Stats-API.
//
// F7: Inline-Edit fuer Zeit + Notizen — click auf den Wert wechselt in
// Edit-Mode, Enter speichert, Esc bricht ab. Cube-Type bleibt
// read-only (Aenderungen seltener; ggf. spaeter via Edit-Dialog).

import { useMemo, useState } from "react";
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
import { rollingAverages, type SolvePoint } from "../lib/rolling";
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

// Auswahl-Optionen fuer den Limit-Selector. -1 steht fuer „alles".
const LIMIT_OPTIONS: { value: number; label: string }[] = [
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
  { value: -1, label: "Alle" },
];

// Notes-Edit raus aus der Tabelle — wird nur noch im Detail-Modal angezeigt.
// Nur Zeit-Inline-Edit bleibt in der Tabelle.
type EditingState = { solveId: number; field: "time" } | null;

export function SolveList({ sessionId, cubeFilter, onCubeFilterChange }: Props) {
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

  // Stats fuer denselben Filter — fuer Best-Marker brauchen wir nur die best_solve_id
  const statsParams: { cube_type?: string; session_id?: number } = {};
  if (cubeFilter) statsParams.cube_type = cubeFilter;
  if (sessionId !== null) statsParams.session_id = sessionId;
  const { data: stats } = useStats(statsParams);
  const bestSolveId = stats?.best_solve_id ?? null;

  const del = useDeleteSolve();
  const update = useUpdateSolve();

  // Hardware-Lookup: id → name, fuer Anzeige in der Cube-Spalte
  const { data: hardware } = useHardware();
  const hardwareById = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of hardware ?? []) m.set(h.id, h.name);
    return m;
  }, [hardware]);

  // Rolling ao5/ao12 berechnen — der API-Output ist DESC (neueste zuerst).
  // Fuer rollende Avgs brauchen wir chronologisch (alt → neu), also reversed.
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

  // Solvenummer-Berechnung: API liefert die letzten `limit` Solves in DESC.
  // Wir nehmen `stats.count` als Total + leiten die Nummer ab.
  // Wichtig: Solvenummer haengt am Solve, NICHT am Sortier-Index.
  // Sort-Reihenfolge aendert nur die UI-Reihenfolge, die Nummer bleibt.
  const sortedDisplay = useMemo(() => {
    if (!solves || solves.length === 0) return [];
    const totalCount = stats?.count ?? solves.length;
    const rows = solves.map((s, indexInDesc) => ({
      solve: s,
      solveNumber: totalCount - indexInDesc,
      time_ms: s.time_ms,
      dnf: s.dnf,
      plus_two: s.plus_two,
      ao5: ao5Map.get(s.id) ?? null,
      ao12: ao12Map.get(s.id) ?? null,
    }));
    return sortSolveRows(rows, sortKey, sortDir);
  }, [solves, stats?.count, ao5Map, ao12Map, sortKey, sortDir]);

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
      setEditError("Ungueltiges Zeit-Format");
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
        Solves werden geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!solves || solves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">Solves</h2>
        <p className="text-base text-gray-400">
          {cubeFilter
            ? `Keine Solves fuer "${cubeFilter}" vorhanden.`
            : "Noch keine Solves. Trag oben einen ein oder importier deine csTimer-Daten."}
        </p>
        {cubeFilter && (
          <button
            onClick={() => onCubeFilterChange("")}
            className="mt-3 text-base text-purple-400 hover:text-purple-300"
          >
            Filter zuruecksetzen
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
            Solves{" "}
            <span className="text-base text-gray-400">
              ({solves.length}
              {cubeFilter && ` · ${cubeFilter}`})
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Solve-Liste</p>
            <p>
              Alle deine Solves chronologisch (neueste oben). Klick auf
              Spaltenkopf #/Zeit/AO5/AO12 zum Sortieren. Klick auf Zeit
              oder Notiz bearbeitet inline. ℹ-Button pro Zeile zeigt
              Scramble + Hardware + Session-Details.
            </p>
          </InfoButton>
        </div>
        {/* Limit-Selektor bleibt list-spezifisch. Cube-Filter sitzt in
            der AnalyseFilterBar oben. */}
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
          title="Maximale Anzahl angezeigter Solves"
        >
          {LIMIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {editError && (
        <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {editError}
        </div>
      )}

      {/* Mobile-First: min-w auf der Tabelle damit overflow-x-auto wirklich
          scrollt statt die 4 Phone-Spalten zu quetschen. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-base">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
              <SortableTh
                label="#"
                sortKey="num"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label="Zeit"
                sortKey="time"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label="AO5"
                sortKey="ao5"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortableTh
                label="AO12"
                sortKey="ao12"
                activeKey={sortKey}
                dir={sortDir}
                onClick={handleSort}
                hideOnMobile
              />
              <th className="py-2.5 pr-3 font-medium hidden md:table-cell">
                Cube
              </th>
              <th className="py-2.5 pr-3 font-medium hidden md:table-cell">
                Hardware
              </th>
              <th className="py-2.5 pr-3 font-medium text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedDisplay.map((row) => {
              const s = row.solve;
              const isBest = s.id === bestSolveId;
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
                        title={`${formatDate(s.timestamp)} — Klick zum Bearbeiten`}
                        className="cursor-pointer"
                        onClick={() =>
                          startEdit(s.id, formatTime(s.time_ms))
                        }
                      >
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
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm text-gray-500 align-top">
                    {row.ao5 !== null ? formatTime(row.ao5) : "–"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-sm text-gray-500 align-top hidden md:table-cell">
                    {row.ao12 !== null ? formatTime(row.ao12) : "–"}
                  </td>
                  <td className="py-2 pr-3 text-gray-300 align-top hidden md:table-cell">
                    {s.cube_type}
                  </td>
                  <td
                    className="py-2 pr-3 text-sm text-gray-400 align-top hidden md:table-cell"
                    title={hardwareName ?? "Keine Hardware zugeordnet"}
                  >
                    {hardwareName ?? (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right space-x-2 align-top">
                    <button
                      onClick={() => setDetailSolve(s)}
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-purple-700/40 hover:text-purple-100"
                      title="Details anzeigen (Scramble, Notiz, Hardware, Session)"
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
                        title="+2-Strafe togglen"
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
                      title="DNF togglen"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Solve loeschen?")) del.mutate(s.id);
                      }}
                      className="text-sm rounded bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
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

      <p className="mt-3 text-xs text-gray-500">
        Tipp: Klick auf Spaltenkopf (#, Zeit, AO5, AO12) zum Sortieren ·
        Klick auf Zeit zum Bearbeiten · ℹ fuer Detail (Scramble, Notiz,
        Hardware, Session). Enter speichert, Esc bricht ab.
      </p>

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
  /** Mobile-First: Spalte auf <md ausblenden (Details ueber ℹ-Button). */
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

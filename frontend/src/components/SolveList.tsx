// Liste der Solves als Tabelle, mit Filter (Cube-Type, Session, Limit) und
// Loeschen/Toggle-Buttons. Zeigt rollende ao5/ao12 unter jeder Zeit, sowie
// PB-Marker (Best-Solve goldfarben) basierend auf Stats-API.
//
// F7: Inline-Edit fuer Zeit + Notizen — click auf den Wert wechselt in
// Edit-Mode, Enter speichert, Esc bricht ab. Cube-Type bleibt
// read-only (Aenderungen seltener; ggf. spaeter via Edit-Dialog).

import { useMemo, useState } from "react";
import { useDeleteSolve, useSolves, useStats, useUpdateSolve, type SolveListParams } from "../lib/api";
import {
  formatDate,
  formatSolveTime,
  formatTime,
  parseTimeInput,
} from "../lib/format";
import { rollingAverages, type SolvePoint } from "../lib/rolling";

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

type EditingState = { solveId: number; field: "time" | "notes" } | null;

export function SolveList({ sessionId, cubeFilter, onCubeFilterChange }: Props) {
  const [limit, setLimit] = useState<number>(100);
  const [editing, setEditing] = useState<EditingState>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);

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

  // F7: Edit-Mode starten — Initialwert in den Draft setzen.
  function startEdit(solveId: number, field: "time" | "notes", initial: string) {
    setEditing({ solveId, field });
    setDraftValue(initial);
    setEditError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraftValue("");
    setEditError(null);
  }

  // F7: Save — bei time wird parseTimeInput angewendet (akzeptiert
  // alle Formate inkl. csTimer-Stackmat). Notes wird trim'd; leer → null.
  function saveEdit() {
    if (!editing) return;
    if (editing.field === "time") {
      const ms = parseTimeInput(draftValue);
      if (ms === null) {
        setEditError("Ungueltiges Zeit-Format");
        return;
      }
      update.mutate(
        { id: editing.solveId, payload: { time_ms: ms } },
        { onSuccess: cancelEdit, onError: (e) => setEditError(e.message) }
      );
    } else {
      const trimmed = draftValue.trim();
      update.mutate(
        { id: editing.solveId, payload: { notes: trimmed || null } },
        { onSuccess: cancelEdit, onError: (e) => setEditError(e.message) }
      );
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400">
        Solves werden geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-5 text-red-300">
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!solves || solves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Solves</h2>
        <p className="text-gray-400">
          {cubeFilter
            ? `Keine Solves fuer "${cubeFilter}" vorhanden.`
            : "Noch keine Solves. Trag oben einen ein oder importier deine csTimer-Daten."}
        </p>
        {cubeFilter && (
          <button
            onClick={() => onCubeFilterChange("")}
            className="mt-3 text-sm text-purple-400 hover:text-purple-300"
          >
            Filter zuruecksetzen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-100">
          Solves{" "}
          <span className="text-sm text-gray-400">
            ({solves.length}
            {cubeFilter && ` · ${cubeFilter}`})
          </span>
        </h2>
        {/* Limit-Selektor bleibt list-spezifisch. Cube-Filter sitzt in
            der AnalyseFilterBar oben. */}
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2 pr-3 font-medium">Zeit</th>
              <th className="py-2 pr-3 font-medium">Cube</th>
              <th className="py-2 pr-3 font-medium">Notiz</th>
              <th className="py-2 pr-3 font-medium text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {solves.map((s) => {
              const isBest = s.id === bestSolveId;
              const ao5 = ao5Map.get(s.id) ?? null;
              const ao12 = ao12Map.get(s.id) ?? null;
              const isEditingTime =
                editing?.solveId === s.id && editing.field === "time";
              const isEditingNotes =
                editing?.solveId === s.id && editing.field === "notes";
              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    isBest ? "bg-yellow-500/5" : ""
                  }`}
                >
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
                          startEdit(s.id, "time", formatTime(s.time_ms))
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
                    {/* ao5/ao12 als kleine Sub-Zeile — wie csTimer-Liste */}
                    <div className="text-[10px] text-gray-500 mt-0.5 font-normal">
                      ao5 {ao5 !== null ? formatTime(ao5) : "–"} · ao12{" "}
                      {ao12 !== null ? formatTime(ao12) : "–"}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-gray-300 align-top">
                    {s.cube_type}
                  </td>
                  <td
                    className="py-2 pr-3 text-gray-400 text-xs max-w-xs align-top"
                    title={isEditingNotes ? "" : (s.notes ?? "Klick zum Bearbeiten")}
                  >
                    {isEditingNotes ? (
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
                        placeholder="Notiz …"
                        className="w-full rounded border border-purple-500 bg-gray-800 px-1 py-0.5 text-gray-100 text-xs focus:outline-none"
                      />
                    ) : (
                      <div
                        className="cursor-pointer truncate min-h-[1em]"
                        onClick={() => startEdit(s.id, "notes", s.notes ?? "")}
                      >
                        {s.notes ?? <span className="text-gray-600 italic">+ Notiz</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right space-x-2 align-top">
                    {!s.dnf && (
                      <button
                        onClick={() =>
                          update.mutate({
                            id: s.id,
                            payload: { plus_two: !s.plus_two },
                          })
                        }
                        className={`text-xs rounded px-2 py-1 ${
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
                      className={`text-xs rounded px-2 py-1 ${
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
                      className="text-xs rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
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

      <p className="mt-3 text-[10px] text-gray-500">
        Tipp: Klick auf Zeit oder Notiz zum Bearbeiten. Enter speichert,
        Esc bricht ab.
      </p>
    </div>
  );
}

// AlgTrainerPanel (Phase 8b) — PLL/OLL-Trainer im TrainerTab.
//
// Zwei-Spalten-Layout:
//   links:  Subset-Selector + Liste aller Cases mit per-case-Stats
//           (count, current_ao5, best). Klick auf Case → "in Drill".
//   rechts: Drill-Bereich (aktiver case): Scramble-Anzeige (= invers
//           des Algorithmus + random AUF), Algorithmus-Hilfe (collapsed),
//           Mini-Timer-Input, Save mit auto-tag alg_case.
//
// Auto-Next nach Save: gleicher Case bleibt aktiv, nur scramble-counter
// hochzaehlen → ScrambleCard regeneriert (klassisches Drill-Verhalten).

import { useMemo, useState } from "react";
import {
  useCreateSolve,
  useDeleteSolve,
  useSolves,
  useStatsByAlgCase,
  useUpdateSolve,
} from "../lib/api";
import {
  ALG_SUBSETS,
  type AlgCase,
  type AlgSubsetId,
  scrambleForCase,
} from "../lib/algs";
import { formatSolveTime, formatTime, parseTimeInput } from "../lib/format";
import type { Solve } from "../lib/types";

const SUBSETS: { id: AlgSubsetId; label: string }[] = [
  { id: "pll", label: "PLL (21)" },
  { id: "oll", label: "OLL (57)" },
];

export function AlgTrainerPanel() {
  const [subset, setSubset] = useState<AlgSubsetId>("pll");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const subsetData = ALG_SUBSETS[subset];
  const subsetPrefix = subset.toUpperCase();
  const stats = useStatsByAlgCase(subsetPrefix);

  // Stats-Lookup pro case_id
  const statsMap = useMemo(() => {
    const m = new Map<string, (typeof stats.data extends undefined ? never : NonNullable<typeof stats.data>["cases"][number])>();
    stats.data?.cases.forEach((c) => m.set(c.alg_case, c));
    return m;
  }, [stats.data]);

  const activeCase = activeCaseId
    ? subsetData.cases.find((c) => c.id === activeCaseId)
    : null;

  function pickCase(id: string) {
    setActiveCaseId(id === activeCaseId ? null : id);
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-100">
          Algorithm-Trainer
        </h2>
        <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1">
          {SUBSETS.map((s) => {
            const active = subset === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSubset(s.id);
                  setActiveCaseId(null);
                }}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">{subsetData.name}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Cases-Liste */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {subsetData.cases.map((c) => {
              const s = statsMap.get(c.id);
              const isActive = c.id === activeCaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => pickCase(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`text-left rounded border p-2 transition ${
                    isActive
                      ? "border-purple-500 bg-purple-500/10"
                      : s
                      ? "border-gray-700 bg-gray-900/40 hover:border-gray-600"
                      : "border-gray-800 bg-gray-900/20 hover:border-gray-700"
                  }`}
                  title={c.alg}
                >
                  <div
                    className={`text-sm font-semibold ${
                      isActive ? "text-purple-100" : "text-gray-200"
                    }`}
                  >
                    {c.name}
                  </div>
                  {s ? (
                    <div className="text-xs text-gray-400 mt-0.5 font-mono">
                      ao5 {s.current_ao5 !== null ? formatTime(s.current_ao5) : "—"}
                      {" · "}
                      best {s.best_ms !== null ? formatTime(s.best_ms) : "—"}
                      {" · "}
                      {s.count}×
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 mt-0.5">
                      noch nie geuebt
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drill-Bereich */}
        <aside>
          {activeCase ? (
            <DrillCard
              caseDef={activeCase}
              onSaved={() => stats.refetch()}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-6 text-center text-gray-500 text-sm">
              Klicke einen Case links, um ihn zu drillen.
            </div>
          )}
        </aside>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Sortierung: schwaechster aktueller ao5 zuerst — wo du zuerst
        trainieren solltest. Cases ohne Daten am Ende.
        Jeder Drill-Solve wird automatisch mit `alg_case` getaggt
        (Cube-Type bleibt 3x3).
      </p>
    </div>
  );
}

// ============================================================
// DrillCard — der „kleine Timer" fuer einen einzelnen case
// ============================================================

function DrillCard({
  caseDef,
  onSaved,
}: {
  caseDef: AlgCase;
  onSaved: () => void;
}) {
  const [scrambleSeed, setScrambleSeed] = useState(0);
  const [showAlg, setShowAlg] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateSolve();

  // scramble wird hier per-render neu erzeugt sobald sich case oder
  // seed aendert — useMemo macht das preisgunstig + deterministisch
  // im selben render.
  const scramble = useMemo(
    () => scrambleForCase(caseDef, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseDef.id, scrambleSeed]
  );

  function save() {
    setError(null);
    const time_ms = parseTimeInput(timeStr);
    if (time_ms === null) {
      setError("Ungueltige Zeit");
      return;
    }
    create.mutate(
      {
        time_ms,
        cube_type: "3x3",
        scramble,
        alg_case: caseDef.id,
      },
      {
        onSuccess: () => {
          setTimeStr("");
          setScrambleSeed((s) => s + 1);
          onSaved();
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      }
    );
  }

  return (
    <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-5">
      <div className="text-xs text-purple-300 uppercase tracking-wide mb-1">
        Drill
      </div>
      <div className="text-lg font-semibold text-purple-100 mb-3">
        {caseDef.name}
      </div>

      <div className="rounded border border-gray-700 bg-gray-900/50 p-3 mb-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Scramble
        </div>
        <div className="font-mono text-sm text-gray-100 break-words leading-relaxed select-all">
          {scramble}
        </div>
      </div>

      <button
        onClick={() => setShowAlg((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-200 mb-3"
      >
        {showAlg ? "▼ Algorithmus verbergen" : "▶ Algorithmus zeigen"}
      </button>
      {showAlg && (
        <div className="rounded border border-gray-700 bg-gray-900/30 p-2 mb-3 font-mono text-xs text-gray-300 break-words">
          {caseDef.alg}
        </div>
      )}

      <input
        type="text"
        inputMode="decimal"
        value={timeStr}
        onChange={(e) => {
          setTimeStr(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        placeholder="0.00"
        autoFocus
        className="w-full text-center font-mono bg-transparent border-0 border-b-2 border-gray-700 focus:border-purple-500 focus:outline-none text-gray-100 py-2 text-2xl"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setScrambleSeed((s) => s + 1)}
          className="flex-1 text-sm rounded border border-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-800"
          title="Neuen Scramble fuer denselben Case generieren"
        >
          ⏭ Skip
        </button>
        <button
          onClick={save}
          disabled={create.isPending}
          className="flex-1 text-sm rounded bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {create.isPending ? "…" : "Speichern (Enter)"}
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs text-red-300 text-center">
          {error}
        </div>
      )}

      {/* Phase 8.1: Liste der letzten Drill-Solves dieses Cases */}
      <DrillSolveList caseId={caseDef.id} />
    </div>
  );
}

// ============================================================
// DrillSolveList — letzte N Solves dieses cases mit +2/DNF/Loeschen
// ============================================================

function DrillSolveList({ caseId }: { caseId: string }) {
  const { data: solves, isLoading } = useSolves({ alg_case: caseId, limit: 20 });
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  if (isLoading) return null;
  if (!solves || solves.length === 0) {
    return (
      <div className="mt-4 text-xs text-gray-500 text-center">
        Noch keine Drill-Solves fuer diesen Case.
      </div>
    );
  }

  function togglePlusTwo(s: Solve) {
    update.mutate({ id: s.id, payload: { plus_two: !s.plus_two, dnf: false } });
  }
  function toggleDnf(s: Solve) {
    update.mutate({ id: s.id, payload: { dnf: !s.dnf } });
  }
  function remove(id: number) {
    if (confirm(`Solve #${id} wirklich loeschen?`)) del.mutate(id);
  }

  return (
    <div className="mt-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
        Letzte {solves.length} Solves
      </div>
      <ul className="space-y-1 max-h-72 overflow-y-auto">
        {solves.map((s) => (
          <li
            key={s.id}
            className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
              s.dnf ? "bg-red-500/10" : "bg-gray-900/40"
            }`}
          >
            <span
              className={`font-mono flex-1 ${
                s.dnf ? "text-red-300 line-through" : "text-gray-100"
              }`}
            >
              {formatSolveTime(s)}
            </span>
            <button
              onClick={() => togglePlusTwo(s)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                s.plus_two
                  ? "bg-amber-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:text-gray-200"
              }`}
              disabled={s.dnf}
              title="+2 Strafe togglen"
            >
              +2
            </button>
            <button
              onClick={() => toggleDnf(s)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                s.dnf
                  ? "bg-red-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:text-gray-200"
              }`}
              title="DNF togglen"
            >
              DNF
            </button>
            <button
              onClick={() => remove(s.id)}
              className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-red-700/50 hover:text-red-200"
              title="Solve loeschen"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

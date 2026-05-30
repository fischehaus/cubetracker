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
// hochzählen → ScrambleCard regeneriert (klassisches Drill-Verhalten).

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { TIMER_FONT_SCALE, useAppSettings } from "../lib/settings";
import { InfoButton } from "./InfoButton";
import { Card, CardTitle, Button } from "./ui";
import type { Solve } from "../lib/types";
import { CubeStateView } from "./CubeStateView";
import { SpacebarTimerCard } from "./SpacebarTimerCard";
import type { TimerPenalty } from "../hooks/useSpacebarTimer";

const SUBSETS: { id: AlgSubsetId; label: string }[] = [
  { id: "pll", label: "PLL (21)" },
  { id: "oll", label: "OLL (57)" },
];

export function AlgTrainerPanel() {
  const { t } = useTranslation();
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
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CardTitle>{t("algTrainer.title")}</CardTitle>
          <InfoButton>
            <p className="font-medium mb-1">{t("algTrainer.title")}</p>
            <p>{t("algTrainer.infoBody")}</p>
          </InfoButton>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6">
        {/* Cases-Liste — User-Wunsch: max 2 Spalten */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subsetData.cases.map((c) => {
              const s = statsMap.get(c.id);
              const isActive = c.id === activeCaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => pickCase(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`text-left rounded border p-2 transition flex gap-2 items-center ${
                    isActive
                      ? "border-purple-500 bg-purple-500/10"
                      : s
                      ? "border-gray-700 bg-gray-900/40 hover:border-gray-600"
                      : "border-gray-800 bg-gray-900/20 hover:border-gray-700"
                  }`}
                  title={c.alg}
                >
                  <CubeStateView caseId={c.id} size="small" />
                  <div className="flex-1 min-w-0">
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
                      {t("algTrainer.caseNeverPracticed")}
                    </div>
                  )}
                  </div>
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
              {t("algTrainer.emptyState")}
            </div>
          )}
        </aside>
      </div>

      <p className="mt-4 text-xs text-gray-500">{t("algTrainer.footer")}</p>
    </Card>
  );
}

// ============================================================
// DrillCard — der „kleine Timer" für einen einzelnen case
// ============================================================

function DrillCard({
  caseDef,
  onSaved,
}: {
  caseDef: AlgCase;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [scrambleSeed, setScrambleSeed] = useState(0);
  const [showAlg, setShowAlg] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateSolve();
  // Phase 8.2: Spacebar-Modus aktiv?
  const [settings] = useAppSettings();
  const [spacebarResetSeed, setSpacebarResetSeed] = useState(0);

  function saveFromSpacebar(
    finalMs: number,
    penalty: TimerPenalty,
    splitTimesMs: number[] | null,
  ) {
    setError(null);
    create.mutate(
      {
        time_ms: finalMs,
        cube_type: "3x3",
        scramble,
        alg_case: caseDef.id,
        plus_two: penalty === "+2",
        dnf: penalty === "DNF",
        split_times_ms:
          splitTimesMs && splitTimesMs.length > 0 ? JSON.stringify(splitTimesMs) : null,
      },
      {
        onSuccess: () => {
          setSpacebarResetSeed((s) => s + 1);
          setScrambleSeed((s) => s + 1);
          onSaved();
        },
        onError: (e) => setError(`${t("drillCard.errorPrefix")}${e.message}`),
      },
    );
  }

  // scramble wird hier per-render neu erzeugt sobald sich case oder
  // seed ändert — useMemo macht das preisgunstig + deterministisch
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
      setError(t("drillCard.errorInvalid"));
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
        onError: (e) => setError(`${t("drillCard.errorPrefix")}${e.message}`),
      }
    );
  }

  return (
    <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-5">
      <div className="text-xs text-purple-300 uppercase tracking-wide mb-1">
        {t("drillCard.label")}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <CubeStateView caseId={caseDef.id} size="large" />
        <div className="text-lg font-semibold text-purple-100">
          {caseDef.name}
        </div>
      </div>

      <div className="rounded border border-gray-700 bg-gray-900/50 p-3 mb-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {t("drillCard.scrambleLabel")}
        </div>
        <div
          className="font-mono text-gray-100 break-words leading-relaxed select-all"
          style={{ fontSize: TIMER_FONT_SCALE[settings.drill_font_size].scramble }}
        >
          {scramble}
        </div>
      </div>

      <button
        onClick={() => setShowAlg((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-200 mb-3"
      >
        {showAlg ? t("drillCard.hideAlg") : t("drillCard.showAlg")}
      </button>
      {showAlg && (
        <div
          className="rounded border border-gray-700 bg-gray-900/30 p-2 mb-3 font-mono text-gray-300 break-words"
          style={{ fontSize: TIMER_FONT_SCALE[settings.drill_font_size].scramble }}
        >
          {caseDef.alg}
        </div>
      )}

      {settings.spacebar_enabled ? (
        <SpacebarTimerCard
          enabled={true}
          settings={settings}
          phaseNames={settings.phase_names}
          onSave={saveFromSpacebar}
          resetSeed={spacebarResetSeed}
          fontSizeOverride={settings.drill_font_size}
        />
      ) : (
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
          className="w-full text-center font-mono bg-transparent border-0 border-b-2 border-gray-700 focus:border-purple-500 focus:outline-none text-gray-100 py-2"
          style={{
            fontSize: TIMER_FONT_SCALE[settings.drill_font_size].timer,
            lineHeight: 1,
          }}
        />
      )}

      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setScrambleSeed((s) => s + 1)}
          className="flex-1"
          title={t("drillCard.skipButtonTitle")}
        >
          {t("drillCard.skipButton")}
        </Button>
        <Button
          variant="primary"
          onClick={save}
          disabled={create.isPending}
          className="flex-1"
        >
          {create.isPending
            ? t("drillCard.saveBusy")
            : t("drillCard.saveButton")}
        </Button>
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
// DrillSolveList — letzte N Solves dieses cases mit +2/DNF/Löschen
// ============================================================

function DrillSolveList({ caseId }: { caseId: string }) {
  const { t } = useTranslation();
  const { data: solves, isLoading } = useSolves({ alg_case: caseId, limit: 20 });
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  if (isLoading) return null;
  if (!solves || solves.length === 0) {
    return (
      <div className="mt-4 text-xs text-gray-500 text-center">
        {t("drillSolves.empty")}
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
    if (confirm(t("drillSolves.deleteConfirm", { id }))) del.mutate(id);
  }

  return (
    <div className="mt-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
        {t("drillSolves.lastN", { count: solves.length })}
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
              title={t("drillSolves.plusTwoTitle")}
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
              title={t("drillSolves.dnfTitle")}
            >
              DNF
            </button>
            <button
              onClick={() => remove(s.id)}
              className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-red-700/50 hover:text-red-200"
              title={t("drillSolves.deleteTitle")}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

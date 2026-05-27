// SessionPlanCard (Phase 8.4) — Trainings-Set-Counter im TIMER.
//
// Konzept: ein Trainings-Set ist eine UI-Layer auf den Solves —
// keine DB-Änderung. User klickt "Set starten", wählt Anzahl
// Solves (Plan), macht die Solves, am Ende kommt End-Feedback.
//
// State liegt im Component (kein localStorage), weil ein Reload
// das Set bewusst beendet — nicht persistent.
//
// Logik:
//   - Beim Start: aktueller Solve-Count notieren als baseline
//   - Solves-Hook (live) zeigt total-Count im Filter (cube_type + session_id)
//   - Set-progress = total_count - baseline
//   - Wenn progress >= plan_count → Auto-End (oder User klickt "Beenden")
//   - End-Feedback-Modal: Stats der Set-Solves berechnen (mean/best/ao5/ao12)

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSolves } from "../lib/api";
import { formatTime } from "../lib/format";
import type { Solve } from "../lib/types";
import { InfoButton } from "./InfoButton";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

interface ActiveSet {
  /** Solve-IDs vor Set-Start (sodass wir später den Set isolieren) */
  baselineSolveIds: Set<number>;
  /** Geplante Anzahl Solves (oder null = open-ended) */
  planCount: number | null;
  /** Wann gestartet (für Display) */
  startedAt: number;
}

const PLAN_PRESETS = [5, 12, 25, 50, 100];

export function SessionPlanCard({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);
  const [showEndFeedback, setShowEndFeedback] = useState<Solve[] | null>(null);
  const [planInput, setPlanInput] = useState<number | null>(12);

  // Live solves im aktuellen Filter — wir verwenden das für counter
  const { data: solves } = useSolves({
    cube_type: cubeType,
    session_id: sessionId === null ? undefined : sessionId,
    limit: 200,
  });

  // Set-Solves = die solves die NACH baseline gemacht wurden
  const setSolves: Solve[] = useMemo(() => {
    if (!activeSet || !solves) return [];
    return solves.filter((s) => !activeSet.baselineSolveIds.has(s.id));
  }, [solves, activeSet]);

  const progress = setSolves.length;
  const planCount = activeSet?.planCount ?? null;
  const isComplete = planCount !== null && progress >= planCount;

  function startSet() {
    const baseline = new Set((solves ?? []).map((s) => s.id));
    setActiveSet({
      baselineSolveIds: baseline,
      planCount: planInput,
      startedAt: Date.now(),
    });
  }

  function endSet() {
    if (setSolves.length > 0) {
      setShowEndFeedback(setSolves);
    }
    setActiveSet(null);
  }

  if (showEndFeedback) {
    return (
      <SessionEndFeedback
        solves={showEndFeedback}
        onClose={() => setShowEndFeedback(null)}
      />
    );
  }

  if (!activeSet) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm uppercase tracking-wide text-gray-500">
                {t("trainingSet.headerLabel")}
              </span>
              <InfoButton>
                <p className="font-medium mb-1">{t("trainingSet.infoTitle")}</p>
                <p>{t("trainingSet.infoBody")}</p>
              </InfoButton>
            </div>
            <div className="text-base text-gray-300 mt-0.5">
              {t("trainingSet.intro")}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">
              {t("trainingSet.planLabel")}
            </span>
            <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1">
              {PLAN_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPlanInput(n)}
                  className={`rounded px-2 py-1 text-sm transition ${
                    planInput === n
                      ? "bg-purple-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPlanInput(null)}
                className={`rounded px-2 py-1 text-sm transition ${
                  planInput === null
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                title={t("trainingSet.openEndedTitle")}
              >
                ∞
              </button>
            </div>
            <button
              onClick={startSet}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              {t("trainingSet.startButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pct =
    planCount !== null && planCount > 0
      ? Math.min(100, (progress / planCount) * 100)
      : 0;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isComplete
          ? "border-emerald-500/60 bg-emerald-500/10"
          : "border-purple-500/60 bg-purple-500/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm uppercase tracking-wide text-purple-300">
            {t("trainingSet.runningLabel")}
          </span>
          <span
            className={`text-2xl font-mono font-bold ${
              isComplete ? "text-emerald-200" : "text-purple-100"
            }`}
          >
            {progress}
            {planCount !== null && (
              <span className="text-gray-400"> / {planCount}</span>
            )}
          </span>
          {isComplete && (
            <span className="text-emerald-300 font-medium">
              {t("trainingSet.fulfilled")}
            </span>
          )}
        </div>
        <button
          onClick={endSet}
          className={`rounded px-4 py-2 text-sm font-medium ${
            isComplete
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          }`}
        >
          {isComplete
            ? t("trainingSet.showResults")
            : t("trainingSet.endSet")}
        </button>
      </div>

      {planCount !== null && (
        <div className="mt-3 h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isComplete ? "bg-emerald-400" : "bg-purple-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SessionEndFeedback — modaler Banner mit Set-Stats
// ============================================================

function SessionEndFeedback({
  solves,
  onClose,
}: {
  solves: Solve[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => computeSetStats(solves, t), [solves, t]);

  return (
    <div className="rounded-lg border-2 border-emerald-500 bg-emerald-500/10 p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold text-emerald-100">
          {t("trainingSet.completedTitle")}
        </h2>
        <button
          onClick={onClose}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-600"
        >
          {t("trainingSet.close")}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBlock label={t("trainingSet.statSolves")} value={stats.count} />
        <StatBlock
          label={t("trainingSet.statValidDnf")}
          value={`${stats.countValid} / ${stats.countDnf}`}
        />
        <StatBlock
          label={t("trainingSet.statBest")}
          value={stats.best === null ? "–" : formatTime(stats.best)}
        />
        <StatBlock
          label={t("trainingSet.statMean")}
          value={stats.mean === null ? "–" : formatTime(stats.mean)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatBlock
          label={t("trainingSet.statSetAo5")}
          value={stats.ao5 === null ? "–" : formatTime(stats.ao5)}
        />
        <StatBlock
          label={t("trainingSet.statSetAo12")}
          value={stats.ao12 === null ? "–" : formatTime(stats.ao12)}
        />
        <StatBlock
          label={t("trainingSet.statWorst")}
          value={stats.worst === null ? "–" : formatTime(stats.worst)}
        />
      </div>

      <div className="text-sm text-emerald-200">
        {stats.feedback}
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-gray-900/40 px-3 py-2">
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-mono text-gray-100 mt-0.5">{value}</div>
    </div>
  );
}

// ============================================================
// Pure Set-Stats helper
// ============================================================

interface SetStats {
  count: number;
  countValid: number;
  countDnf: number;
  best: number | null;
  worst: number | null;
  mean: number | null;
  ao5: number | null;
  ao12: number | null;
  feedback: string;
}

function computeSetStats(
  solves: Solve[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): SetStats {
  // SolveList ist neueste-zuerst — wir wollen die in chronologischer Order
  const chrono = [...solves].reverse();
  const valid = chrono.filter((s) => !s.dnf);
  const eff = (s: Solve): number => s.time_ms + (s.plus_two ? 2000 : 0);

  const best = valid.length > 0 ? Math.min(...valid.map(eff)) : null;
  const worst = valid.length > 0 ? Math.max(...valid.map(eff)) : null;
  const mean = valid.length > 0
    ? Math.round(valid.reduce((acc, s) => acc + eff(s), 0) / valid.length)
    : null;

  // WCA-trim avg für 5/12 (trim 1 each side)
  function trimmedAvg(times: number[], window: number): number | null {
    if (times.length < window) return null;
    const sub = times.slice(-window);
    if (sub.some((tt) => tt === Infinity)) return null;
    const sorted = [...sub].sort((a, b) => a - b);
    const trim = window <= 12 ? 1 : Math.max(1, Math.floor(window * 0.05));
    const middle = sorted.slice(trim, sorted.length - trim);
    return Math.round(middle.reduce((acc, tt) => acc + tt, 0) / middle.length);
  }
  const allTimes = chrono.map((s) => (s.dnf ? Infinity : eff(s)));
  const ao5 = trimmedAvg(allTimes, 5);
  const ao12 = trimmedAvg(allTimes, 12);

  // Sehr einfaches Feedback nach Best/Mean-Verhältnis und DNF-Quote
  let feedback = "";
  if (chrono.length === 0) {
    feedback = t("trainingSet.feedbackEmpty");
  } else if (chrono.length < 5) {
    feedback = t("trainingSet.feedbackShort", { count: chrono.length });
  } else {
    const dnfRate = solves.length > 0 ? (chrono.length - valid.length) / chrono.length : 0;
    if (dnfRate > 0.2) {
      feedback = t("trainingSet.feedbackHighDnf", {
        pct: Math.round(dnfRate * 100),
      });
    } else if (best !== null && mean !== null && mean > best * 1.4) {
      feedback = t("trainingSet.feedbackInconsistent");
    } else if (best !== null && mean !== null && mean < best * 1.15) {
      feedback = t("trainingSet.feedbackConsistent");
    } else {
      feedback = t("trainingSet.feedbackSolid");
    }
  }

  return {
    count: chrono.length,
    countValid: valid.length,
    countDnf: chrono.length - valid.length,
    best,
    worst,
    mean,
    ao5,
    ao12,
    feedback,
  };
}

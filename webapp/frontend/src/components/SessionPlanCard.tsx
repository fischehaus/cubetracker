// SessionPlanCard (Phase 8.4) — Trainings-Set-Counter im TIMER.
//
// Konzept: ein Trainings-Set ist eine UI-Layer auf den Solves —
// keine DB-Aenderung. User klickt "Set starten", waehlt Anzahl
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
  /** Wann gestartet (fuer Display) */
  startedAt: number;
}

const PLAN_PRESETS = [5, 12, 25, 50, 100];

export function SessionPlanCard({ cubeType, sessionId }: Props) {
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);
  const [showEndFeedback, setShowEndFeedback] = useState<Solve[] | null>(null);
  const [planInput, setPlanInput] = useState<number | null>(12);

  // Live solves im aktuellen Filter — wir verwenden das fuer counter
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
                Trainings-Set
              </span>
              <InfoButton>
                <p className="font-medium mb-1">Trainings-Set</p>
                <p>
                  Setze dir eine feste Anzahl Solves als Ziel (z.B. 12 oder
                  50). Waehrend du solvest, zaehlt das Set runter und zeigt
                  Live-Stats. Am Ende kriegst du eine Zusammenfassung: Best,
                  Worst, AO5, AO12, AO100, plus DNF/+2-Statistik. Praktisch
                  fuer fokussiertes Training mit klarem Stoppzeitpunkt.
                </p>
              </InfoButton>
            </div>
            <div className="text-base text-gray-300 mt-0.5">
              Plane eine feste Anzahl Solves und bekomme am Ende eine
              Zusammenfassung.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Plan:</span>
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
                title="Open-end: kein Plan, du beendest manuell"
              >
                ∞
              </button>
            </div>
            <button
              onClick={startSet}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              ▶ Set starten
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
            Set laeuft
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
            <span className="text-emerald-300 font-medium">✓ erfuellt</span>
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
          {isComplete ? "🏁 Auswertung anzeigen" : "Set beenden"}
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
  const stats = useMemo(() => computeSetStats(solves), [solves]);

  return (
    <div className="rounded-lg border-2 border-emerald-500 bg-emerald-500/10 p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold text-emerald-100">
          🏁 Set abgeschlossen
        </h2>
        <button
          onClick={onClose}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-600"
        >
          Schliessen
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBlock label="Solves" value={stats.count} />
        <StatBlock label="Valid / DNF" value={`${stats.countValid} / ${stats.countDnf}`} />
        <StatBlock label="Best" value={stats.best === null ? "–" : formatTime(stats.best)} />
        <StatBlock label="Mean" value={stats.mean === null ? "–" : formatTime(stats.mean)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatBlock label="Set-Ao5" value={stats.ao5 === null ? "–" : formatTime(stats.ao5)} />
        <StatBlock label="Set-Ao12" value={stats.ao12 === null ? "–" : formatTime(stats.ao12)} />
        <StatBlock label="Worst" value={stats.worst === null ? "–" : formatTime(stats.worst)} />
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

function computeSetStats(solves: Solve[]): SetStats {
  // SolveList ist neueste-zuerst — wir wollen die in chronologischer Order
  const chrono = [...solves].reverse();
  const valid = chrono.filter((s) => !s.dnf);
  const eff = (s: Solve): number => s.time_ms + (s.plus_two ? 2000 : 0);

  const best = valid.length > 0 ? Math.min(...valid.map(eff)) : null;
  const worst = valid.length > 0 ? Math.max(...valid.map(eff)) : null;
  const mean = valid.length > 0
    ? Math.round(valid.reduce((acc, s) => acc + eff(s), 0) / valid.length)
    : null;

  // WCA-trim avg fuer 5/12 (trim 1 each side)
  function trimmedAvg(times: number[], window: number): number | null {
    if (times.length < window) return null;
    const sub = times.slice(-window);
    if (sub.some((t) => t === Infinity)) return null;
    const sorted = [...sub].sort((a, b) => a - b);
    const trim = window <= 12 ? 1 : Math.max(1, Math.floor(window * 0.05));
    const middle = sorted.slice(trim, sorted.length - trim);
    return Math.round(middle.reduce((acc, t) => acc + t, 0) / middle.length);
  }
  const allTimes = chrono.map((s) => (s.dnf ? Infinity : eff(s)));
  const ao5 = trimmedAvg(allTimes, 5);
  const ao12 = trimmedAvg(allTimes, 12);

  // Sehr einfaches Feedback nach Best/Mean-Verhältnis und DNF-Quote
  let feedback = "";
  if (chrono.length === 0) {
    feedback = "Keine Solves im Set — beim naechsten Mal mehr durchziehen!";
  } else if (chrono.length < 5) {
    feedback = `Kurzes Set mit ${chrono.length} Solves — fuer Stats waeren mind. 5 sinnvoll.`;
  } else {
    const dnfRate = solves.length > 0 ? (chrono.length - valid.length) / chrono.length : 0;
    if (dnfRate > 0.2) {
      feedback = `Hohe DNF-Quote (${Math.round(dnfRate * 100)}%) — vielleicht zu schnell? Konzentration vor Speed.`;
    } else if (best !== null && mean !== null && mean > best * 1.4) {
      feedback = "Inkonsistente Zeiten — Range zwischen Best und Mean ist gross. Fokus auf Konsistenz.";
    } else if (best !== null && mean !== null && mean < best * 1.15) {
      feedback = "Sehr konsistentes Set — saubere Arbeit!";
    } else {
      feedback = "Solides Set. Weiter so!";
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

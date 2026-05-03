// SpacebarTimerCard (Phase 8.2) — visuelle Wrappung des
// useSpacebarTimer-Hooks. Wird vom TIMER-Tab und vom DrillCard
// (Algs-Trainer) benutzt.
//
// State-Mapping zu Visual:
//   idle       → grau, "0.00", Hint „Space halten zum starten"
//   inspection → blau, countdown gross + Phase-Hinweis bei Sound-Threshold
//   ready      → gelb, „loslassen wenn bereit"
//   running    → gruen, live-tickender Timer + Phase X/N
//   stopped    → weiss, end-time + Splits-Liste + ggf. Penalty-Badge
//
// Layout: zentrierter Karten-Block mit grossem Timer und farb-Status.

import { useEffect } from "react";
import { formatTime } from "../lib/format";
import type { AppSettings } from "../lib/settings";
import {
  useSpacebarTimer,
  type TimerPenalty,
  type TimerState,
} from "../hooks/useSpacebarTimer";

interface Props {
  enabled: boolean;
  settings: AppSettings;
  /** Phasen-Namen (aus Settings) — Anzeige neben aktiver Phase */
  phaseNames: string[];
  /**
   * Save-Callback — wird vom Hook nach „stopped" einmal aufgerufen.
   * Caller persistiert via API.
   */
  onSave: (
    finalMs: number,
    penalty: TimerPenalty,
    splitTimesMs: number[] | null,
  ) => void;
  /**
   * Wird nach erfolgreichem Save vom Caller getriggered, damit der
   * Timer wieder zu „idle" geht. Convention: caller setzt resetSeed
   * counter hoch.
   */
  resetSeed: number;
}

export function SpacebarTimerCard({
  enabled,
  settings,
  phaseNames,
  onSave,
  resetSeed,
}: Props) {
  const timer = useSpacebarTimer({
    enabled,
    settings,
    onComplete: onSave,
  });

  // Reset wenn Parent den seed bumpt (z.B. nach erfolgreichem Save)
  useEffect(() => {
    timer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSeed]);

  const totalPhases = settings.splits_enabled
    ? Math.max(1, phaseNames.length)
    : 1;

  return (
    <div className={cardClass(timer.state)}>
      {/* Top: state-Hint + ggf. phase indicator */}
      <div className="flex items-center justify-between mb-2 gap-2 text-sm">
        <div className={hintClass(timer.state)}>
          {hintLabel(timer.state, settings.inspection_enabled)}
        </div>
        {settings.splits_enabled && timer.state === "running" && totalPhases > 1 && (
          <div className="text-purple-200 font-medium">
            Phase {timer.phaseIndex + 1} / {totalPhases}
            {phaseNames[timer.phaseIndex] && (
              <span className="ml-2 text-purple-100">{phaseNames[timer.phaseIndex]}</span>
            )}
          </div>
        )}
        {timer.penalty !== "none" && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              timer.penalty === "DNF"
                ? "bg-red-600 text-white"
                : "bg-amber-600 text-white"
            }`}
            title="Inspection ueberschritten"
          >
            {timer.penalty}
          </span>
        )}
      </div>

      {/* Mitte: grosser Timer */}
      <div
        className={`text-center font-mono ${timerColorClass(timer.state)}`}
        style={{ fontSize: "5rem", lineHeight: 1, padding: "1rem 0" }}
        aria-live="polite"
      >
        {timer.state === "inspection" ? (
          <>{Math.ceil(timer.inspectionLeftMs / 1000)}</>
        ) : (
          <>{formatTime(timer.displayMs)}</>
        )}
      </div>

      {/* Unten: splits-Liste oder Hint */}
      {timer.splits.length > 0 && timer.state === "running" && (
        <div className="mt-2 text-center text-sm font-mono text-gray-300">
          {timer.splits.map((s, i) => (
            <span key={i} className="mx-1">
              {phaseNames[i] ?? `P${i + 1}`}: {formatTime(i === 0 ? s : s - timer.splits[i - 1])}
            </span>
          ))}
        </div>
      )}
      {timer.state === "stopped" && timer.splits.length > 0 && (
        <div className="mt-2 text-center text-sm font-mono text-gray-300 space-x-3">
          {timer.splits.map((s, i) => (
            <span key={i}>
              {phaseNames[i] ?? `P${i + 1}`}: {formatTime(i === 0 ? s : s - timer.splits[i - 1])}
            </span>
          ))}
          <span className="text-emerald-300">
            {phaseNames[timer.splits.length] ?? `P${timer.splits.length + 1}`}:{" "}
            {formatTime(
              timer.displayMs - (timer.splits[timer.splits.length - 1] ?? 0),
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Visual helpers — color coding by state
// ============================================================

function cardClass(state: TimerState): string {
  const base = "rounded-lg border p-6 transition-colors";
  switch (state) {
    case "ready":
      return `${base} border-amber-500/60 bg-amber-500/10`;
    case "running":
      return `${base} border-emerald-500/60 bg-emerald-500/10`;
    case "inspection":
      return `${base} border-blue-500/60 bg-blue-500/10`;
    case "stopped":
      return `${base} border-gray-500/60 bg-gray-500/10`;
    default:
      return `${base} border-gray-700 bg-gray-900/50`;
  }
}

function timerColorClass(state: TimerState): string {
  switch (state) {
    case "ready":
      return "text-amber-200";
    case "running":
      return "text-emerald-200";
    case "inspection":
      return "text-blue-200";
    case "stopped":
      return "text-gray-100";
    default:
      return "text-gray-300";
  }
}

function hintClass(state: TimerState): string {
  switch (state) {
    case "ready":
      return "text-amber-300";
    case "running":
      return "text-emerald-300";
    case "inspection":
      return "text-blue-300";
    case "stopped":
      return "text-gray-400";
    default:
      return "text-gray-500";
  }
}

function hintLabel(state: TimerState, inspectionEnabled: boolean): string {
  switch (state) {
    case "idle":
      return inspectionEnabled
        ? "Space druecken fuer Inspektion"
        : "Space halten und loslassen zum Starten";
    case "inspection":
      return "Space = Solve starten · Double-Tap = Inspektion neu · 0 = DNF";
    case "ready":
      return "Loslassen wenn bereit";
    case "running":
      return "Space druecken zum Stoppen";
    case "stopped":
      return "Solve gespeichert · Space fuer naechsten";
    default:
      return "";
  }
}

// SmartCubeSolveControls — die solve-zeitliche Steuerung des GAN-Smart-Cube
// im TIMER-Tab (W.hardware-in-einstellungen, 2026-06-20).
//
// Seit dem Hardware-Umzug lebt die VERBINDUNG des Smart-Cube in den
// Einstellungen (SmartCubeConnect). Die Aktionen, die man WÄHREND des Solvens
// braucht — „Bereit für Solve" / „Solve fertig" + Live-Status — bleiben hier im
// Timer-Tab (User-Entscheidung 2026-06-20: Solve-Steuerung darf nicht in die
// Einstellungen wandern). Liest den Singleton-Store; rendert nichts, solange
// kein Cube verbunden ist (kein Clutter für Nutzer ohne Smart-Cube).

import { useTranslation } from "react-i18next";
import * as smartCubeStore from "../lib/smartCubeStore";

export function SmartCubeSolveControls() {
  const { t } = useTranslation();
  const state = smartCubeStore.useSmartCubeStore((s) => s);

  // Nur sichtbar wenn ein Cube verbunden ist — sonst liegt die Verbindung in
  // den Einstellungen und hier gibt es nichts zu steuern.
  if (state.status !== "connected") return null;

  // Farbe nach Solve-State (wie zuvor in SmartCubeConnect):
  //   idle grün · ready blau · solving amber · solved gold.
  const solveColor =
    state.solveState === "ready"
      ? "border-blue-500/40 bg-blue-500/5"
      : state.solveState === "solving"
        ? "border-amber-500/40 bg-amber-500/5"
        : state.solveState === "solved"
          ? "border-yellow-500/50 bg-yellow-500/10"
          : "border-emerald-500/40 bg-emerald-500/5";

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${solveColor}`}>
      {state.solveState === "idle" && (
        <button
          type="button"
          onClick={smartCubeStore.prepareForSolve}
          className="w-full rounded-lg border border-blue-500/40 bg-blue-600/30 px-3 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-600/50 hover:border-blue-500/60 active:scale-[0.98] transition-all"
          title={t("smartCube.readyButtonTitle")}
        >
          🧊 {t("smartCube.readyButton")}
        </button>
      )}
      {state.solveState === "ready" && (
        <div className="text-sm text-blue-100 flex items-center gap-2 bg-blue-500/10 rounded px-2 py-1.5">
          <span className="text-base">👋</span>
          <span>{t("smartCube.readyLabel")}</span>
        </div>
      )}
      {state.solveState === "solving" && (
        <>
          <div className="text-sm text-amber-200 font-mono flex items-center gap-2">
            <span>⏱</span>
            <span>{t("smartCube.solvingLabel")}</span>
            <span className="text-amber-100">
              ({state.solveMoveCount} {t("smartCube.movesShort")})
            </span>
          </div>
          <button
            type="button"
            onClick={smartCubeStore.stopSolve}
            className="w-full rounded-lg border border-amber-500/40 bg-amber-600/30 px-3 py-2 text-sm font-medium text-amber-100 hover:bg-amber-600/50 transition-all"
            title={t("smartCube.stopButtonTitle")}
          >
            {t("smartCube.stopButton")}
          </button>
        </>
      )}
      {state.solveState === "solved" && state.lastSolveTimeMs !== null && (
        <div className="text-sm text-yellow-200 font-mono flex items-baseline gap-3 flex-wrap">
          <span className="text-base">✓</span>
          <span className="text-yellow-100 text-2xl font-bold">
            {(state.lastSolveTimeMs / 1000).toFixed(2)}s
          </span>
          <span className="text-yellow-300/80">
            ({state.lastSolveMoves} {t("smartCube.movesShort")})
          </span>
        </div>
      )}
      {state.lastMove !== null && state.solveState === "idle" && (
        <div className="text-xs text-emerald-300/80 font-mono" aria-live="off">
          {t("smartCube.lastMoveLabel")}{" "}
          <span className="text-emerald-100 font-semibold">{state.lastMove}</span>
          <span className="text-gray-500 ml-2">
            ({t("smartCube.moveCountLabel", { count: state.moveCount })})
          </span>
        </div>
      )}
    </div>
  );
}

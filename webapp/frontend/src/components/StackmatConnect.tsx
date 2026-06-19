// StackmatConnect — Verbindungs-UI für einen Stackmat-/Speed-Stacks-Timer
// über die Klinkenbuchse (Audio-Signal). W.stackmat, 2026-06-13.
//
// Eingebaut im Timer-Tab direkt unter dem SmartCubeConnect-Block (gleiches
// Muster). Zustände: disconnected → connecting → listening (mit Live-Signal +
// Zeit) → error. Beim Solve speichert BigTimerInput automatisch (Event).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StackmatState } from "../hooks/useStackmatTimer";
import { InfoButton } from "./InfoButton";

interface Props {
  state: StackmatState;
  connect: (deviceId?: string | null) => void | Promise<void>;
  disconnect: () => void | Promise<void>;
  isSupported: boolean;
  /** Liefert den Diagnose-Snapshot als Text (für „Diagnose kopieren"). */
  getDiagnostics: () => string;
}

function fmt(ms: number): string {
  return (ms / 1000).toFixed(2);
}

/** Live-Pegel-Balken (W.stackmat-diag) — zeigt, ob Audio ankommt. */
function LevelMeter({ level }: { level: number }) {
  // Wurzel-Skalierung: kleine Signale sichtbarer machen.
  const pct = Math.min(100, Math.round(Math.sqrt(level) * 100));
  const color =
    pct > 4 ? "bg-emerald-400" : "bg-gray-600";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700/60">
      <div
        className={`h-full ${color} transition-[width] duration-150`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StackmatConnect({
  state,
  connect,
  disconnect,
  isSupported,
  getDiagnostics,
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copyDiag() {
    const text = getDiagnostics();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard-API blockiert (selten) → Fallback: in die Konsole, der
      // User kann es von dort kopieren.
      // eslint-disable-next-line no-console
      console.log(text);
      window.alert(t("stackmat.copyDiagFallback"));
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
        <div className="flex items-baseline gap-2">
          <span className="text-base">⚠</span>
          <div>
            <p className="font-medium mb-1">{t("stackmat.unsupportedTitle")}</p>
            <p>{t("stackmat.unsupportedBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "listening") {
    // Farbe nach Phase: idle grün, running amber, stopped gold.
    const phaseColor =
      state.phase === "running"
        ? "border-amber-500/40 bg-amber-500/5"
        : state.phase === "stopped"
          ? "border-yellow-500/50 bg-yellow-500/10"
          : "border-emerald-500/40 bg-emerald-500/5";
    const dotColor =
      state.phase === "running"
        ? "bg-amber-400"
        : state.phase === "stopped"
          ? "bg-yellow-400"
          : "bg-emerald-400";
    return (
      <div className={`rounded-lg border p-3 space-y-2 ${phaseColor}`}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full animate-pulse ${dotColor}`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-emerald-100">
              {t("stackmat.connectedTitle")}
            </span>
            <span className="text-xs text-emerald-300/80">
              {state.hasSignal
                ? t("stackmat.signalOk")
                : t("stackmat.signalWaiting")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="text-xs rounded bg-gray-700/80 px-2 py-1 text-gray-300 hover:bg-red-700/40 hover:text-red-200 transition-colors"
          >
            {t("stackmat.disconnectButton")}
          </button>
        </div>

        {/* Live-Zeit / letzter Solve. */}
        {state.phase === "running" && (
          <div className="text-sm text-amber-200 font-mono flex items-center gap-2">
            <span>⏱</span>
            <span className="text-amber-100 text-2xl font-bold tabular-nums">
              {fmt(state.liveMs)}s
            </span>
          </div>
        )}
        {state.phase !== "running" && state.lastSolveMs !== null && (
          <div className="text-sm text-yellow-200 font-mono flex items-baseline gap-3">
            <span className="text-base">✓</span>
            <span className="text-yellow-100 text-2xl font-bold tabular-nums">
              {fmt(state.lastSolveMs)}s
            </span>
            <span className="text-yellow-300/70 text-xs">
              {t("stackmat.savedNote")}
            </span>
          </div>
        )}

        {/* Pegel-Balken (W.stackmat-diag): sofort sichtbar, ob Audio ankommt. */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{t("stackmat.levelLabel")}</span>
            {state.inputLevel < 0.01 && (
              <span className="text-amber-300">{t("stackmat.levelNone")}</span>
            )}
          </div>
          <LevelMeter level={state.inputLevel} />
        </div>

        {/* Geräte-Auswahl — die häufigste Fehlerquelle ist das falsche
            Eingabegerät. Nur zeigen wenn es mehr als eines gibt. */}
        {state.devices.length > 1 && (
          <label className="block text-[11px] text-gray-400">
            {t("stackmat.deviceLabel")}
            <select
              value={state.deviceId ?? ""}
              onChange={(e) => void connect(e.target.value || null)}
              className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              {state.devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {!state.hasSignal && (
          <>
            <p className="text-[11px] text-emerald-200/70 leading-snug">
              {t("stackmat.noSignalHint")}
            </p>
            {/* Ein-Klick-Diagnose statt Konsolen-Suche (W.stackmat-diag): nimmt
                den aktuellen Roh-Byte-Mitschnitt in die Zwischenablage. */}
            <button
              type="button"
              onClick={() => void copyDiag()}
              className="w-full rounded-lg border border-gray-600 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              {copied ? t("stackmat.copyDiagDone") : t("stackmat.copyDiag")}
            </button>
          </>
        )}
        <p className="text-[10px] text-emerald-200/60 italic">
          {t("stackmat.autoSaveNote")}
        </p>
      </div>
    );
  }

  if (state.status === "connecting") {
    return (
      <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
        <p className="text-sm text-purple-200 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
          {t("stackmat.connectingLabel")}
        </p>
      </div>
    );
  }

  // disconnected ODER error
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-base" aria-hidden="true">
          ⏱️
        </span>
        <span className="text-sm font-medium text-gray-200">
          {t("stackmat.headerTitle")}
        </span>
        <InfoButton>
          <p className="font-medium mb-1">{t("stackmat.headerTitle")}</p>
          <p className="whitespace-pre-line">{t("stackmat.infoBody")}</p>
        </InfoButton>
      </div>
      {state.status === "error" && state.errorMessage && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          {t(state.errorMessage)}
        </div>
      )}
      <button
        type="button"
        onClick={() => void connect()}
        className="w-full rounded-lg border border-purple-500/40 bg-purple-600/30 px-3 py-2 text-sm font-medium text-purple-100 hover:bg-purple-600/50 hover:border-purple-500/60 active:scale-[0.98] transition-all"
      >
        {state.status === "error"
          ? t("stackmat.retryButton")
          : t("stackmat.connectButton")}
      </button>
      <p className="text-[10px] text-gray-500 italic leading-snug">
        {t("stackmat.connectHint")}
      </p>
    </div>
  );
}

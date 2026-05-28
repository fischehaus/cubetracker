// SmartCubeConnect — Bluetooth-Connect-UI für einen GAN-Smart-Cube.
//
// Phase W.gan-cube-mvp, 2026-05-28.
//
// Eingebaut in TimerControlsCard (Sub-Card im Timer-Tab). Verhalten:
// - Wenn Web-Bluetooth nicht supported (Safari, Firefox): Hinweis-
//   Box mit Browser-Empfehlung.
// - Wenn disconnected: großer Connect-Button mit „🧊 Cube verbinden".
//   Klick → Browser-Pairing-Dialog → useSmartCube.connect().
// - Wenn connecting: Loading-Spinner + „Verbinden…".
// - Wenn connected: grüner Status-Badge + Cube-Name + Battery + Last-Move
//   + Disconnect-Button.
// - Wenn error: rote Error-Box + Retry-Button.
//
// MVP — Sub-Welle 3 (Auto-Time-Insertion) ist noch nicht drin, der Last-
// Move-Indicator ist nur Beweis dass die BLE-Verbindung Events liefert.

import { useTranslation } from "react-i18next";
import type { SmartCubeState } from "../hooks/useSmartCube";
import { InfoButton } from "./InfoButton";

interface Props {
  state: SmartCubeState;
  connect: () => void | Promise<void>;
  disconnect: () => void | Promise<void>;
  isSupported: boolean;
}

export function SmartCubeConnect({
  state,
  connect,
  disconnect,
  isSupported,
}: Props) {
  const { t } = useTranslation();

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
        <div className="flex items-baseline gap-2">
          <span className="text-base">⚠</span>
          <div>
            <p className="font-medium mb-1">
              {t("smartCube.unsupportedTitle")}
            </p>
            <p>{t("smartCube.unsupportedBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "connected") {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-emerald-100">
              {state.cubeName ?? t("smartCube.unnamedCube")}
            </span>
            {state.batteryLevel !== null && (
              <span className="text-xs text-emerald-300/80">
                🔋 {state.batteryLevel}%
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="text-xs rounded bg-gray-700/80 px-2 py-1 text-gray-300 hover:bg-red-700/40 hover:text-red-200 transition-colors"
          >
            {t("smartCube.disconnectButton")}
          </button>
        </div>
        {state.lastMove !== null && (
          <div className="text-xs text-emerald-300/80 font-mono">
            {t("smartCube.lastMoveLabel")}{" "}
            <span className="text-emerald-100 font-semibold">
              {state.lastMove}
            </span>
            <span className="text-gray-500 ml-2">
              ({t("smartCube.moveCountLabel", { count: state.moveCount })})
            </span>
          </div>
        )}
        <p className="text-[10px] text-emerald-200/60 italic">
          {t("smartCube.mvpNote")}
        </p>
      </div>
    );
  }

  if (state.status === "connecting") {
    return (
      <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
        <p className="text-sm text-purple-200 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
          {t("smartCube.connectingLabel")}
        </p>
      </div>
    );
  }

  // disconnected ODER error
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-base" aria-hidden="true">
          🧊
        </span>
        <span className="text-sm font-medium text-gray-200">
          {t("smartCube.headerTitle")}
        </span>
        <InfoButton>
          <p className="font-medium mb-1">{t("smartCube.headerTitle")}</p>
          <p>{t("smartCube.infoBody")}</p>
        </InfoButton>
      </div>
      {state.status === "error" && state.errorMessage && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          {state.errorMessage}
        </div>
      )}
      <button
        type="button"
        onClick={() => void connect()}
        className="w-full rounded-lg border border-purple-500/40 bg-purple-600/30 px-3 py-2 text-sm font-medium text-purple-100 hover:bg-purple-600/50 hover:border-purple-500/60 active:scale-[0.98] transition-all"
      >
        {state.status === "error"
          ? t("smartCube.retryButton")
          : t("smartCube.connectButton")}
      </button>
      <p className="text-[10px] text-gray-500 italic leading-snug">
        {t("smartCube.pairingHint")}
      </p>
    </div>
  );
}

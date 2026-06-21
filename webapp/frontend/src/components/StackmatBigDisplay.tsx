// StackmatBigDisplay — das große Live-Timer-Display im Stackmat-Modus
// (W.stackmat-live-timer, 2026-06-20).
//
// Ersetzt im Timer-Tab den Spacebar-/Text-Timer, wenn timer_input_source ===
// "stackmat". Zeigt die Zeit in Echtzeit (wie csTimer): zählt live hoch während
// des Solves (liveMs), friert beim Stopp ein (lastSolveMs). Auto-Save läuft
// unverändert über den `cubetracker:stackmat-solve`-Listener in BigTimerInput.
//
// Liest den Singleton-Store mit PRIMITIV-Selektoren → nur diese Blatt-
// Komponente re-rendert bei den ~10 Updates/s, nicht der ganze Timer-Tab.

import { useTranslation } from "react-i18next";
import * as stackmatStore from "../lib/stackmatStore";
import { TIMER_FONT_SCALE, useAppSettings } from "../lib/settings";
import { formatTime } from "../lib/format";

export function StackmatBigDisplay({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) {
  const { t } = useTranslation();
  const [settings] = useAppSettings();
  const status = stackmatStore.useStackmatStore((s) => s.status);
  const phase = stackmatStore.useStackmatStore((s) => s.phase);
  const hasSignal = stackmatStore.useStackmatStore((s) => s.hasSignal);
  // Primitiv-Selektor: laufend → liveMs, sonst die eingefrorene letzte Zeit.
  const displayMs = stackmatStore.useStackmatStore((s) =>
    s.phase === "running" ? s.liveMs : (s.lastSolveMs ?? 0),
  );

  // Nicht verbunden → Hinweis-Link in die Einstellungen (F5). Kein stilles
  // 0.00-Display.
  if (status !== "listening") {
    return (
      <div className="py-10 text-center">
        <div className="mb-3 text-gray-400">
          ⏱️ {t("timer.stackmatNotConnected")}
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-lg border border-purple-500/40 bg-purple-600/20 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-600/40 transition-colors"
        >
          {t("timer.stackmatConnectLink")}
        </button>
      </div>
    );
  }

  const color =
    phase === "running"
      ? "text-amber-300"
      : phase === "stopped"
        ? "text-yellow-200"
        : "text-gray-100";

  return (
    <div className="overflow-hidden text-center">
      <div
        className={`mx-auto max-w-full font-mono tabular-nums leading-none ${color}`}
        style={{
          // Auf schmalen Viewports auf Viewport-Breite deckeln, damit die
          // große Schrift (bis 15rem) auf dem Phone nicht überläuft.
          fontSize: `min(${TIMER_FONT_SCALE[settings.timer_font_size].timer}, 22vw)`,
        }}
      >
        {formatTime(displayMs)}
      </div>
      {!hasSignal && (
        <p className="mt-2 text-xs text-amber-300/80">
          {t("timer.stackmatNoSignal")}
        </p>
      )}
    </div>
  );
}

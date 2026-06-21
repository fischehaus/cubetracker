// StackmatBigDisplay — das große Live-Timer-Display im Stackmat-Modus
// (W.stackmat-live-timer, 2026-06-20).
//
// Ersetzt im Timer-Tab den Spacebar-/Text-Timer, wenn timer_input_source ===
// "stackmat". Zeigt die Zeit in Echtzeit: während des Solves läuft eine LOKALE
// 60fps-Uhr (W.stackmat-live-clock — der Stackmat streamt die Laufzeit nicht
// flüssig genug), beim Stopp die vom Stackmat übermittelte Endzeit
// (lastSolveMs), die auch gespeichert wird. Auto-Save läuft unverändert über
// den `cubetracker:stackmat-solve`-Listener in BigTimerInput.
//
// Liest den Singleton-Store mit PRIMITIV-Selektoren → nur diese Blatt-
// Komponente re-rendert, nicht der ganze Timer-Tab.

import { useEffect, useRef, useState } from "react";
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
  const liveMs = stackmatStore.useStackmatStore((s) => s.liveMs);
  const lastSolveMs = stackmatStore.useStackmatStore((s) => s.lastSolveMs);

  // W.stackmat-live-clock (2026-06-20, User-Idee): der Stackmat liefert die
  // Laufzeit nicht flüssig (oft erst die Endzeit) — also läuft während „running"
  // eine LOKALE Uhr (requestAnimationFrame, 60fps), beim Start an der zuletzt
  // gemeldeten Stackmat-Zeit verankert und danach unabhängig vom Datentakt.
  // NACH dem Solve zeigen + speichern wir NICHT diese lokale Messung, sondern
  // die vom Stackmat übermittelte Endzeit (lastSolveMs) — die ist hardware-genau.
  const [renderMs, setRenderMs] = useState(0);
  const anchorRef = useRef<number | null>(null);
  const liveMsRef = useRef(liveMs);
  liveMsRef.current = liveMs;
  useEffect(() => {
    if (phase !== "running") {
      anchorRef.current = null;
      return;
    }
    // Anker = jetzt minus zuletzt gemeldete Stackmat-Zeit; ab da unabhängig.
    anchorRef.current = performance.now() - liveMsRef.current;
    setRenderMs(liveMsRef.current); // sofort den Startwert zeigen (kein Stale-Frame)
    let raf = 0;
    const loop = () => {
      if (anchorRef.current != null) {
        setRenderMs(performance.now() - anchorRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // laufend → lokale 60fps-Uhr; sonst → die eingefrorene Stackmat-Endzeit.
  const displayMs = phase === "running" ? renderMs : (lastSolveMs ?? 0);

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

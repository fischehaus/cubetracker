// HardwareWorkers — unsichtbare (null-rendernde) Hook-Owner für die beiden
// Hardware-Verbindungen (W.hardware-singleton-store, 2026-06-20).
//
// Genau EINE Instanz jedes Workers wird in MainLayout gerendert — ÜBER der
// Tab-Umschaltung. Folgen:
//   • Die Verbindung überlebt den Tab-Wechsel (der Worker bleibt gemountet,
//     während der Tab-Inhalt darunter wechselt) — der eigentliche Zweck.
//   • Beim Logout unmountet MainLayout → der Worker unmountet → der
//     Hook-Cleanup (teardown / BLE-disconnect) räumt Mikrofon/BLE sauber ab.
//
// Jeder Worker ruft seinen Hardware-Hook EINMAL auf (die Hooks bleiben
// unverändert — am echten G5/GAN verifizierte Logik nicht anfassen) und
// spiegelt dessen State + die stabilen Steuer-Callbacks in den Modul-Store.
// Alle Karten/Displays lesen danach NUR den Store → keine zweite Verbindung.
//
// Der Worker re-rendert mit den ~10 Hook-Updates/s, rendert aber `null` →
// Reconcile ~0. Die Render-Isolation passiert bei den Konsumenten (Selektoren).

import { useEffect } from "react";
import { useStackmatTimer } from "../hooks/useStackmatTimer";
import { useSmartCube } from "../hooks/useSmartCube";
import * as stackmatStore from "../lib/stackmatStore";
import * as smartCubeStore from "../lib/smartCubeStore";

export function StackmatWorker(): null {
  const { state, connect, disconnect, getDiagnostics } = useStackmatTimer();
  // Controls sind stabile useCallbacks → dieser Effect läuft praktisch einmal.
  useEffect(() => {
    stackmatStore.setControls({ connect, disconnect, getDiagnostics });
  }, [connect, disconnect, getDiagnostics]);
  // State-Mirror: `state` ändert die Ref nur bei echten Änderungen (Hook-Guards)
  // → mirrorState notifiet nur dann → Snapshot bleibt ref-stabil.
  useEffect(() => {
    stackmatStore.mirrorState(state);
  }, [state]);
  // Beim Unmount (Logout → MainLayout geht) den Store leeren, damit ein
  // Re-Login nicht kurz den alten Stand sieht (QA). Der Hook-Cleanup
  // (teardown) trennt parallel das Mikrofon.
  useEffect(() => () => stackmatStore.reset(), []);
  return null;
}

export function SmartCubeWorker(): null {
  const { state, connect, disconnect, prepareForSolve, stopSolve } =
    useSmartCube();
  useEffect(() => {
    smartCubeStore.setControls({ connect, disconnect, prepareForSolve, stopSolve });
  }, [connect, disconnect, prepareForSolve, stopSolve]);
  useEffect(() => {
    smartCubeStore.mirrorState(state);
  }, [state]);
  useEffect(() => () => smartCubeStore.reset(), []);
  return null;
}

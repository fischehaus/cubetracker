// Hardware-Singleton-Store für den GAN-Smart-Cube (W.hardware-singleton-store,
// 2026-06-20). Symmetrisch zu `lib/stackmatStore.ts` — siehe dort die
// ausführliche Begründung (Worker-Variante: der am Gerät verifizierte
// `hooks/useSmartCube.ts` bleibt unverändert, `<SmartCubeWorker/>` in
// MainLayout spiegelt State + Controls hierher).
//
// SELEKTOR-DISZIPLIN: nur Primitive oder den Snapshot selbst selektieren,
// nie ein frisch erzeugtes Objekt (sonst useSyncExternalStore-Endlosschleife).

import { useSyncExternalStore } from "react";
import type { SmartCubeState } from "../hooks/useSmartCube";

const INITIAL: SmartCubeState = {
  status: "disconnected",
  cubeName: null,
  batteryLevel: null,
  lastMove: null,
  lastFacelets: null,
  moveCount: 0,
  errorMessage: null,
  solveState: "idle",
  solveStartedAt: null,
  solveEndedAt: null,
  solveMoveCount: 0,
  lastSolveTimeMs: null,
  lastSolveMoves: null,
};

/** Vom Worker registrierte Steuer-Callbacks (die stabilen Hook-Funktionen). */
export interface SmartCubeControls {
  connect: () => void | Promise<void>;
  disconnect: () => void | Promise<void>;
  prepareForSolve: () => void;
  stopSolve: () => void;
}

let snapshot: SmartCubeState = INITIAL;
let controls: SmartCubeControls | null = null;
const listeners = new Set<() => void>();

/** Eager wie im Hook (Web-Bluetooth nur Chrome/Edge/Brave/Opera). */
export const isSupported =
  typeof navigator !== "undefined" &&
  typeof navigator.bluetooth !== "undefined";

function notify(): void {
  for (const l of listeners) l();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSnapshot(): SmartCubeState {
  return snapshot;
}

/** Vom Worker aufgerufen: spiegelt den Hook-State (ref-stabil bei No-Op). */
export function mirrorState(next: SmartCubeState): void {
  if (next === snapshot) return;
  snapshot = next;
  notify();
}

/** Vom Worker aufgerufen: registriert die (stabilen) Steuer-Callbacks. */
export function setControls(next: SmartCubeControls): void {
  controls = next;
}

/** Setzt Snapshot + Controls zurück (Worker-Unmount/Logout) — sonst sähe ein
 *  Re-Login kurz den alten „verbunden"-Stand (QA W.hardware-singleton-store). */
export function reset(): void {
  controls = null;
  if (snapshot !== INITIAL) {
    snapshot = INITIAL;
    notify();
  }
}

// Stabile Passthroughs — synchroner Aufruf-Pfad (User-Geste für
// navigator.bluetooth.requestDevice bleibt erhalten).
export function connect(): void {
  if (!controls) {
    // eslint-disable-next-line no-console
    console.warn("[smartCubeStore] connect() vor Worker-Mount — ignoriert.");
    return;
  }
  void controls.connect();
}
export function disconnect(): void {
  void controls?.disconnect();
}
export function prepareForSolve(): void {
  controls?.prepareForSolve();
}
export function stopSolve(): void {
  controls?.stopSolve();
}

export function useSmartCubeStore<T>(selector: (s: SmartCubeState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(snapshot),
    () => selector(snapshot),
  );
}

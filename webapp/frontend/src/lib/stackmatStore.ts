// Hardware-Singleton-Store für den Stackmat-Audio-Timer
// (W.hardware-singleton-store, 2026-06-20).
//
// WARUM: Die Verbindungs-Karte zieht in die Einstellungen, das Live-Display
// lebt im Timer-Tab — beide brauchen denselben Verbindungs-State, und die
// Verbindung muss den Tab-Wechsel überleben. Lösung nach dem `lib/toast.ts`-
// Vorbild: ein Modul-Singleton-Store AUSSERHALB des React-Trees, gelesen via
// `useSyncExternalStore` mit Selektoren.
//
// WORKER-VARIANTE (bewusst gewählt, da ohne echtes G5 nicht testbar): die am
// Gerät verifizierte Hardware-Logik in `hooks/useStackmatTimer.ts` bleibt
// UNVERÄNDERT. Genau EINE Komponente — `<StackmatWorker/>` in MainLayout
// (components/HardwareWorkers.tsx) — ruft den Hook auf und spiegelt seinen
// State + die (stabilen) Steuer-Callbacks hierher. Alle anderen Konsumenten
// lesen NUR den Store → genau eine Audio-Verbindung, überlebt den Tab-Wechsel.
//
// SELEKTOR-DISZIPLIN (useSyncExternalStore-Falle): ein Selektor MUSS bei
// Nicht-Änderung denselben Wert liefern (Object.is). Erlaubt sind PRIMITIVE
// (z.B. `s.liveMs`) oder der Snapshot selbst (`s => s`, ref-stabil zwischen
// echten Änderungen). NIEMALS ein frisch erzeugtes Objekt/Array selektieren
// (`s => ({...})`) — das würde bei jedem getSnapshot eine neue Ref liefern und
// eine Endlosschleife auslösen.

import { useSyncExternalStore } from "react";
import type { StackmatState } from "../hooks/useStackmatTimer";

const INITIAL: StackmatState = {
  status: "disconnected",
  hasSignal: false,
  phase: "idle",
  liveMs: 0,
  lastSolveMs: null,
  inputLevel: 0,
  devices: [],
  deviceId: null,
  errorMessage: null,
};

/** Vom Worker registrierte Steuer-Callbacks (die stabilen Hook-Funktionen). */
export interface StackmatControls {
  connect: (deviceId?: string | null) => void | Promise<void>;
  disconnect: () => void | Promise<void>;
  getDiagnostics: () => string;
}

let snapshot: StackmatState = INITIAL;
let controls: StackmatControls | null = null;
const listeners = new Set<() => void>();

/**
 * `isSupported` wird hier EAGER bestimmt (gleiche Prüfung wie im Hook) — damit
 * die Karte schon vor dem ersten Worker-Mirror den korrekten Wert hat (kein
 * „nicht unterstützt"-Flackern). Bei Änderung der Prüfung beide Stellen
 * synchron halten (Hook + Store).
 */
export const isSupported =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function" &&
  typeof window !== "undefined" &&
  ("AudioContext" in window || "webkitAudioContext" in window);

function notify(): void {
  for (const l of listeners) l();
}

/** Subscribe für `useSyncExternalStore`. Rückgabe: unsubscribe. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSnapshot(): StackmatState {
  return snapshot;
}

/**
 * Vom Worker aufgerufen: spiegelt den Hook-State. Der Hook gibt bei
 * Nicht-Änderung DIESELBE Objekt-Ref zurück (No-Op-Guards in useStackmatTimer),
 * also notifien wir nur bei echten Änderungen → kein useSyncExternalStore-
 * Endlos-Render, Snapshot-Ref bleibt zwischen echten Änderungen stabil.
 */
export function mirrorState(next: StackmatState): void {
  if (next === snapshot) return;
  snapshot = next;
  notify();
}

/** Vom Worker aufgerufen: registriert die (stabilen) Steuer-Callbacks. */
export function setControls(next: StackmatControls): void {
  controls = next;
}

/**
 * Setzt Snapshot + Controls auf den Ausgangszustand zurück. Der Worker ruft
 * das beim Unmount (= Logout, MainLayout geht) auf — sonst sähe ein Re-Login
 * im Singleton kurz den alten „verbunden"-Stand, bis der neue Worker spiegelt
 * (QA W.hardware-singleton-store).
 */
export function reset(): void {
  controls = null;
  if (snapshot !== INITIAL) {
    snapshot = INITIAL;
    notify();
  }
}

// Stabile Passthrough-Funktionen für die Konsumenten. Der Aufruf-Pfad bleibt
// SYNCHRON (Klick → connect() → controls.connect() → Hook), damit die
// User-Geste für getUserMedia erhalten bleibt — kein await dazwischen.
export function connect(deviceId?: string | null): void {
  if (!controls) {
    // Worker noch nicht gemountet (theoretisch: Klick < 1 Frame nach Mount).
    // Statt still zu schlucken einen Hinweis loggen (QA).
    // eslint-disable-next-line no-console
    console.warn("[stackmatStore] connect() vor Worker-Mount — ignoriert.");
    return;
  }
  void controls.connect(deviceId);
}
export function disconnect(): void {
  void controls?.disconnect();
}
export function getDiagnostics(): string {
  return controls?.getDiagnostics() ?? "Stackmat noch nicht initialisiert.";
}

/**
 * Selektor-Hook für Konsumenten. Re-Render nur wenn sich der selektierte Wert
 * unter Object.is ändert. Siehe SELEKTOR-DISZIPLIN oben.
 */
export function useStackmatStore<T>(selector: (s: StackmatState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(snapshot),
    () => selector(snapshot),
  );
}

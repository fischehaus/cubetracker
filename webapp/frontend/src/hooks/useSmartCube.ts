// useSmartCube — React-Hook für GAN-Smart-Cube-Pairing.
//
// Phase W.gan-cube-mvp, 2026-05-28.
//
// Nutzt die `gan-web-bluetooth`-Library (afedotov), die GAN Mini ui /
// 12 / 14 / 356i / Monster Go / MoYu-AI-2023 etc. via Web-Bluetooth-API
// anspricht. Browser-Constraint: Chrome / Edge / Brave / Opera (Desktop
// + Android) — Safari + Firefox haben kein Web-Bluetooth.
//
// Diese MVP-Welle macht NUR: Connect / Disconnect / Status / Last-Move-
// Indicator. Auto-Time-Insertion in BigTimerInput kommt in Sub-Welle 3
// (W.gan-cube-auto-time) — das braucht eine State-Machine die Scramble-
// erkannt → Inspection → Running → Solved erkennt.

import { useCallback, useEffect, useRef, useState } from "react";

// Lokale Typen-Aliase. W.gan-cube-mvp-qa: vorher selbst-definiert,
// jetzt mit der echten Library-Shape gehalten. Wenn gan-web-bluetooth
// in einer Folge-Version eigene Types ueber `types`-Feld exportiert,
// kann das hier per `import type` ersetzt werden — die Library-package.
// json deklariert zwar `types` aber RxJS-`Subject`-Shape ist breit
// genug dass wir hier einen minimalen Vertrag halten.
type GanCubeConnection = {
  events$: {
    subscribe: (handler: (event: GanCubeEvent) => void) => {
      unsubscribe: () => void;
    };
  };
  disconnect?: () => Promise<void> | void;
  deviceName?: string;
  deviceMAC?: string;
};

// QA-Fix W.gan-cube-mvp-qa (KRITISCH 1): DISCONNECT-Event ergaenzt —
// Library emittiert das wenn der Cube ausser Reichweite geht oder
// der Akku leer ist. Vorher: Hook blieb dauerhaft im connected-Status.
type GanCubeEvent =
  | { type: "FACELETS"; facelets: string; serial?: number; timestamp?: number }
  | { type: "MOVE"; move: string; serial?: number; timestamp?: number; cubeTimestamp?: number }
  | { type: "BATTERY"; batteryLevel: number }
  | { type: "HARDWARE"; hardwareName?: string; softwareVersion?: string; productDate?: string }
  | { type: "DISCONNECT" };

export type SmartCubeStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SmartCubeState {
  status: SmartCubeStatus;
  cubeName: string | null;
  batteryLevel: number | null;
  lastMove: string | null;
  lastFacelets: string | null;
  moveCount: number;
  errorMessage: string | null;
}

const INITIAL_STATE: SmartCubeState = {
  status: "disconnected",
  cubeName: null,
  batteryLevel: null,
  lastMove: null,
  lastFacelets: null,
  moveCount: 0,
  errorMessage: null,
};

export function useSmartCube() {
  const [state, setState] = useState<SmartCubeState>(INITIAL_STATE);
  // Connection-Ref bleibt zwischen Renders erhalten (nicht in State weil
  // wir die nicht serialisieren / nicht in React-Tree wollen).
  const connectionRef = useRef<GanCubeConnection | null>(null);
  // Subscription-Ref für sauberes Cleanup.
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Helper: prüft ob Web-Bluetooth verfügbar (Safari + Firefox fehlen).
  const isSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.bluetooth !== "undefined";

  const connect = useCallback(async () => {
    if (!isSupported) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "Web-Bluetooth wird vom Browser nicht unterstützt.",
      }));
      return;
    }
    // QA-Fix W.gan-cube-mvp-qa (SOLLTE Race-Condition): Guard gegen
    // double-connect. Wenn schon connecting oder connected → no-op.
    // Schuetzt gegen schnelles Klicken UND gegen programmatische
    // Aufrufe von aussen (nicht nur den Button).
    setState((current) => {
      if (current.status === "connecting" || current.status === "connected") {
        return current; // no-op
      }
      return { ...current, status: "connecting", errorMessage: null };
    });
    // Re-Check — wenn der State-Setter abgebrochen hat, fruehzeitig raus.
    // Nicht ueber State direkt pruefen (das ist stale), sondern via Ref.
    if (connectionRef.current !== null) return;
    try {
      // Dynamic import — gan-web-bluetooth nicht im initialen Bundle
      // (User der nie Smart-Cube nutzt zahlt das ~30kb nicht).
      const { connectGanCube } = await import("gan-web-bluetooth");
      const conn = (await connectGanCube()) as GanCubeConnection;
      connectionRef.current = conn;
      setState((s) => ({
        ...s,
        status: "connected",
        cubeName: conn.deviceName ?? "GAN Cube",
        errorMessage: null,
      }));
      // Event-Subscription
      subscriptionRef.current = conn.events$.subscribe((event) => {
        if (event.type === "MOVE") {
          setState((s) => ({
            ...s,
            lastMove: event.move,
            moveCount: s.moveCount + 1,
          }));
        } else if (event.type === "FACELETS") {
          setState((s) => ({ ...s, lastFacelets: event.facelets }));
        } else if (event.type === "BATTERY") {
          setState((s) => ({ ...s, batteryLevel: event.batteryLevel }));
        } else if (event.type === "HARDWARE") {
          if (event.hardwareName) {
            setState((s) => ({ ...s, cubeName: event.hardwareName ?? s.cubeName }));
          }
        } else if (event.type === "DISCONNECT") {
          // QA-Fix W.gan-cube-mvp-qa (KRITISCH 1): Cube hat die
          // Verbindung getrennt (Akku, Reichweite, BLE-Timeout).
          // Status zurueck auf disconnected, sonst lebt der gruene
          // Pulse-Dot weiter obwohl die Subscription tot ist.
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
          }
          connectionRef.current = null;
          setState({
            ...INITIAL_STATE,
            errorMessage: "Cube-Verbindung verloren (Akku? Reichweite?).",
            status: "error",
          });
        }
      });
    } catch (err: unknown) {
      // QA-Fix W.gan-cube-mvp-qa (SOLLTE User-Cancel): Wenn der User
      // den Browser-Pairing-Dialog schliesst ohne ein Geraet zu waehlen,
      // wirft die API eine DOMException "NotFoundError". Das ist eine
      // normale Aktion, kein Fehler — still zum disconnected-State.
      const isUserCancel =
        err instanceof Error &&
        (err.name === "NotFoundError" ||
          err.message.toLowerCase().includes("user cancelled") ||
          err.message.toLowerCase().includes("cancelled by user"));
      if (isUserCancel) {
        setState(INITIAL_STATE);
        return;
      }
      const msg = err instanceof Error ? err.message : "Verbindungs-Fehler.";
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: msg,
      }));
      connectionRef.current = null;
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (connectionRef.current?.disconnect) {
      try {
        await connectionRef.current.disconnect();
      } catch {
        /* ignore — Library disconnect kann werfen wenn schon weg */
      }
    }
    connectionRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, lastMove: null, moveCount: 0 }));
  }, []);

  // Cleanup beim Unmount — wichtig damit die BLE-Connection nicht
  // weiterlebt wenn der User aus dem Timer-Tab navigiert.
  // QA-Fix W.gan-cube-mvp-qa (NICE): `void` vor disconnect-Call damit
  // unbehandelte Promise-Rejection den Unmount nicht stoert.
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (connectionRef.current?.disconnect) {
        void Promise.resolve(connectionRef.current.disconnect()).catch(() => {
          /* ignore BLE-disconnect errors im Unmount-Pfad */
        });
      }
      connectionRef.current = null;
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    reset,
    isSupported,
  };
}

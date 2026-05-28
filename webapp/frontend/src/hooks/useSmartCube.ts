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

// Library exports — typed any wegen fehlender offizieller .d.ts. Cast
// auf konkrete Shape sobald wir die echten Types brauchen.
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

type GanCubeEvent =
  | { type: "FACELETS"; facelets: string; serial?: number; timestamp?: number }
  | { type: "MOVE"; move: string; serial?: number; timestamp?: number; cubeTimestamp?: number }
  | { type: "BATTERY"; batteryLevel: number }
  | { type: "HARDWARE"; hardwareName?: string; softwareVersion?: string; productDate?: string };

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
    setState((s) => ({ ...s, status: "connecting", errorMessage: null }));
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
        }
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Verbindungs-Fehler.";
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
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (connectionRef.current?.disconnect) {
        connectionRef.current.disconnect();
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

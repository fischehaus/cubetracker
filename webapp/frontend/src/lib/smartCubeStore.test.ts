// Tests für den Smart-Cube-Singleton-Store (W.hardware-singleton-store).
// DOM-frei — Pub-Sub + Control-Delegation direkt getestet.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as store from "./smartCubeStore";
import type { SmartCubeState } from "../hooks/useSmartCube";

function makeState(over: Partial<SmartCubeState> = {}): SmartCubeState {
  return {
    status: "connected",
    cubeName: "GAN Test",
    batteryLevel: 80,
    lastMove: "R",
    lastFacelets: null,
    moveCount: 3,
    errorMessage: null,
    solveState: "idle",
    solveStartedAt: null,
    solveEndedAt: null,
    solveMoveCount: 0,
    lastSolveTimeMs: null,
    lastSolveMoves: null,
    ...over,
  };
}

describe("smartCubeStore", () => {
  beforeEach(() => {
    store.setControls({
      connect: () => {},
      disconnect: () => {},
      prepareForSolve: () => {},
      stopSolve: () => {},
    });
    store.mirrorState(makeState({ status: "disconnected", cubeName: null }));
  });

  afterEach(() => {
    store.reset();
  });

  it("mirrorState notifiet nur bei echter (Ref-)Änderung", () => {
    const s1 = makeState({ moveCount: 5 });
    const cb = vi.fn();
    const unsub = store.subscribe(cb);

    store.mirrorState(s1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(s1);

    store.mirrorState(s1); // gleiche Ref → kein notify
    expect(cb).toHaveBeenCalledTimes(1);

    store.mirrorState(makeState({ moveCount: 6 }));
    expect(cb).toHaveBeenCalledTimes(2);

    unsub();
    store.mirrorState(makeState({ moveCount: 7 }));
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("connect/disconnect/prepareForSolve/stopSolve delegieren an die Controls", () => {
    const connect = vi.fn();
    const disconnect = vi.fn();
    const prepareForSolve = vi.fn();
    const stopSolve = vi.fn();
    store.setControls({ connect, disconnect, prepareForSolve, stopSolve });

    store.connect();
    store.disconnect();
    store.prepareForSolve();
    store.stopSolve();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(prepareForSolve).toHaveBeenCalledTimes(1);
    expect(stopSolve).toHaveBeenCalledTimes(1);
  });

  it("isSupported ist ein Boolean (eager bestimmt)", () => {
    expect(typeof store.isSupported).toBe("boolean");
  });

  it("reset() leert den Store + benachrichtigt", () => {
    store.mirrorState(makeState({ status: "connected", moveCount: 9 }));
    const cb = vi.fn();
    store.subscribe(cb);
    store.reset();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe("disconnected");
    expect(() => store.connect()).not.toThrow();
  });
});

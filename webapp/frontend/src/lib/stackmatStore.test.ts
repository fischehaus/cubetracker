// Tests für den Stackmat-Singleton-Store (W.hardware-singleton-store).
// DOM-frei: wir testen die Pub-Sub-Mechanik + die Control-Delegation direkt
// (kein React-Render — @testing-library/react ist nicht installiert).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as store from "./stackmatStore";
import type { StackmatState } from "../hooks/useStackmatTimer";

function makeState(over: Partial<StackmatState> = {}): StackmatState {
  return {
    status: "listening",
    hasSignal: true,
    phase: "running",
    liveMs: 1230,
    lastSolveMs: null,
    inputLevel: 0.5,
    devices: [],
    deviceId: null,
    errorMessage: null,
    ...over,
  };
}

describe("stackmatStore", () => {
  beforeEach(() => {
    // Bekannte Baseline (Singleton-State leakt sonst zwischen Tests).
    store.setControls({
      connect: () => {},
      disconnect: () => {},
      getDiagnostics: () => "baseline",
    });
    store.mirrorState(makeState({ liveMs: 0, phase: "idle" }));
  });

  // Singleton-State zwischen Tests sauber halten (QA).
  afterEach(() => {
    store.reset();
  });

  it("mirrorState notifiet nur bei echter (Ref-)Änderung", () => {
    const s1 = makeState({ liveMs: 1000 });
    const cb = vi.fn();
    const unsub = store.subscribe(cb);

    store.mirrorState(s1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(s1);

    // Dieselbe Ref erneut → KEIN notify (verhindert useSyncExternalStore-Loop).
    store.mirrorState(s1);
    expect(cb).toHaveBeenCalledTimes(1);

    // Neue Ref → notify.
    const s2 = makeState({ liveMs: 2000 });
    store.mirrorState(s2);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toBe(s2);

    unsub();
    store.mirrorState(makeState({ liveMs: 3000 }));
    expect(cb).toHaveBeenCalledTimes(2); // nach unsub kein notify mehr
  });

  it("getSnapshot liefert zwischen echten Änderungen dieselbe Ref (Selektor-Stabilität)", () => {
    const s = makeState({ liveMs: 4200 });
    store.mirrorState(s);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("connect/disconnect/getDiagnostics delegieren an die registrierten Controls", () => {
    const connect = vi.fn();
    const disconnect = vi.fn();
    const getDiagnostics = vi.fn(() => "DIAG-DUMP");
    store.setControls({ connect, disconnect, getDiagnostics });

    store.connect("device-1");
    store.disconnect();

    expect(connect).toHaveBeenCalledWith("device-1");
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(store.getDiagnostics()).toBe("DIAG-DUMP");
  });

  it("isSupported ist ein Boolean (eager bestimmt)", () => {
    expect(typeof store.isSupported).toBe("boolean");
  });

  it("reset() leert den Store + benachrichtigt (kein Stale-State nach Logout)", () => {
    store.mirrorState(makeState({ status: "listening", liveMs: 5000 }));
    const cb = vi.fn();
    store.subscribe(cb);
    store.reset();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe("disconnected");
    expect(store.getSnapshot().liveMs).toBe(0);
    // connect nach reset (Controls null) ist ein no-op + warnt, kein Crash.
    expect(() => store.connect()).not.toThrow();
  });
});

// useStackmatTimer — Audio-Anbindung eines Stackmat-/Speed-Stacks-Timers.
//
// W.stackmat, 2026-06-13.
//
// Der Timer sendet seine Zeit als 1200-Baud-Serien-Signal über die Klinke.
// Per Klinkenkabel (Timer → Mic-/Line-In) liest die App das Signal mit
// getUserMedia + Web Audio aus und dekodiert es (lib/stackmat.ts).
//
// Browser-Constraint: getUserMedia(audio) braucht HTTPS (gegeben) + die
// Mikrofon-Permission. Im nginx-Header ist Permissions-Policy `microphone=(self)`
// gesetzt (W.stackmat) — ohne das blockte der Browser den Zugriff.
//
// WICHTIG (sonst kommt kein Signal durch): echoCancellation / noiseSuppression /
// autoGainControl MÜSSEN aus sein — diese DSP-Stufen zerstören das
// Rechteck-Serien-Signal.
//
// Auto-Save-Pfad analog useSmartCube: bei abgeschlossenem Solve wird ein
// `cubetracker:stackmat-solve`-CustomEvent gefeuert; BigTimerInput speichert.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  StackmatDualDecoder,
  StackmatSolveTracker,
  type StackmatTimerPhase,
} from "../lib/stackmat";

export type StackmatStatus =
  | "disconnected"
  | "connecting"
  | "listening"
  | "error";

export interface StackmatState {
  status: StackmatStatus;
  /** true, sobald in den letzten ~1.5s ein gültiges Paket ankam. */
  hasSignal: boolean;
  /** Aktuelle Phase des Timers (idle/running/stopped) laut Paketen. */
  phase: StackmatTimerPhase;
  /** Live-Zeit aus dem letzten Paket (ms) — für die Anzeige. */
  liveMs: number;
  /** Zuletzt abgeschlossener + gespeicherter Solve (ms). */
  lastSolveMs: number | null;
  errorMessage: string | null;
}

const INITIAL: StackmatState = {
  status: "disconnected",
  hasSignal: false,
  phase: "idle",
  liveMs: 0,
  lastSolveMs: null,
  errorMessage: null,
};

// CustomEvent-Name (analog SMART_CUBE_SOLVE_EVENT). Detail: { time_ms }.
export const STACKMAT_SOLVE_EVENT = "cubetracker:stackmat-solve";

// Minimal-Typ für webkit-prefixed AudioContext (Safari/iOS) ohne `any`.
type AudioContextCtor = typeof AudioContext;

export function useStackmatTimer() {
  const [state, setState] = useState<StackmatState>(INITIAL);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sinkRef = useRef<GainNode | null>(null);
  const decoderRef = useRef<StackmatDualDecoder | null>(null);
  const trackerRef = useRef<StackmatSolveTracker | null>(null);
  // Zeitstempel des letzten gültigen Pakets — für hasSignal (über requestAnim
  // wäre Overkill; ein 1s-Interval reicht).
  const lastPacketAtRef = useRef<number>(0);
  // QA W.stackmat: Ref-Guard gegen (a) parallele connect()-Aufrufe (zwei
  // schnelle Taps → zwei getUserMedia) und (b) disconnect WÄHREND getUserMedia
  // läuft (sonst Zombie-Stream: Mic bleibt aktiv bis Reload). Der frühere
  // setState-Closure-Guard verhinderte nur den State-Write, nicht die async-
  // Fortsetzung. teardown() setzt das Flag zurück.
  const connectingRef = useRef(false);

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    (typeof window !== "undefined" &&
      ("AudioContext" in window ||
        "webkitAudioContext" in window));

  const teardown = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (sinkRef.current) {
      sinkRef.current.disconnect();
      sinkRef.current = null;
    }
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => {
        /* ignore */
      });
      ctxRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    decoderRef.current = null;
    trackerRef.current = null;
    connectingRef.current = false;
  }, []);

  const disconnect = useCallback(() => {
    teardown();
    setState(INITIAL);
  }, [teardown]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "stackmat.unsupported",
      }));
      return;
    }
    // Ref-Guard: bereits am Verbinden/Verbunden → no-op (verhindert parallele
    // getUserMedia-Aufrufe, die der setState-Guard allein nicht abfängt).
    if (connectingRef.current) return;
    connectingRef.current = true;
    setState({ ...INITIAL, status: "connecting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // KRITISCH: alle DSP-Stufen aus — sie zerstören das Serien-Signal.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });
      // disconnect() während des Permission-Dialogs? Dann ist connectingRef
      // zurückgesetzt — diesen frisch erhaltenen Stream sofort stoppen, sonst
      // bliebe das Mikrofon (Browser-Indicator) bis zum Reload aktiv.
      if (!connectingRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;

      const Ctor: AudioContextCtor =
        (window as unknown as { AudioContext?: AudioContextCtor }).AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor })
          .webkitAudioContext!;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      // Manche Browser starten den Context suspended (Autoplay-Policy) — der
      // connect()-Klick ist eine User-Geste, also darf resume() laufen.
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {
          /* ignore */
        });
      }

      const tracker = new StackmatSolveTracker({
        onSolve: (timeMs) => {
          lastPacketAtRef.current = performance.now();
          setState((s) => ({ ...s, lastSolveMs: timeMs, phase: "stopped" }));
          try {
            window.dispatchEvent(
              new CustomEvent(STACKMAT_SOLVE_EVENT, {
                detail: { time_ms: timeMs },
              }),
            );
          } catch {
            /* ignore */
          }
        },
        onChange: (phase, timeMs) => {
          lastPacketAtRef.current = performance.now();
          setState((s) =>
            s.phase === phase && s.liveMs === timeMs && s.hasSignal
              ? s
              : { ...s, phase, liveMs: timeMs, hasSignal: true },
          );
        },
      });
      trackerRef.current = tracker;

      const decoder = new StackmatDualDecoder(ctx.sampleRate, (p) =>
        tracker.onPacket(p),
      );
      decoderRef.current = decoder;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      // ScriptProcessor: bewusst (kein AudioWorklet-Modul → kein extra
      // Build-/CSP-Aufwand). Liefert lückenlose Sample-Blöcke; Timing-Jitter
      // egal, da wir die Bit-Zeiten aus Sample-Abständen rekonstruieren.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = e.inputBuffer.getChannelData(0);
        decoderRef.current?.push(input);
      };
      processorRef.current = processor;

      // ScriptProcessor muss mit dem Ziel verbunden sein, um zu laufen —
      // aber über einen Gain=0-Knoten, damit nichts hörbar zurückkommt.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      sinkRef.current = sink;
      source.connect(processor);
      processor.connect(sink);
      sink.connect(ctx.destination);

      setState((s) => ({ ...s, status: "listening", errorMessage: null }));
    } catch (err: unknown) {
      teardown();
      const name = err instanceof Error ? err.name : "";
      // User hat die Mikrofon-Freigabe abgelehnt / abgebrochen.
      const denied =
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        name === "NotFoundError";
      setState({
        ...INITIAL,
        status: "error",
        errorMessage: denied ? "stackmat.permissionDenied" : "stackmat.genericError",
      });
    }
  }, [isSupported, teardown]);

  // hasSignal nach ~1.5s ohne gültiges Paket zurücksetzen (Kabel ab / Timer
  // aus). Leichtgewichtiges Intervall statt RAF.
  useEffect(() => {
    if (state.status !== "listening") return;
    const id = window.setInterval(() => {
      const stale = performance.now() - lastPacketAtRef.current > 1500;
      setState((s) =>
        s.hasSignal && stale ? { ...s, hasSignal: false } : s,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  // Cleanup beim Unmount (Tab-Wechsel raus aus Timer).
  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  return { state, connect, disconnect, isSupported };
}

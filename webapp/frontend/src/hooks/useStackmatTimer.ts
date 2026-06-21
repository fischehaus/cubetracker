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

/** Auswählbares Audio-Eingabegerät (W.stackmat-diag). */
export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

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
  /** Aktueller Eingangs-Pegel 0..1 (Peak, W.stackmat-diag) — zeigt, ob
   *  überhaupt Audio ankommt (= richtiges Eingabegerät?). */
  inputLevel: number;
  /** Verfügbare Audio-Eingänge (erst nach erteilter Mic-Permission mit Labels). */
  devices: AudioInputDevice[];
  /** Aktuell genutztes Eingabegerät (deviceId) oder null = System-Default. */
  deviceId: string | null;
  errorMessage: string | null;
}

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
  // Diagnose (W.stackmat-diag): Peak-Pegel des letzten Audio-Blocks +
  // Ring der zuletzt dekodierten Roh-Byte-CODES je Polarität (Hex-Dump fürs
  // Konsolen-Log → erlaubt Ferndiagnose des exakten Frame-Formats, wenn Audio
  // ankommt aber kein Frame mit meiner angenommenen Checksum validiert).
  const peakRef = useRef<number>(0);
  const rawByteCountRef = useRef<number>(0);
  const rawHexRef = useRef<{ normal: number[]; inverted: number[] }>({
    normal: [],
    inverted: [],
  });
  // W.stackmat-frame-diag (2026-06-20): Ring der zuletzt DEKODIERTEN Pakete
  // (Zeit + Status) — zeigt, ob der Stackmat die Laufzeit WÄHREND des Solves
  // streamt (steigende ms) oder erst danach sendet. Antwort auf „Echtzeit läuft
  // nicht mit". Cap ~400 (≈40 s bei 10/s).
  const packetLogRef = useRef<{ ms: number; st: string }[]>([]);

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

  const connect = useCallback(async (deviceId?: string | null) => {
    if (!isSupported) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "stackmat.unsupported",
      }));
      return;
    }
    // Ref-Guard: läuft schon ein connect()? → no-op (verhindert parallele
    // getUserMedia-Aufrufe, die der setState-Guard allein nicht abfängt).
    if (connectingRef.current) return;
    // Bestehende Session räumen — erlaubt Geräte-Wechsel im laufenden Betrieb
    // (teardown ist no-op wenn nichts offen ist). Setzt connectingRef auf false,
    // daher direkt danach wieder true.
    teardown();
    connectingRef.current = true;
    peakRef.current = 0;
    rawByteCountRef.current = 0;
    rawHexRef.current = { normal: [], inverted: [] };
    packetLogRef.current = [];
    setState({ ...INITIAL, status: "connecting", deviceId: deviceId ?? null });
    try {
      // W.stackmat-diag: optionale Geräte-Wahl (häufigste Fehlerquelle: Windows
      // nimmt das eingebaute Mik statt des Line-/Mic-Eingangs mit dem Kabel).
      const audioConstraints: MediaTrackConstraints = {
        // KRITISCH: alle DSP-Stufen aus — sie zerstören das Serien-Signal.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      };
      if (deviceId) audioConstraints.deviceId = { exact: deviceId };
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
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

      // Geräte-Liste holen (Labels gibt es erst NACH erteilter Permission).
      let devices: AudioInputDevice[] = [];
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        devices = all
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Eingang ${i + 1}`,
          }));
      } catch {
        /* enumerate kann fehlschlagen — Geräte-Wahl dann eben leer */
      }
      // Welches Gerät nutzt der Stream tatsächlich? (für die Dropdown-Auswahl)
      const activeId =
        deviceId ?? stream.getAudioTracks()[0]?.getSettings().deviceId ?? null;

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

      const decoder = new StackmatDualDecoder(
        ctx.sampleRate,
        (p) => {
          // W.stackmat-frame-diag: jedes dekodierte Paket protokollieren (für
          // die Stream-vs-nur-Endzeit-Diagnose), dann normal an den Tracker.
          const log = packetLogRef.current;
          log.push({ ms: p.timeMs, st: p.status });
          if (log.length > 400) log.shift();
          tracker.onPacket(p);
        },
        // Diagnose: jedes dekodierte Roh-Byte zählen + die letzten ~60 Byte-
        // CODES je Polarität als Ring halten (Hex-Dump im Log → exaktes
        // Frame-Format remote analysierbar).
        (ch, polarity) => {
          rawByteCountRef.current++;
          const arr = rawHexRef.current[polarity];
          arr.push(ch.charCodeAt(0) & 0xff);
          if (arr.length > 60) arr.shift();
        },
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
        // Peak-Pegel für die Diagnose-Anzeige (zeigt, ob Audio ankommt).
        let peak = 0;
        for (let i = 0; i < input.length; i++) {
          const a = input[i] < 0 ? -input[i] : input[i];
          if (a > peak) peak = a;
        }
        if (peak > peakRef.current) peakRef.current = peak;
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

      // Erfolgreich verbunden → in-flight-Guard freigeben (sonst würde ein
      // Geräte-Wechsel am `if (connectingRef.current) return` abprallen).
      connectingRef.current = false;
      setState((s) => ({
        ...s,
        status: "listening",
        errorMessage: null,
        devices,
        deviceId: activeId,
      }));
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

  // Pegel-Anzeige + hasSignal-Reset + Diagnose-Log. Ein gemeinsames Intervall
  // (4×/s für einen flüssigen Pegel-Balken). hasSignal fällt nach ~1.5s ohne
  // gültiges Paket zurück (Kabel ab / Timer aus).
  useEffect(() => {
    if (state.status !== "listening") return;
    let ticks = 0;
    const id = window.setInterval(() => {
      const peak = peakRef.current;
      peakRef.current = 0; // pro Fenster neu messen (Balken decayed)
      const stale = performance.now() - lastPacketAtRef.current > 1500;
      setState((s) => {
        const level = Math.round(peak * 1000) / 1000;
        const nextSignal = stale ? false : s.hasSignal;
        if (s.inputLevel === level && s.hasSignal === nextSignal) return s;
        return { ...s, inputLevel: level, hasSignal: nextSignal };
      });
      // Diagnose-Log ~alle 2s, solange Audio läuft aber (noch) kein gültiges
      // Frame ankam — gibt dem User etwas zum Kopieren für die Ferndiagnose.
      ticks++;
      if (stale && ticks % 8 === 0) {
        const hex = (a: number[]) =>
          a.map((b) => b.toString(16).padStart(2, "0")).join(" ");
        // eslint-disable-next-line no-console
        console.log(
          `[Stackmat-Diag] Pegel=${peak.toFixed(3)} Roh-Bytes=${rawByteCountRef.current}\n` +
            `  normal:   ${hex(rawHexRef.current.normal)}\n` +
            `  inverted: ${hex(rawHexRef.current.inverted)}\n` +
            `  (Hex der zuletzt dekodierten Bytes je Polaritaet — fuers Format-Debugging)`,
        );
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [state.status]);

  // Cleanup beim Unmount (Tab-Wechsel raus aus Timer).
  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  // Diagnose-Snapshot als Text (W.stackmat-diag) — für den „Diagnose
  // kopieren"-Button. Liest die Refs zum Klick-Zeitpunkt (frisch), damit der
  // User nicht im Konsolen-Log nach der richtigen Zeile suchen muss.
  const getDiagnostics = useCallback((): string => {
    const hex = (a: number[]) =>
      a.map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const r = rawHexRef.current;
    // W.stackmat-frame-diag: dekodierte Pakete zu Läufen gleicher (ms,status)
    // zusammenfassen — so sieht man sofort, ob die Zeit während des Solves
    // STEIGT (Stream) oder erst am Ende als ein Wert auftaucht. xN ≈ N·100 ms.
    const log = packetLogRef.current;
    const runs: string[] = [];
    let pMs: number | null = null;
    let pSt = "";
    let n = 0;
    for (const e of log) {
      if (e.ms === pMs && e.st === pSt) {
        n++;
      } else {
        if (pMs !== null) runs.push(`ms=${pMs} st='${pSt}' x${n}`);
        pMs = e.ms;
        pSt = e.st;
        n = 1;
      }
    }
    if (pMs !== null) runs.push(`ms=${pMs} st='${pSt}' x${n}`);
    return [
      "Stackmat-Diagnose",
      `Pegel(letzt)=${state.inputLevel}  Roh-Bytes=${rawByteCountRef.current}  ` +
        `SampleRate=${ctxRef.current?.sampleRate ?? "?"}  Signal=${state.hasSignal}`,
      `Pakete=${log.length}`,
      "Paket-Laeufe (neueste Solve-Sequenz, xN ~ N*100ms):",
      ...runs.slice(-50),
      `normal:   ${hex(r.normal)}`,
      `inverted: ${hex(r.inverted)}`,
    ].join("\n");
  }, [state.inputLevel, state.hasSignal]);

  return { state, connect, disconnect, isSupported, getDiagnostics };
}

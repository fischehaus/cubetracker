// useSpacebarTimer (Phase 8.2) — der WCA-Standard-Spacebar-Flow
// als wiederverwendbarer React-Hook.
//
// State-Machine:
//   idle       → User druckt Space → (inspection_enabled ? inspection : ready)
//   inspection → 15s countdown, sound bei 8s + 12s; Space-press während
//                inspection → ready/holding
//   ready      → Space-up zwischendurch nicht erlaubt; nach hold_time_ms
//                gehts in „holding" (visuell green = go)
//   holding    → User laesst Space los → running, timer startet
//   running    → Space-press → stopped, time gefangen
//   stopped    → User übernimmt das Save (Hook liefert finalMs);
//                nächste Space wieder zu idle
//
// WCA-Penalty-Logic:
//   inspection > 15s aber <= 17s → +2 (penalty)
//   inspection > 17s             → DNF
//
// Der Hook expose:
//   - state            : aktueller phase-string
//   - displayMs        : was angezeigt werden soll (während running tickt es)
//   - inspectionLeftMs : countdown remaining (nur in inspection)
//   - penalty          : "none" | "+2" | "DNF" (nach inspection-overrun)
//   - reset()          : zurück zu idle (nach Save)
//
// Achtung: Hook bindet GLOBAL keydown/keyup an window. Das funktioniert
// nur wenn der TIMER/Drill-Tab aktiv ist. Wenn der User in einem Input
// tippt (target.tagName === "INPUT"), ignorieren wir Spacebar — sonst
// würde Spacebar im SuchFeld den Timer triggern.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  playInspectionWarn8s,
  playInspectionWarn12s,
  primeAudio,
  speakInspectionWarn8s,
  speakInspectionWarn12s,
} from "../lib/timer-sound";
import type { AppSettings } from "../lib/settings";

export type TimerState =
  | "idle"
  | "inspection"
  | "ready"
  | "holding"
  | "running"
  | "stopped";

export type TimerPenalty = "none" | "+2" | "DNF";

export interface SpacebarTimerResult {
  /** Aktueller State der State-Machine */
  state: TimerState;
  /** Anzuzeigende Zeit in ms (running: live-tick, stopped: end-time) */
  displayMs: number;
  /** Inspection-countdown remaining in ms — nur während `inspection` */
  inspectionLeftMs: number;
  /** Penalty wenn Inspection überschritten wurde */
  penalty: TimerPenalty;
  /**
   * Phase 8.2 Multi-Phase: bisher abgeschlossene Phasen-Zeiten
   * (kumulativ vom Start). Length = phaseIndex (= nächste zu beendende
   * Phase ist phaseIndex). [] wenn splits_enabled=false.
   */
  splits: number[];
  /** Index der aktuell laufenden Phase (0-basiert). */
  phaseIndex: number;
  /** Setzt state → idle, displayMs → 0 (nach Save aufrufen) */
  reset: () => void;
}

interface Options {
  enabled: boolean;
  settings: AppSettings;
  /**
   * Callback wenn ein solve fertig (state: stopped) — mit final time,
   * penalty und (optional) per-phase split-times.
   * Phasen-Zeiten sind RELATIV (Phase-Dauer), nicht kumulativ.
   */
  onComplete?: (
    finalMs: number,
    penalty: TimerPenalty,
    splitTimesMs: number[] | null,
  ) => void;
}

export function useSpacebarTimer(opts: Options): SpacebarTimerResult {
  const { enabled, settings, onComplete } = opts;
  const [state, setState] = useState<TimerState>("idle");
  const [displayMs, setDisplayMs] = useState(0);
  const [inspectionLeftMs, setInspectionLeftMs] = useState(0);
  const [penalty, setPenalty] = useState<TimerPenalty>("none");
  // Phase 8.2 Multi-Phase
  const [splits, setSplits] = useState<number[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Refs für state-machine — useRef vermeidet stale-closure in keydown-handler
  const stateRef = useRef<TimerState>("idle");
  const inspectionStartRef = useRef<number>(0);
  const holdStartRef = useRef<number>(0);
  const runStartRef = useRef<number>(0);
  const tickIdRef = useRef<number | null>(null);
  const playedWarn8Ref = useRef(false);
  const playedWarn12Ref = useRef(false);
  // Multi-Phase: kumulative split-times (vom Start in ms) der bereits
  // abgeschlossenen Phasen. length = aktuelle Phase die noch laeuft.
  const splitsRef = useRef<number[]>([]);
  // Inspection double-tap detection: erster Press schedulet single-tap
  // mit Latenz, zweiter Press im Fenster cancelt + reset Inspection.
  const lastInspectionPressRef = useRef<number>(0);
  const pendingSingleTapTimeoutRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    stateRef.current = "idle";
    setState("idle");
    setDisplayMs(0);
    setInspectionLeftMs(0);
    setPenalty("none");
    setSplits([]);
    setPhaseIndex(0);
    splitsRef.current = [];
    playedWarn8Ref.current = false;
    playedWarn12Ref.current = false;
    lastInspectionPressRef.current = 0;
    if (pendingSingleTapTimeoutRef.current !== null) {
      window.clearTimeout(pendingSingleTapTimeoutRef.current);
      pendingSingleTapTimeoutRef.current = null;
    }
    if (tickIdRef.current !== null) {
      cancelAnimationFrame(tickIdRef.current);
      tickIdRef.current = null;
    }
  }, []);

  // RAF-tick für running + inspection countdown
  useEffect(() => {
    if (state !== "running" && state !== "inspection") return;
    let mounted = true;
    function tick() {
      if (!mounted) return;
      const now = performance.now();
      if (stateRef.current === "running") {
        setDisplayMs(now - runStartRef.current);
      } else if (stateRef.current === "inspection") {
        const elapsed = now - inspectionStartRef.current;
        const total = settings.inspection_seconds * 1000;
        const left = total - elapsed;
        setInspectionLeftMs(Math.max(0, left));
        // Sound-warnings: je nach inspection_audio_mode (Phase W.voice-alert,
        // 2026-05-17) Sinus-Beep oder Voice-Alert via TTS. "off" overridet
        // den Sound-Toggle für diese spezifischen Warnings (User kann
        // Inspection-Calls separat ausschalten ohne den Solve-Stop-Sound).
        const audioMode = settings.inspection_audio_mode ?? "beep";
        const audioActive =
          settings.sound_enabled && audioMode !== "off";
        if (audioActive && !playedWarn8Ref.current && elapsed >= 8000) {
          if (audioMode === "de" || audioMode === "en") {
            speakInspectionWarn8s(audioMode);
          } else {
            playInspectionWarn8s();
          }
          playedWarn8Ref.current = true;
        }
        if (audioActive && !playedWarn12Ref.current && elapsed >= 12000) {
          if (audioMode === "de" || audioMode === "en") {
            speakInspectionWarn12s(audioMode);
          } else {
            playInspectionWarn12s();
          }
          playedWarn12Ref.current = true;
        }
        if (settings.inspection_mode === "wca") {
          // WCA: Penalty live setzen, NICHT auto-DNFen — User soll
          // weiter Space druecken können, Penalty bleibt für Save.
          if (elapsed > 17000) setPenalty("DNF");
          else if (elapsed > 15000) setPenalty("+2");
          // Safety: nach 30s ohne reaktion stop the show, Auto-DNF
          if (elapsed > 30000) {
            stateRef.current = "stopped";
            setState("stopped");
            setDisplayMs(0);
            setInspectionLeftMs(0);
            setPenalty("DNF");
            if (onComplete) onComplete(0, "DNF", null);
          }
        } else {
          // PRAGMATIC: Auto-DNF bei Countdown 0
          if (left <= 0) {
            if (pendingSingleTapTimeoutRef.current !== null) {
              window.clearTimeout(pendingSingleTapTimeoutRef.current);
              pendingSingleTapTimeoutRef.current = null;
            }
            stateRef.current = "stopped";
            setState("stopped");
            setDisplayMs(0);
            setInspectionLeftMs(0);
            setPenalty("DNF");
            if (onComplete) onComplete(0, "DNF", null);
          }
        }
      }
      tickIdRef.current = requestAnimationFrame(tick);
    }
    tickIdRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (tickIdRef.current !== null) {
        cancelAnimationFrame(tickIdRef.current);
        tickIdRef.current = null;
      }
    };
  }, [
    state,
    settings.inspection_seconds,
    settings.sound_enabled,
    settings.inspection_audio_mode,
    settings.inspection_mode,
    onComplete,
  ]);

  // Keydown / Keyup handlers — nur aktiv wenn enabled
  useEffect(() => {
    if (!enabled) return;

    function isTypingTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }

    function handleDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      // Verhindern dass Space scrollt
      e.preventDefault();
      // Repeated-keypress (browser-autorepeat) ignorieren
      if (e.repeat) return;
      primeAudio();

      const cur = stateRef.current;

      if (cur === "idle") {
        if (settings.inspection_enabled) {
          // Inspection starten
          inspectionStartRef.current = performance.now();
          playedWarn8Ref.current = false;
          playedWarn12Ref.current = false;
          stateRef.current = "inspection";
          setState("inspection");
          setInspectionLeftMs(settings.inspection_seconds * 1000);
        } else {
          // Direkt in „ready" (User haelt space)
          holdStartRef.current = performance.now();
          stateRef.current = "ready";
          setState("ready");
        }
        return;
      }

      if (cur === "inspection") {
        // Verhalten je nach inspection_mode (siehe lib/settings.ts).
        if (settings.inspection_mode === "wca") {
          // WCA-Standard: Single Space → in ready (User haelt jetzt
          // Space). Penalty wird im RAF-tick basierend auf inspection-
          // elapsed gesetzt (oder hier nochmal als sicherheits-set).
          const elapsed = performance.now() - inspectionStartRef.current;
          if (elapsed > 17000) setPenalty("DNF");
          else if (elapsed > 15000) setPenalty("+2");
          holdStartRef.current = performance.now();
          stateRef.current = "ready";
          setState("ready");
          return;
        }

        // PRAGMATIC: Single-Tap (mit Latency) startet Solve;
        // Double-Tap resettet Inspection.
        const DOUBLE_TAP_WINDOW_MS = 250;
        const now = performance.now();
        const sinceLast = now - lastInspectionPressRef.current;

        if (
          sinceLast < DOUBLE_TAP_WINDOW_MS &&
          pendingSingleTapTimeoutRef.current !== null
        ) {
          // DOUBLE TAP: pending single-tap cancelen + Inspection neu starten
          window.clearTimeout(pendingSingleTapTimeoutRef.current);
          pendingSingleTapTimeoutRef.current = null;
          inspectionStartRef.current = performance.now();
          playedWarn8Ref.current = false;
          playedWarn12Ref.current = false;
          setInspectionLeftMs(settings.inspection_seconds * 1000);
          lastInspectionPressRef.current = 0; // Triple-Tap zurueckfallen
          return;
        }

        // FIRST PRESS: Single-tap-Action mit Verzoegerung schedulen
        lastInspectionPressRef.current = now;
        pendingSingleTapTimeoutRef.current = window.setTimeout(() => {
          pendingSingleTapTimeoutRef.current = null;
          // Single-tap: Solve starten — aber nur wenn wir noch in
          // inspection sind (sonst hat z.B. Auto-DNF schon getriggered)
          if (stateRef.current !== "inspection") return;
          runStartRef.current = performance.now();
          stateRef.current = "running";
          setState("running");
          setDisplayMs(0);
          setInspectionLeftMs(0);
        }, DOUBLE_TAP_WINDOW_MS);
        return;
      }

      if (cur === "running") {
        // Space-press während running:
        //   - splits_enabled UND noch eine Phase uebrig → Split registrieren, weiter laufen
        //   - sonst → stop
        const now = performance.now();
        const cumulativeMs = Math.round(now - runStartRef.current);
        const totalPhases = settings.splits_enabled
          ? Math.max(1, settings.phase_names.length)
          : 1;
        const completedPhases = splitsRef.current.length;
        const isFinalPhase = completedPhases + 1 >= totalPhases;

        if (settings.splits_enabled && !isFinalPhase) {
          // Phase abgeschlossen, weiter zur nächsten — stay in running
          splitsRef.current = [...splitsRef.current, cumulativeMs];
          setSplits(splitsRef.current);
          setPhaseIndex(splitsRef.current.length);
          // displayMs tickt weiter; we don't reset, total cumulative time ist sichtbar
          return;
        }

        // Stop
        stateRef.current = "stopped";
        setState("stopped");
        setDisplayMs(cumulativeMs);
        // Final splits = previous splits + this terminal time (cumulative).
        // Wir konvertieren am Ende zu RELATIVEN phase-durations für onComplete.
        const finalCumulative = settings.splits_enabled
          ? [...splitsRef.current, cumulativeMs]
          : null;
        const phaseDurations = finalCumulative
          ? finalCumulative.map((v, i) =>
              i === 0 ? v : v - finalCumulative[i - 1],
            )
          : null;
        if (onComplete) onComplete(cumulativeMs, penalty, phaseDurations);
        return;
      }
    }

    function handleUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      const cur = stateRef.current;

      if (cur === "ready") {
        // User hat space losgelassen — pruefe ob lange genug gehalten
        const heldMs = performance.now() - holdStartRef.current;
        if (heldMs >= settings.hold_time_ms) {
          // Long enough → start running
          runStartRef.current = performance.now();
          stateRef.current = "running";
          setState("running");
          setDisplayMs(0);
        } else {
          // Zu kurz → zurück zu idle (mit Penalty falls aus inspection)
          // Wenn aus inspection mit penalty: bleibt der penalty erhalten
          stateRef.current = "idle";
          setState("idle");
          setInspectionLeftMs(0);
        }
        return;
      }

      if (cur === "holding") {
        // (Nicht im aktuellen Flow benutzt — wir gehen ready → running direkt)
        runStartRef.current = performance.now();
        stateRef.current = "running";
        setState("running");
        setDisplayMs(0);
        return;
      }
    }

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [enabled, settings, onComplete, penalty]);

  return {
    state,
    displayMs,
    inspectionLeftMs,
    penalty,
    splits,
    phaseIndex,
    reset,
  };
}

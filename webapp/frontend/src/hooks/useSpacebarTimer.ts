// useSpacebarTimer (Phase 8.2) — der WCA-Standard-Spacebar-Flow
// als wiederverwendbarer React-Hook.
//
// State-Machine:
//   idle       → User druckt Space → (inspection_enabled ? inspection : ready)
//   inspection → 15s countdown, sound bei 8s + 12s; Space-press während
//                inspection → ready/holding
//   ready      → Space-up zwischendurch nicht erlaubt; nach hold_time_ms
//                gehts in „holding" (visuell green = go)
//   holding    → User lässt Space los → running, timer startet
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
  /**
   * W.timer-keep-last-time (2026-05-31): wenn true, startet ein Space-/Tap-
   * Druck im `stopped`-State direkt den nächsten Solve, statt nichts zu tun.
   * Der Hook putzt dabei Penalty/Splits/Zeit des letzten Solves. Damit kann
   * der Caller die zuletzt gestoppte Zeit stehen lassen (kein reset() nach
   * dem Save) — sie bleibt sichtbar, bis der User den nächsten Solve startet.
   * Default false → bestehende Aufrufer (DrillCard) unverändert: dort resettet
   * der Caller wie gehabt direkt nach dem Save.
   */
  restartFromStopped?: boolean;
  /**
   * W.hold-to-inspect (2026-06-03): wenn true, startet die Inspektion am
   * idle/stopped-State NICHT per Tap, sondern erst nach ~1s Halten (kurzer Tap
   * = nichts → verhindert versehentliche Inspektions-Starts). Gedacht für Touch
   * (Tap auf Timer/Button); Desktop-Spacebar lässt es false → Sofort-Start
   * (WCA-Standard). Greift nur wenn settings.inspection_enabled. Default false.
   */
  holdToStartInspection?: boolean;
}

// W.hold-to-inspect: Haltedauer (ms) am idle/stopped-State, ab der die
// Inspektion startet (Touch). Darunter = Tap, löst nichts aus.
// 2026-06-03: User-Wunsch 1000 → 500 ms (schneller, weniger „träge").
const INSPECTION_HOLD_MS = 500;

export function useSpacebarTimer(opts: Options): SpacebarTimerResult {
  const {
    enabled,
    settings,
    onComplete,
    restartFromStopped = false,
    holdToStartInspection = false,
  } = opts;
  const [state, setState] = useState<TimerState>("idle");
  const [displayMs, setDisplayMs] = useState(0);
  const [inspectionLeftMs, setInspectionLeftMs] = useState(0);
  const [penalty, setPenalty] = useState<TimerPenalty>("none");
  // Phase 8.2 Multi-Phase
  const [splits, setSplits] = useState<number[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Refs für state-machine — useRef vermeidet stale-closure in keydown-handler
  const stateRef = useRef<TimerState>("idle");
  // W.timer-keep-last-time: Ref statt Closure, damit der keydown-Handler den
  // aktuellen Wert sieht ohne neu zu subscriben.
  const restartFromStoppedRef = useRef(restartFromStopped);
  restartFromStoppedRef.current = restartFromStopped;
  // W.hold-to-inspect: Ref-Spiegel + Timer für den Vor-Inspektion-Hold.
  const holdToStartInspectionRef = useRef(holdToStartInspection);
  holdToStartInspectionRef.current = holdToStartInspection;
  const inspectionHoldTimeoutRef = useRef<number | null>(null);
  // Aus welchem State der Hold startete (idle/stopped) — für Abbruch-Restore.
  const holdOriginRef = useRef<TimerState>("idle");
  // QA W.timer-keep-last-time: penalty zusätzlich als Ref spiegeln (siehe
  // Sync-Effect unten). Der keydown-Handler liest beim Stop penaltyRef.current,
  // damit `penalty` NICHT in der Listener-Dep-Liste stehen muss — sonst würden
  // die Listener bei jedem WCA-Overrun-Penalty-Tick neu subscriben und ein
  // Keydown könnte im Re-Subscribe-Fenster verloren gehen.
  const penaltyRef = useRef<TimerPenalty>("none");
  const inspectionStartRef = useRef<number>(0);
  const holdStartRef = useRef<number>(0);
  const runStartRef = useRef<number>(0);
  const tickIdRef = useRef<number | null>(null);
  const playedWarn8Ref = useRef(false);
  const playedWarn12Ref = useRef(false);
  // Multi-Phase: kumulative split-times (vom Start in ms) der bereits
  // abgeschlossenen Phasen. length = aktuelle Phase die noch läuft.
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
    penaltyRef.current = "none";
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
    if (inspectionHoldTimeoutRef.current !== null) {
      window.clearTimeout(inspectionHoldTimeoutRef.current);
      inspectionHoldTimeoutRef.current = null;
    }
    holdOriginRef.current = "idle";
    if (tickIdRef.current !== null) {
      cancelAnimationFrame(tickIdRef.current);
      tickIdRef.current = null;
    }
  }, []);

  // QA W.timer-keep-last-time: penaltyRef synchron zum penalty-State halten,
  // damit der keydown-Handler beim Stop den aktuellen Penalty liest, ohne dass
  // `penalty` in der Listener-Dep-Liste steht.
  useEffect(() => {
    penaltyRef.current = penalty;
  }, [penalty]);

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
          // weiter Space drücken können, Penalty bleibt für Save.
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

      if (cur === "idle" || (restartFromStoppedRef.current && cur === "stopped")) {
        // W.hold-to-inspect (2026-06-03, Touch): Inspektion startet NICHT per
        // Tap, sondern erst nach INSPECTION_HOLD_MS Halten. Kurzer Tap → nichts.
        // Cleanup (falls aus stopped) + State-Wechsel passieren ERST wenn der
        // Hold durchläuft (im Timeout) — so bleibt die zuletzt gestoppte Zeit
        // während des Haltens stehen und ein abgebrochener Tap verändert nichts.
        // Nur Touch + Inspektion-an; Desktop / Inspektion-aus → Sofort-Pfad unten.
        if (settings.inspection_enabled && holdToStartInspectionRef.current) {
          holdOriginRef.current = cur === "stopped" ? "stopped" : "idle";
          stateRef.current = "holding";
          setState("holding");
          if (inspectionHoldTimeoutRef.current !== null) {
            window.clearTimeout(inspectionHoldTimeoutRef.current);
          }
          inspectionHoldTimeoutRef.current = window.setTimeout(() => {
            inspectionHoldTimeoutRef.current = null;
            if (stateRef.current !== "holding") return;
            if (holdOriginRef.current === "stopped") {
              // Vorgänger-Solve putzen (analog Sofort-Pfad unten).
              setPenalty("none");
              penaltyRef.current = "none";
              setSplits([]);
              setPhaseIndex(0);
              splitsRef.current = [];
              setDisplayMs(0);
            }
            inspectionStartRef.current = performance.now();
            playedWarn8Ref.current = false;
            playedWarn12Ref.current = false;
            stateRef.current = "inspection";
            setState("inspection");
            setInspectionLeftMs(settings.inspection_seconds * 1000);
          }, INSPECTION_HOLD_MS);
          return;
        }
        // W.timer-keep-last-time: aus „stopped" kommend den letzten Solve-
        // State putzen, damit der neue Solve frisch startet (Penalty/Splits/
        // Zeit des Vorgängers nicht übernehmen). Die zuletzt gestoppte Zeit
        // blieb bis zu diesem Druck sichtbar — jetzt geht sie auf 0.00 /
        // Inspection (= „reset to 0.00 when next solve started").
        if (cur === "stopped") {
          setPenalty("none");
          penaltyRef.current = "none";
          setSplits([]);
          setPhaseIndex(0);
          splitsRef.current = [];
          setDisplayMs(0);
          // QA: Warn-Refs zurücksetzen, sonst spielt die nächste Inspection
          // (direkt aus stopped gestartet) keine 8s/12s-Sounds.
          playedWarn8Ref.current = false;
          playedWarn12Ref.current = false;
        }
        if (settings.inspection_enabled) {
          // Inspection starten
          inspectionStartRef.current = performance.now();
          playedWarn8Ref.current = false;
          playedWarn12Ref.current = false;
          stateRef.current = "inspection";
          setState("inspection");
          setInspectionLeftMs(settings.inspection_seconds * 1000);
        } else {
          // Direkt in „ready" (User hält space)
          holdStartRef.current = performance.now();
          stateRef.current = "ready";
          setState("ready");
        }
        return;
      }

      if (cur === "inspection") {
        // Verhalten je nach inspection_mode (siehe lib/settings.ts).
        if (settings.inspection_mode === "wca") {
          // WCA-Standard: Single Space → in ready (User hält jetzt
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
        //   - splits_enabled UND noch eine Phase übrig → Split registrieren, weiter laufen
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
        if (onComplete) onComplete(cumulativeMs, penaltyRef.current, phaseDurations);
        return;
      }
    }

    function handleUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      const cur = stateRef.current;

      if (cur === "ready") {
        // User hat space losgelassen — prüfe ob lange genug gehalten
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
        // W.hold-to-inspect: Vor-Inspektion-Hold vor Ablauf der 1s losgelassen
        // = Tap statt Halten → Timer abbrechen, zurück zum Ausgangs-State
        // (idle/stopped), KEINE Inspektion. (Ist der Timeout schon gefeuert,
        // sind wir nicht mehr in „holding" und landen hier nicht.)
        if (inspectionHoldTimeoutRef.current !== null) {
          window.clearTimeout(inspectionHoldTimeoutRef.current);
          inspectionHoldTimeoutRef.current = null;
        }
        const origin = holdOriginRef.current;
        stateRef.current = origin;
        setState(origin);
        return;
      }
    }

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [enabled, settings, onComplete]);

  // W.hold-to-inspect (QA KRITISCH): den Vor-Inspektion-Hold-Timeout NUR beim
  // Unmount räumen — NICHT im Listener-Effect-Cleanup oben. Der re-subscribet
  // bei jedem onComplete-/settings-Wechsel (onComplete = saveFromSpacebar ist
  // pro Render neu), u.a. genau auf dem idle→holding-Render. Würde der Cleanup
  // den Timeout killen, bliebe der Timer in „holding" hängen. reset() +
  // handleUp(holding) sind die regulären Abbruch-Stellen; der Timeout überlebt
  // Re-Subscribes (wie pendingSingleTapTimeoutRef).
  useEffect(() => {
    return () => {
      if (inspectionHoldTimeoutRef.current !== null) {
        window.clearTimeout(inspectionHoldTimeoutRef.current);
        inspectionHoldTimeoutRef.current = null;
      }
    };
  }, []);

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

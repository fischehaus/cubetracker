// User-Settings (Phase 8.2) — bewusst client-only via localStorage.
// Keine DB-Tabelle, kein Backup-Update — Speedcubing-Settings sind
// per-Geraet sinnvoll (Tastatur-Layout, Inspection-Vorliebe, Sound an/aus).
//
// Wenn das Bedarf wird (z.B. „meine Settings auf zweitem Rechner"),
// kommt eine Settings-Tabelle in Phase 8.5 dazu.
//
// Architektur: zwei Layer
//   1. SETTINGS_DEFAULTS + AppSettings-Type (statisch)
//   2. loadSettings() / saveSettings() / useAppSettings()-Hook
//      (load aus localStorage, partial-merge mit defaults, on save:
//       persist + Custom-Event so dass alle Hook-Konsumenten reagieren)
//
// Settings sind absichtlich KOMPATIBEL beim Lesen — zukuenftige Felder
// haben einen sauberen default, alte Browser sehen keinen Crash.

import { useEffect, useState } from "react";

/**
 * Inspection-Verhalten:
 *   - "wca":        WCA-Standard. Single Space waehrend Inspection geht
 *                   in ready (Hold halten → Release startet Solve).
 *                   Penalty +2 ab 15s, DNF ab 17s.
 *   - "pragmatic":  User-Trainings-Flow. Single Space waehrend Inspection
 *                   startet Solve direkt (mit 250ms Latenz fuer Double-Tap-
 *                   Erkennung). Double-Tap = Inspection-Reset. Auto-DNF
 *                   bei Countdown 0.
 */
export type InspectionMode = "wca" | "pragmatic";

/**
 * Schrift-Groesse fuer Timer + ScrambleCard. Default `lg`.
 * Wirkt auf font-size + line-height beider Karten konsistent.
 */
export type TimerFontSize = "sm" | "md" | "lg" | "xl" | "xxl";

/**
 * Audio-Modus fuer die Inspection-Warnings bei 8s + 12s.
 * Phase W.voice-alert (2026-05-17): csTimer-aequivalentes Feature.
 *
 *   "beep"  — Sinus-Toene (Status-Quo, 660Hz bei 8s, 880Hz bei 12s)
 *   "de"    — Voice-Alert auf Deutsch via Browser-TTS ("acht", "zwoelf")
 *   "en"    — Voice-Alert auf Englisch ("eight", "twelve")
 *   "off"   — kein Audio (overrides sound_enabled fuer diese Calls)
 */
export type InspectionAudioMode = "beep" | "de" | "en" | "off";

export interface AppSettings {
  /** Spacebar-Timer aktiviert (statt Tastatur-Eingabe). */
  spacebar_enabled: boolean;
  /** Inspection-Phase aktiv (WCA-Standard 15s). */
  inspection_enabled: boolean;
  /** Inspection-Dauer in Sekunden. */
  inspection_seconds: number;
  /**
   * Verhalten waehrend Inspection. „pragmatic" = User-Trainings-Flow,
   * „wca" = WCA-Wettkampf-Standard. Siehe InspectionMode-Doku.
   */
  inspection_mode: InspectionMode;
  /** Sound-Signale (Inspection-Warnings, Start/Stop). */
  sound_enabled: boolean;
  /**
   * Audio-Modus fuer die Inspection-Warnings (Phase W.voice-alert).
   * Default "beep" (Sinus wie bisher) — bestehende User merken keinen
   * Unterschied. Wer Voice-Calls will, wechselt auf "de" oder "en".
   * Greift nur wenn `sound_enabled === true`.
   */
  inspection_audio_mode: InspectionAudioMode;
  /** Hold-Time in ms bevor „go" (gruen) wird. WCA-Empfehlung 550ms. */
  hold_time_ms: number;
  /** Multi-Phase-Splits aktiviert (Variante A). 1 = klassisch ohne splits. */
  splits_enabled: boolean;
  /**
   * Phase-Namen (in Reihenfolge). Default 4-Phasen-3x3 CFOP-Konvention.
   * Anzahl entries = Anzahl splits = Anzahl Spacebar-Presses zum Stoppen.
   * Mind. 1, max. 8 (UI clipped).
   */
  phase_names: string[];
  /** Phase 8.4: Schrift-Größe für Timer + ScrambleCard. */
  timer_font_size: TimerFontSize;
  /**
   * Schrift-Größe für ALLE Drill-Fenster (aktuell: AlgTrainer-DrillCard).
   * Separat einstellbar von timer_font_size, damit User im Trainer
   * andere Größe wählen kann als im Haupt-Timer.
   */
  drill_font_size: TimerFontSize;
  /**
   * Phase W.scramble-image (2026-05-17): 2D-Net-Vorschau unter der Scramble-
   * Notation anzeigen. Default `true` — visuelle Verifikation ist Standard-
   * Erwartung an Speedcubing-Timer. Power-User koennen ausschalten wenn sie
   * pure Notation wollen.
   *
   * Aktuell nur 3x3 unterstuetzt. Andere Cubes zeigen kein Bild + werden
   * nicht durch das Setting beeinflusst.
   */
  show_scramble_image: boolean;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  spacebar_enabled: false, // erst opt-in — bestehende User verlieren nichts
  inspection_enabled: true,
  inspection_seconds: 15,
  inspection_mode: "pragmatic", // aktuelles Verhalten als Default
  sound_enabled: true,
  inspection_audio_mode: "beep",
  hold_time_ms: 550,
  splits_enabled: false,
  phase_names: ["Cross", "F2L", "OLL", "PLL"], // 3x3-CFOP default
  timer_font_size: "xxl",
  drill_font_size: "xxl",
  show_scramble_image: true,
};

/**
 * Tailwind-style font-size + line-height pro TimerFontSize-Stufe.
 * Wird vom ScrambleCard, BigTimerInput, SpacebarTimerCard inline
 * gesetzt — wir vermeiden CSS-Variables fuer Build-Einfachheit.
 */
export const TIMER_FONT_SCALE: Record<TimerFontSize, { timer: string; scramble: string }> = {
  sm: { timer: "3rem", scramble: "1rem" },
  md: { timer: "4rem", scramble: "1.125rem" },
  lg: { timer: "5rem", scramble: "1.25rem" },
  xl: { timer: "6.5rem", scramble: "1.5rem" },
  xxl: { timer: "8rem", scramble: "1.875rem" },
};

export const FONT_SIZE_LABELS: Record<TimerFontSize, string> = {
  sm: "Klein",
  md: "Mittel",
  lg: "Groß",
  xl: "Sehr groß",
  xxl: "XXL",
};

const STORAGE_KEY = "cubetracker.settings.v1";
const CHANGE_EVENT = "cubetracker:settings-changed";

/**
 * Liest aus localStorage + merged partial mit defaults.
 * Defensive: bei JSON-parse-error oder fehlender feldern → defaults.
 *
 * Touch-Device-Default-Override (2026-05-14): bei FRISCHEM localStorage
 * (= erstes App-Laden) wird auf Touch-Geraeten der WCA-Spacebar-Modus
 * als Default gesetzt. Soft-Keyboard fuer Text-Eingabe waere muehsam.
 * Sobald der User eigene Settings hat (parsed != null), bleiben die
 * unangetastet — keine Migration, kein Reset.
 */
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return SETTINGS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const isTouch =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      if (isTouch) {
        return {
          ...SETTINGS_DEFAULTS,
          spacebar_enabled: true,
          inspection_mode: "wca",
        };
      }
      return SETTINGS_DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

/**
 * Persistiert + benachrichtigt alle Listener (useAppSettings).
 */
export function saveSettings(next: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  } catch {
    // localStorage kann blockiert sein (private mode etc.) — ignorieren
  }
}

/**
 * Hook fuer Konsumenten: liefert aktuelle settings + Setter.
 * Reagiert auf andere Tabs/Komponenten via custom-event.
 */
export function useAppSettings(): [AppSettings, (next: AppSettings) => void] {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    function onChange(e: Event) {
      const ce = e as CustomEvent<AppSettings>;
      setSettings(ce.detail);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  function update(next: AppSettings) {
    setSettings(next);
    saveSettings(next);
  }

  return [settings, update];
}

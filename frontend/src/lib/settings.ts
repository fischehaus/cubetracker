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

export interface AppSettings {
  /** Spacebar-Timer aktiviert (statt Tastatur-Eingabe). */
  spacebar_enabled: boolean;
  /** Inspection-Phase aktiv (WCA-Standard 15s). */
  inspection_enabled: boolean;
  /** Inspection-Dauer in Sekunden. */
  inspection_seconds: number;
  /** Sound-Signale (Inspection-Warnings, Start/Stop). */
  sound_enabled: boolean;
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
}

export const SETTINGS_DEFAULTS: AppSettings = {
  spacebar_enabled: false, // erst opt-in — bestehende User verlieren nichts
  inspection_enabled: true,
  inspection_seconds: 15,
  sound_enabled: true,
  hold_time_ms: 550,
  splits_enabled: false,
  phase_names: ["Cross", "F2L", "OLL", "PLL"], // 3x3-CFOP default
};

const STORAGE_KEY = "cubetracker.settings.v1";
const CHANGE_EVENT = "cubetracker:settings-changed";

/**
 * Liest aus localStorage + merged partial mit defaults.
 * Defensive: bei JSON-parse-error oder fehlender feldern → defaults.
 */
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return SETTINGS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SETTINGS_DEFAULTS;
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

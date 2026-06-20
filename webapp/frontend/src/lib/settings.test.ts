// @vitest-environment happy-dom
//
// Tests für die Settings-Persistenz — Fokus W.timer-input-source:
// Backwards-Compat (alter localStorage-Blob ohne das Feld) + der defensive
// Clamp gegen korrupte/fremde Werte. happy-dom liefert window.localStorage.

import { describe, it, expect, beforeEach } from "vitest";
import { loadSettings, saveSettings, SETTINGS_DEFAULTS } from "./settings";

const STORAGE_KEY = "cubetracker.settings.v1";

describe("loadSettings — timer_input_source (W.timer-input-source)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("alter Blob OHNE timer_input_source → Default 'keyboard' (Spread-Compat)", () => {
    // Simuliert einen vor dem Feature gespeicherten Settings-Blob.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ spacebar_enabled: true, inspection_seconds: 17 }),
    );
    const s = loadSettings();
    expect(s.timer_input_source).toBe("keyboard");
    // Bestehende Felder überleben den Merge unverändert.
    expect(s.spacebar_enabled).toBe(true);
    expect(s.inspection_seconds).toBe(17);
  });

  it("korrupter/fremder Wert → Clamp auf 'keyboard'", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ timer_input_source: "stakmat" }), // Tippfehler
    );
    expect(loadSettings().timer_input_source).toBe("keyboard");
  });

  it("Roundtrip: gespeichertes 'stackmat' kommt als 'stackmat' zurück", () => {
    saveSettings({ ...SETTINGS_DEFAULTS, timer_input_source: "stackmat" });
    expect(loadSettings().timer_input_source).toBe("stackmat");
  });

  it("malformed JSON → SETTINGS_DEFAULTS (timer_input_source 'keyboard')", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ kein valides json");
    expect(loadSettings().timer_input_source).toBe("keyboard");
  });

  it("SETTINGS_DEFAULTS hat das Feld als 'keyboard'", () => {
    expect(SETTINGS_DEFAULTS.timer_input_source).toBe("keyboard");
  });
});

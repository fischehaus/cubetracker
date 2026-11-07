// Tests für die feste/automatische Session-/Hardware-Auswahl (Roadmap #49).

import { describe, expect, it } from "vitest";
import { SETTINGS_DEFAULTS, type AppSettings } from "./settings";
import {
  AUTO_SELECTION,
  cubeTypesWithFixedSelection,
  getFixedSelection,
  resolveSelection,
  withSelection,
} from "./timer-selection";

const base: AppSettings = { ...SETTINGS_DEFAULTS, fixed_selection_by_cube: {} };

describe("getFixedSelection", () => {
  it("ohne Eintrag → Auto", () => {
    expect(getFixedSelection(base, "3x3")).toEqual(AUTO_SELECTION);
  });

  it("kaputte Werte aus localStorage → Auto/null statt Crash", () => {
    const s = {
      ...base,
      fixed_selection_by_cube: {
        "3x3": {
          session_mode: "bogus",
          session_id: "7",
          hardware_mode: "fixed",
          hardware_id: 2.5,
        },
      },
    } as unknown as AppSettings;
    expect(getFixedSelection(s, "3x3")).toEqual({
      session_mode: "auto",
      session_id: null,
      hardware_mode: "fixed",
      hardware_id: null,
    });
  });
});

describe("withSelection", () => {
  it("setzt nur den gewählten Teil und nur für den Cube-Typ", () => {
    const s = withSelection(base, "3x3", "session", "fixed", 5);
    expect(getFixedSelection(s, "3x3")).toMatchObject({
      session_mode: "fixed",
      session_id: 5,
      hardware_mode: "auto",
    });
    expect(getFixedSelection(s, "2x2")).toEqual(AUTO_SELECTION);
  });

  it("zurück auf Auto entfernt den Eintrag, wenn beide Teile Auto sind", () => {
    let s = withSelection(base, "3x3", "hardware", "fixed", 9);
    s = withSelection(s, "3x3", "hardware", "auto", null);
    expect(s.fixed_selection_by_cube).toEqual({});
  });

  it("Auto-Modus verwirft eine mitgegebene ID", () => {
    const s = withSelection(base, "Skewb", "session", "auto", 4);
    expect(s.fixed_selection_by_cube).toEqual({});
  });
});

describe("resolveSelection", () => {
  it("Auto bleibt Auto", () => {
    expect(resolveSelection("auto", 3, [3])).toEqual({ kind: "auto" });
  });

  it("feste ID vorhanden → fixed", () => {
    expect(resolveSelection("fixed", 3, [1, 3])).toEqual({
      kind: "fixed",
      id: 3,
    });
  });

  it("fest auf „keine“ (null) → fixed null, auch ohne Liste", () => {
    expect(resolveSelection("fixed", null, [])).toEqual({
      kind: "fixed",
      id: null,
    });
  });

  it("feste ID gelöscht → fixed-missing (Timer fällt auf Auto zurück)", () => {
    expect(resolveSelection("fixed", 3, [1, 2])).toEqual({
      kind: "fixed-missing",
    });
  });

  it("Liste lädt noch → fixed ohne Prüfung", () => {
    expect(resolveSelection("fixed", 3, undefined)).toEqual({
      kind: "fixed",
      id: 3,
    });
  });
});

describe("cubeTypesWithFixedSelection", () => {
  it("listet nur Typen mit mindestens einem festen Teil", () => {
    let s = withSelection(base, "3x3", "session", "fixed", 1);
    s = withSelection(s, "Pyraminx", "hardware", "fixed", 2);
    expect(cubeTypesWithFixedSelection(s).sort()).toEqual(["3x3", "Pyraminx"]);
  });
});

describe("Robustheit ohne Feld", () => {
  it("Settings ohne fixed_selection_by_cube crashen nicht", () => {
    const s = { ...base } as Partial<AppSettings>;
    delete s.fixed_selection_by_cube;
    const settings = s as AppSettings;
    expect(getFixedSelection(settings, "3x3")).toEqual(AUTO_SELECTION);
    expect(cubeTypesWithFixedSelection(settings)).toEqual([]);
    expect(
      getFixedSelection(
        withSelection(settings, "3x3", "session", "fixed", 1),
        "3x3",
      ).session_id,
    ).toBe(1);
  });
});

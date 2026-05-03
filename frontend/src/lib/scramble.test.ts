// @vitest-environment happy-dom
//
// scrambow's UMD-Bundle setzt self.scrambow als Side-Effect beim Modul-Load.
// Im default-Node-Environment fehlen self/window → UMD crasht beim Eval.
// happy-dom liefert beide (leichter als jsdom) → UMD installiert scrambow
// korrekt → Tests gruen.

import { describe, expect, it } from "vitest";
import {
  cubeTypeToScrambowType,
  generateScramble,
  isAlgTrainerSubset,
  resolveScrambleTypeOverride,
} from "./scramble";

describe("cubeTypeToScrambowType", () => {
  it("maps WCA-events", () => {
    expect(cubeTypeToScrambowType("3x3")).toBe("333");
    expect(cubeTypeToScrambowType("2x2")).toBe("222");
    expect(cubeTypeToScrambowType("4x4")).toBe("444");
    expect(cubeTypeToScrambowType("5x5")).toBe("555");
    expect(cubeTypeToScrambowType("6x6")).toBe("666");
    expect(cubeTypeToScrambowType("7x7")).toBe("777");
  });
  it("maps non-NxN events", () => {
    expect(cubeTypeToScrambowType("Pyraminx")).toBe("pyraminx");
    expect(cubeTypeToScrambowType("Skewb")).toBe("skewb");
    expect(cubeTypeToScrambowType("Square-1")).toBe("square-1");
    expect(cubeTypeToScrambowType("Megaminx")).toBe("megaminx");
    expect(cubeTypeToScrambowType("Clock")).toBe("clock");
  });
  it("OH and 3BLD use 3x3 scrambles", () => {
    expect(cubeTypeToScrambowType("OH")).toBe("333");
    expect(cubeTypeToScrambowType("3BLD")).toBe("333");
  });
  it("unknown type falls back to 333", () => {
    expect(cubeTypeToScrambowType("DefinitelyNotACube")).toBe("333");
  });
});

describe("resolveScrambleTypeOverride (Phase 8.1 bugfix)", () => {
  it("empty string = no override", () => {
    expect(resolveScrambleTypeOverride("")).toBeNull();
    expect(resolveScrambleTypeOverride("   ")).toBeNull();
  });

  it("csTimer WCA-codes map to scrambow codes", () => {
    expect(resolveScrambleTypeOverride("444wca")).toBe("444");
    expect(resolveScrambleTypeOverride("555wca")).toBe("555");
    expect(resolveScrambleTypeOverride("666wca")).toBe("666");
    expect(resolveScrambleTypeOverride("777wca")).toBe("777");
    expect(resolveScrambleTypeOverride("222so")).toBe("222");
    expect(resolveScrambleTypeOverride("pyrso")).toBe("pyraminx");
    expect(resolveScrambleTypeOverride("skbso")).toBe("skewb");
    expect(resolveScrambleTypeOverride("sqrs")).toBe("square-1");
    expect(resolveScrambleTypeOverride("mgmp")).toBe("megaminx");
    expect(resolveScrambleTypeOverride("clkwca")).toBe("clock");
  });

  it("3x3-variants all map to 333", () => {
    expect(resolveScrambleTypeOverride("333wca")).toBe("333");
    expect(resolveScrambleTypeOverride("333oh")).toBe("333");
    expect(resolveScrambleTypeOverride("333bld")).toBe("333");
    expect(resolveScrambleTypeOverride("333fm")).toBe("333");
  });

  it("trainer-subsets pass through", () => {
    expect(resolveScrambleTypeOverride("pll")).toBe("pll");
    expect(resolveScrambleTypeOverride("oll")).toBe("oll");
  });

  it("scrambow-codes pass through", () => {
    expect(resolveScrambleTypeOverride("333")).toBe("333");
    expect(resolveScrambleTypeOverride("pyraminx")).toBe("pyraminx");
  });

  it("unknown string returns null (caller faellt zurueck)", () => {
    expect(resolveScrambleTypeOverride("nonsense")).toBeNull();
    expect(resolveScrambleTypeOverride("PLL")).toBeNull(); // case-sensitive
  });
});

describe("isAlgTrainerSubset", () => {
  it("recognises pll/oll", () => {
    expect(isAlgTrainerSubset("pll")).toBe(true);
    expect(isAlgTrainerSubset("oll")).toBe(true);
  });
  it("rejects others", () => {
    expect(isAlgTrainerSubset("333")).toBe(false);
    expect(isAlgTrainerSubset("PLL")).toBe(false);
  });
});

describe("generateScramble (smoke)", () => {
  // Wir testen NICHT die Korrektheit der Scrambles (das ist scrambow's Job),
  // sondern dass jeder dokumentierte Typ einen non-empty string liefert.
  // Das fängt Mapping-Fehler ab (z.B. "square-1" vs "square1" vs "sq1").
  const types = [
    "333", "222", "444", "555", "666", "777",
    "pyraminx", "skewb", "square-1", "megaminx", "clock",
    "pll", "oll",
  ];
  for (const t of types) {
    it(`type "${t}" produces non-empty scramble`, () => {
      const s = generateScramble(t);
      expect(s.length).toBeGreaterThan(0);
    });
  }
});

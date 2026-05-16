// @vitest-environment happy-dom
//
// scrambow's UMD-Bundle setzt self.scrambow als Side-Effect beim Modul-Load.
// Im default-Node-Environment fehlen self/window → UMD crasht beim Eval.
// happy-dom liefert beide (leichter als jsdom) → UMD installiert scrambow
// korrekt → Tests gruen.

import { describe, expect, it } from "vitest";
import {
  cubeTypeToScrambowType,
  defaultScrambleTypeForCube,
  generateScramble,
  isAlgTrainerSubset,
  resolveScrambleTypeOverride,
  UNOFFICIAL_SCRAMBLE_TYPES,
  WCA_SCRAMBLE_TYPES,
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

describe("generateScramble — custom puzzles (Welle 3, 2026-05-16)", () => {
  // Inoffizielle Cubes: eigener Random-Move-Generator. Tests checken:
  //   1. non-empty output
  //   2. erwartete Anzahl Moves (split-by-space)
  //   3. keine direkt wiederholten Bases (Ivy "L L'" waere sinnlos)
  // Move-Counts gemaess CUSTOM_PUZZLE_SPECS in scramble.ts.
  // Ivy auf 8 reduziert (Fix 2026-05-17 — csTimer-Default).
  const cases: { type: string; minMoves: number }[] = [
    { type: "ivy", minMoves: 8 },
    { type: "gear", minMoves: 12 },
    { type: "redi", minMoves: 15 },
    { type: "master_pyraminx", minMoves: 25 },
    { type: "master_skewb", minMoves: 25 },
  ];
  for (const { type, minMoves } of cases) {
    it(`"${type}" produces a scramble with ${minMoves} moves`, () => {
      const s = generateScramble(type);
      const moves = s.split(/\s+/).filter((x) => x.length > 0);
      expect(moves.length).toBe(minMoves);
    });
    it(`"${type}" never repeats the same base move directly`, () => {
      // 100 Iterationen — QA-Fix Welle 3 (2026-05-16). Bei specs mit nur
      // 3 Bases (gear: U/R/F) ist die Trefferwahrscheinlichkeit fuer
      // zufaellige Glueckstreffer bei 10 Iterationen noch hoch genug,
      // dass ein kaputter Filter durchrutschen koennte. 100 Iterationen
      // bei <50ms Total-Laufzeit kostet nichts.
      for (let i = 0; i < 100; i++) {
        const s = generateScramble(type);
        const moves = s.split(/\s+/).filter((x) => x.length > 0);
        for (let j = 1; j < moves.length; j++) {
          // Base = Move ohne den Modifier-Suffix (' oder 2)
          const base = (m: string) => m.replace(/['2]$/, "");
          expect(base(moves[j]), `Move ${j} (${moves[j]}) sollte nicht dieselbe Base haben wie ${moves[j - 1]}`).not.toBe(base(moves[j - 1]));
        }
      }
    });
  }
  it("fto (scrambow-unterstuetzt) produces non-empty scramble", () => {
    // FTO ist von scrambow supportiert — wir routen es zu scrambow,
    // nicht zu unserem Custom-Generator.
    const s = generateScramble("fto");
    expect(s.length).toBeGreaterThan(0);
  });
});

describe("Scramble-Type-Listen + Helpers", () => {
  it("WCA_SCRAMBLE_TYPES enthaelt alle WCA-Events", () => {
    const codes = WCA_SCRAMBLE_TYPES.map((t) => t.code);
    expect(codes).toContain("333");
    expect(codes).toContain("pyraminx");
    expect(codes).toContain("clock");
  });
  it("UNOFFICIAL_SCRAMBLE_TYPES enthaelt Ivy + Gear (User-Wunsch)", () => {
    const codes = UNOFFICIAL_SCRAMBLE_TYPES.map((t) => t.code);
    expect(codes).toContain("ivy");
    expect(codes).toContain("gear");
  });
  it("defaultScrambleTypeForCube == cubeTypeToScrambowType (Convenience-Wrapper)", () => {
    expect(defaultScrambleTypeForCube("3x3")).toBe("333");
    expect(defaultScrambleTypeForCube("Pyraminx")).toBe("pyraminx");
  });
  it("resolveScrambleTypeOverride akzeptiert Custom-Puzzles", () => {
    expect(resolveScrambleTypeOverride("ivy")).toBe("ivy");
    expect(resolveScrambleTypeOverride("gear")).toBe("gear");
    expect(resolveScrambleTypeOverride("fto")).toBe("fto");
  });
});

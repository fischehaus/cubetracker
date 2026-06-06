// @vitest-environment happy-dom
//
// scrambow's UMD-Bundle setzt self.scrambow als Side-Effect beim Modul-Load.
// Im default-Node-Environment fehlen self/window → UMD crasht beim Eval.
// happy-dom liefert beide (leichter als jsdom) → UMD installiert scrambow
// korrekt → Tests grün.

import { describe, expect, it } from "vitest";
import {
  BIG_CUBE_SCRAMBLE_TYPES,
  BIG_CUBE_SPECS,
  cubeTypeToScrambowType,
  CUSTOM_PUZZLE_SPECS,
  defaultScrambleTypeForCube,
  generateBigCubeScramble,
  generateCustomScramble,
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
  it("maps big cubes 8x8-11x11", () => {
    expect(cubeTypeToScrambowType("8x8")).toBe("888");
    expect(cubeTypeToScrambowType("9x9")).toBe("999");
    expect(cubeTypeToScrambowType("10x10")).toBe("101010");
    expect(cubeTypeToScrambowType("11x11")).toBe("111111");
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

  it("unknown string returns null (caller fällt zurück)", () => {
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
    it(`type "${t}" produces non-empty scramble`, async () => {
      const s = await generateScramble(t);
      expect(s.length).toBeGreaterThan(0);
    });
  }
});

describe("generateScramble — custom puzzles (Welle 3, 2026-05-16)", () => {
  // Inoffizielle Cubes. Seit Phase W.cstimer-vendor (2026-05-17) unterteilt
  // in zwei Pfade:
  //   - csTimer-Random-State (gear/redi/master_pyraminx via vendor) →
  //     variable Move-Anzahl, optimierte Solutions. Nur "non-empty" testen.
  //   - Eigenbau-Random-Move (master_skewb) → feste Move-Anzahl gemaess
  //     CUSTOM_PUZZLE_SPECS, no-repeat-base-Filter aktiv.
  //   - ivy hat seit W.ivy-rs eigenen BFS-Solver, getestet in
  //     ivyScramble.test.ts.

  // csTimer-Pfad: variable Länge, nur non-empty + plausible Max-Länge.
  const csTimerCases = ["gear", "redi", "master_pyraminx"];
  for (const type of csTimerCases) {
    it(`"${type}" (csTimer) produces non-empty scramble`, async () => {
      const s = await generateScramble(type);
      const moves = s.split(/\s+/).filter((x) => x.length > 0);
      expect(moves.length).toBeGreaterThan(0);
      // Plausibilitaets-Obergrenze — csTimer-Random-State liefert
      // typisch ≤30 moves. >50 wäre ein Bug.
      expect(moves.length).toBeLessThan(50);
    });
  }

  // Eigenbau-Pfad (master_skewb): feste Länge + no-repeat-base.
  const randomMoveCases: { type: string; minMoves: number }[] = [
    { type: "master_skewb", minMoves: 25 },
  ];
  for (const { type, minMoves } of randomMoveCases) {
    it(`"${type}" (random-move) produces a scramble with ${minMoves} moves`, async () => {
      const s = await generateScramble(type);
      const moves = s.split(/\s+/).filter((x) => x.length > 0);
      expect(moves.length).toBe(minMoves);
    });
    it(`"${type}" (random-move) never repeats the same base move directly`, async () => {
      // 100 Iterationen — QA-Fix Welle 3 (2026-05-16). Geringe Base-Zahl
      // bei einigen Specs macht Glueckstreffer wahrscheinlich, daher viele
      // Wiederholungen.
      for (let i = 0; i < 100; i++) {
        const s = await generateScramble(type);
        const moves = s.split(/\s+/).filter((x) => x.length > 0);
        for (let j = 1; j < moves.length; j++) {
          const base = (m: string) => m.replace(/['2]$/, "");
          expect(
            base(moves[j]),
            `Move ${j} (${moves[j]}) sollte nicht dieselbe Base haben wie ${moves[j - 1]}`,
          ).not.toBe(base(moves[j - 1]));
        }
      }
    });
  }

  it("fto (scrambow-unterstützt) produces non-empty scramble", async () => {
    // FTO ist von scrambow supportiert — wir routen es zu scrambow,
    // nicht zu unserem Custom-Generator.
    const s = await generateScramble("fto");
    expect(s.length).toBeGreaterThan(0);
  });
});

describe("Random-Move-Fallback dino/floppy/tower (W.random-move-fallback, 2026-05-29)", () => {
  // Diese 3 laufen normalerweise über csTimer (APP_TO_CSTIMER). Die
  // CUSTOM_PUZZLE_SPECS-Einträge sind der Crash-Fallback (greift wenn
  // csTimer-Init fehlschlägt — sonst gab es einen leeren Scramble-String).
  // Da csTimer im Test-Env läuft, testen wir den Fallback isoliert über die
  // Spec + generateCustomScramble.
  const fallbackTypes = ["dino", "floppy", "tower"];

  for (const type of fallbackTypes) {
    it(`"${type}" hat eine Fallback-Spec in CUSTOM_PUZZLE_SPECS`, () => {
      expect(CUSTOM_PUZZLE_SPECS[type]).toBeDefined();
      expect(CUSTOM_PUZZLE_SPECS[type].moves.length).toBeGreaterThanOrEqual(2);
      expect(CUSTOM_PUZZLE_SPECS[type].length).toBeGreaterThan(0);
    });

    it(`"${type}" Fallback: korrekte Länge + kein direkt wiederholtes Base-Move`, () => {
      const spec = CUSTOM_PUZZLE_SPECS[type];
      for (let i = 0; i < 50; i++) {
        const s = generateCustomScramble(spec);
        const moves = s.split(/\s+/).filter((x) => x.length > 0);
        expect(moves.length).toBe(spec.length);
        for (let j = 1; j < moves.length; j++) {
          const base = (m: string) => m.replace(/['2]$/, "");
          expect(base(moves[j])).not.toBe(base(moves[j - 1]));
        }
      }
    });

    it(`"${type}" via generateScramble (csTimer-Pfad) liefert non-empty`, async () => {
      expect((await generateScramble(type)).length).toBeGreaterThan(0);
    });
  }
});

describe("Big Cubes 8x8-11x11 (W.big-cube-scramble, 2026-06-06)", () => {
  // csTimer-kompatibler Random-Move-Generator (megascramble.js `mega`).
  // Geprüft: Move-Anzahl (120), gültige Layer-Tokens, und die csTimer-Kern-
  // Invariante „keine zwei direkt aufeinanderfolgenden Moves auf derselben
  // Ebene" (parallele Layer derselben Achse, z.B. „U D", sind aber erlaubt —
  // anders als beim flachen no-repeat-base-Filter der kleinen Custom-Puzzles).
  const codes = ["888", "999", "101010", "111111"];
  const baseOf = (m: string) => m.replace(/(2|')$/, "");

  for (const code of codes) {
    const spec = BIG_CUBE_SPECS[code];

    it(`"${code}" hat eine Spec mit 3 Achsen + length 120`, () => {
      expect(spec).toBeDefined();
      expect(spec.axes.length).toBe(3);
      expect(spec.length).toBe(120);
    });

    it(`"${code}" erzeugt genau ${BIG_CUBE_SPECS[code].length} Moves`, () => {
      const moves = generateBigCubeScramble(spec).split(/\s+/).filter(Boolean);
      expect(moves.length).toBe(spec.length);
    });

    it(`"${code}" nutzt nur gültige Layer-Tokens`, () => {
      const validBases = new Set(spec.axes.flat());
      const moves = generateBigCubeScramble(spec).split(/\s+/).filter(Boolean);
      for (const m of moves) {
        expect(validBases.has(baseOf(m)), `"${m}" -> Base unbekannt`).toBe(true);
      }
    });

    it(`"${code}" wiederholt nie dieselbe Ebene direkt (csTimer-Invariante)`, () => {
      for (let iter = 0; iter < 30; iter++) {
        const moves = generateBigCubeScramble(spec).split(/\s+/).filter(Boolean);
        for (let j = 1; j < moves.length; j++) {
          expect(
            baseOf(moves[j]),
            `Move ${j} (${moves[j]}) == Vorgänger ${moves[j - 1]}`,
          ).not.toBe(baseOf(moves[j - 1]));
        }
      }
    });

    it(`"${code}" via generateScramble liefert 120-Move-Scramble`, async () => {
      const moves = (await generateScramble(code))
        .split(/\s+/)
        .filter(Boolean);
      expect(moves.length).toBe(120);
    });
  }

  it("erlaubt parallele Layer derselben Achse direkt nacheinander (z.B. U D)", () => {
    // Gegenprobe zur Invariante: der Generator erzwingt KEINE Achsen-
    // Abwechslung — nur „nicht dieselbe Ebene zweimal". Über viele Moves
    // müssen same-axis-Paare auftreten, sonst filtert er zu aggressiv
    // (= falsch gegenüber csTimer). QA-NICE W.big-cube-scramble.
    const spec = BIG_CUBE_SPECS["111111"];
    const axisOf = (base: string) =>
      spec.axes.findIndex((grp) => grp.includes(base));
    let sameAxisPairs = 0;
    for (let iter = 0; iter < 20; iter++) {
      const moves = generateBigCubeScramble(spec).split(/\s+/).filter(Boolean);
      for (let j = 1; j < moves.length; j++) {
        if (axisOf(baseOf(moves[j])) === axisOf(baseOf(moves[j - 1]))) {
          sameAxisPairs++;
        }
      }
    }
    expect(sameAxisPairs).toBeGreaterThan(0);
  });

  it("BIG_CUBE_SCRAMBLE_TYPES listet 8x8-11x11 mit passenden Codes", () => {
    expect(BIG_CUBE_SCRAMBLE_TYPES.map((t) => t.code)).toEqual([
      "888",
      "999",
      "101010",
      "111111",
    ]);
  });

  it("resolveScrambleTypeOverride akzeptiert Big-Cube-Codes", () => {
    expect(resolveScrambleTypeOverride("111111")).toBe("111111");
    expect(resolveScrambleTypeOverride("888")).toBe("888");
  });

  it("defaultScrambleTypeForCube mappt 11x11 -> 111111", () => {
    expect(defaultScrambleTypeForCube("11x11")).toBe("111111");
  });
});

describe("Scramble-Type-Listen + Helpers", () => {
  it("WCA_SCRAMBLE_TYPES enthält alle WCA-Events", () => {
    const codes = WCA_SCRAMBLE_TYPES.map((t) => t.code);
    expect(codes).toContain("333");
    expect(codes).toContain("pyraminx");
    expect(codes).toContain("clock");
  });
  it("UNOFFICIAL_SCRAMBLE_TYPES enthält Ivy + Gear (User-Wunsch)", () => {
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

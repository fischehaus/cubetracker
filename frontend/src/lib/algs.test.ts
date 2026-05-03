import { describe, expect, it } from "vitest";
import {
  ALG_SUBSETS,
  OLL_CASES,
  PLL_CASES,
  findCaseById,
  inverseAlg,
  scrambleForCase,
} from "./algs";

describe("inverseAlg", () => {
  it("inverts simple primes", () => {
    expect(inverseAlg("R")).toBe("R'");
    expect(inverseAlg("R'")).toBe("R");
  });

  it("preserves half-turns", () => {
    expect(inverseAlg("R2")).toBe("R2");
    expect(inverseAlg("U2")).toBe("U2");
  });

  it("normalizes R2' to R2", () => {
    expect(inverseAlg("R2'")).toBe("R2");
  });

  it("reverses order and inverts each token", () => {
    expect(inverseAlg("R U R'")).toBe("R U' R'");
    expect(inverseAlg("F R U R' U' F'")).toBe("F U R U' R' F'");
  });

  it("handles wide-moves and slice-moves identically", () => {
    expect(inverseAlg("r U r'")).toBe("r U' r'");
    expect(inverseAlg("M2 U M2")).toBe("M2 U' M2");
  });

  it("double-inversion = identity", () => {
    const sample = "R U R' U' R' F R2 U' R' U' R U R' F'";
    expect(inverseAlg(inverseAlg(sample))).toBe(sample);
  });

  it("handles extra whitespace", () => {
    expect(inverseAlg("  R   U   R'  ")).toBe("R U' R'");
  });
});

describe("PLL/OLL data", () => {
  it("has 21 PLL cases with unique ids", () => {
    expect(PLL_CASES.length).toBe(21);
    const ids = new Set(PLL_CASES.map((c) => c.id));
    expect(ids.size).toBe(21);
    expect(PLL_CASES.every((c) => c.id.startsWith("PLL-"))).toBe(true);
  });

  it("has 57 OLL cases with unique ids", () => {
    expect(OLL_CASES.length).toBe(57);
    const ids = new Set(OLL_CASES.map((c) => c.id));
    expect(ids.size).toBe(57);
    expect(OLL_CASES.every((c) => c.id.startsWith("OLL-"))).toBe(true);
  });

  it("ALG_SUBSETS exposes both subsets", () => {
    expect(ALG_SUBSETS.pll.cases.length).toBe(21);
    expect(ALG_SUBSETS.oll.cases.length).toBe(57);
  });

  it("all algs are non-empty strings", () => {
    [...PLL_CASES, ...OLL_CASES].forEach((c) => {
      expect(c.alg.trim().length).toBeGreaterThan(0);
    });
  });
});

describe("findCaseById", () => {
  it("finds known PLL", () => {
    const t = findCaseById("PLL-T");
    expect(t?.name).toBe("T-perm");
  });
  it("finds known OLL", () => {
    const o = findCaseById("OLL-21");
    expect(o?.name).toContain("OLL 21");
  });
  it("returns undefined for unknown", () => {
    expect(findCaseById("PLL-Nonsense")).toBeUndefined();
  });
});

describe("scrambleForCase", () => {
  it("without random-AUF = exact inverse", () => {
    const c = findCaseById("PLL-T")!;
    expect(scrambleForCase(c, false)).toBe(inverseAlg(c.alg));
  });
  it("with random-AUF the result starts with U-prefix or the inverse", () => {
    const c = findCaseById("PLL-T")!;
    const inv = inverseAlg(c.alg);
    const scramble = scrambleForCase(c, true);
    // Scramble is either the inv directly (no AUF) or has a U-prefix
    const validPrefixes = ["", "U ", "U2 ", "U' "];
    const matches = validPrefixes.some((p) => scramble === (p + inv).trim());
    expect(matches).toBe(true);
  });
});

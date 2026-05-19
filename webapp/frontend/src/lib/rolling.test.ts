// Tests für rollende WCA-Averages (clientseitig).

import { describe, expect, it } from "vitest";
import {
  averageOfN,
  effectiveMs,
  rollingAverages,
  trimForN,
  type SolvePoint,
} from "./rolling";

const sp = (
  time_ms: number,
  opts: { dnf?: boolean; plus_two?: boolean } = {}
): SolvePoint => ({
  time_ms,
  dnf: opts.dnf ?? false,
  plus_two: opts.plus_two ?? false,
});

describe("effectiveMs", () => {
  it("gibt time_ms ohne Strafe zurück", () => {
    expect(effectiveMs(sp(10000))).toBe(10000);
  });

  it("addiert 2000 bei +2", () => {
    expect(effectiveMs(sp(10000, { plus_two: true }))).toBe(12000);
  });

  it("liefert Infinity bei DNF", () => {
    expect(effectiveMs(sp(10000, { dnf: true }))).toBe(Infinity);
  });
});

describe("trimForN", () => {
  it("trim=0 bei n<3", () => {
    expect(trimForN(0)).toBe(0);
    expect(trimForN(2)).toBe(0);
  });

  it("trim=1 bei n=5..12", () => {
    expect(trimForN(5)).toBe(1);
    expect(trimForN(12)).toBe(1);
  });

  it("trim=floor(0.05*n) bei n>=13, mind. 1", () => {
    expect(trimForN(20)).toBe(1); // floor(1.0) = 1
    expect(trimForN(25)).toBe(1); // floor(1.25) = 1
    expect(trimForN(100)).toBe(5);
  });
});

describe("averageOfN", () => {
  it("ao5 ohne Strafen: trim 1 best + 1 worst, mean of 3", () => {
    const solves = [10000, 11000, 12000, 13000, 14000].map((t) => sp(t));
    expect(averageOfN(solves)).toBe(12000);
  });

  it("ao5 mit +2: 14000+2000=16000 wird worst, getrimmt", () => {
    const solves = [
      sp(10000),
      sp(11000),
      sp(12000),
      sp(13000),
      sp(14000, { plus_two: true }),
    ];
    expect(averageOfN(solves)).toBe(12000);
  });

  it("ao5 mit 1 DNF: DNF wird worst, getrimmt → valide", () => {
    const solves = [
      sp(10000),
      sp(11000),
      sp(12000),
      sp(13000),
      sp(99000, { dnf: true }),
    ];
    expect(averageOfN(solves)).toBe(12000);
  });

  it("ao5 mit 2 DNFs → null", () => {
    const solves = [
      sp(10000),
      sp(11000),
      sp(12000),
      sp(0, { dnf: true }),
      sp(0, { dnf: true }),
    ];
    expect(averageOfN(solves)).toBeNull();
  });

  it("ao12: trim 1, mean of 10", () => {
    const solves = Array.from({ length: 12 }, (_, i) => sp(10000 + i * 1000));
    // [10k..21k], trim 10k+21k → mean of [11k..20k] = 15500
    expect(averageOfN(solves)).toBe(15500);
  });

  it("liefert null bei < 3 Solves", () => {
    expect(averageOfN([sp(1000), sp(2000)])).toBeNull();
  });
});

describe("rollingAverages — die Kernfunktion für die Liste", () => {
  it("gibt für alle Indizes < window-1 ein null zurück", () => {
    const solves = [sp(1000), sp(2000), sp(3000), sp(4000), sp(5000)];
    const result = rollingAverages(solves, 5);
    expect(result.length).toBe(5);
    expect(result.slice(0, 4)).toEqual([null, null, null, null]);
    expect(result[4]).not.toBeNull();
  });

  it("ao5 für 7 Solves: indices 0..3 = null, 4..6 = avg des Fensters", () => {
    const solves = [
      sp(10000), // idx 0
      sp(11000), // idx 1
      sp(12000), // idx 2
      sp(13000), // idx 3
      sp(14000), // idx 4 → avg von [10..14k]
      sp(15000), // idx 5 → avg von [11..15k]
      sp(16000), // idx 6 → avg von [12..16k]
    ];
    const result = rollingAverages(solves, 5);
    expect(result[0]).toBeNull();
    expect(result[3]).toBeNull();
    expect(result[4]).toBe(12000); // [10k,11k,12k,13k,14k] → trim 10k+14k → 12k
    expect(result[5]).toBe(13000); // [11k,12k,13k,14k,15k] → trim 11k+15k → 13k
    expect(result[6]).toBe(14000); // [12k,13k,14k,15k,16k] → trim 12k+16k → 14k
  });

  it("Reihenfolge der Solves: chronologisch alt → neu, Window schaut zurück", () => {
    // Solve an Index i bekommt ao5 von [i-4..i] (also seinen eigenen + 4 vorher)
    const solves = Array.from({ length: 12 }, (_, i) => sp(10000 + i * 1000));
    const ao5 = rollingAverages(solves, 5);
    const ao12 = rollingAverages(solves, 12);

    // ao5 an Index 4: [10..14k] → 12000
    expect(ao5[4]).toBe(12000);

    // ao12 nur an Index 11 verfügbar (alle 12)
    expect(ao12[10]).toBeNull();
    expect(ao12[11]).toBe(15500);
  });

  it("wechselwirkung mit DNFs bleibt korrekt", () => {
    const solves = [
      sp(10000),
      sp(11000),
      sp(12000),
      sp(13000),
      sp(99000, { dnf: true }), // letzter ist DNF
    ];
    const ao5 = rollingAverages(solves, 5);
    expect(ao5[4]).toBe(12000); // DNF + 10000 getrimmt → mean(11,12,13)
  });
});

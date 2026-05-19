// Tests für Histogramm-Bucketing.

import { describe, expect, it } from "vitest";
import { buildHistogram, suggestBinWidthMs } from "./histogram";
import type { SolvePoint } from "./rolling";

const sp = (
  time_ms: number,
  opts: { dnf?: boolean; plus_two?: boolean } = {}
): SolvePoint => ({
  time_ms,
  dnf: opts.dnf ?? false,
  plus_two: opts.plus_two ?? false,
});

describe("suggestBinWidthMs", () => {
  it("liefert 1000 ms (1s) als Fallback bei n<2", () => {
    expect(suggestBinWidthMs(0, 0, 0)).toBe(1000);
    expect(suggestBinWidthMs(1000, 5000, 1)).toBe(1000);
  });

  it("snappt auf gängige Bucket-Werte", () => {
    // 100 Solves, 10s Spanne → sturges ~7-8 → raw ~1300ms → snap 2000
    const w = suggestBinWidthMs(10000, 20000, 100);
    expect([1000, 2000]).toContain(w);
  });
});

describe("buildHistogram", () => {
  it("liefert leeres Array bei leerem Input", () => {
    expect(buildHistogram([])).toEqual([]);
  });

  it("liefert leeres Array bei nur DNFs", () => {
    expect(buildHistogram([sp(0, { dnf: true }), sp(0, { dnf: true })])).toEqual(
      []
    );
  });

  it("bucket-zählt Solves korrekt mit fester Bin-Breite", () => {
    // 5 Solves: 9.5, 10.0, 10.5, 11.0, 11.5 sec — Bin-Breite 1s
    const solves = [9500, 10000, 10500, 11000, 11500].map((t) => sp(t));
    const bins = buildHistogram(solves, 1000);
    // Bins: [9000-10000), [10000-11000), [11000-12000)
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(5);
    // 9.5 fuellt Bin 0, 10.0+10.5 Bin 1, 11.0+11.5 Bin 2
    expect(bins[0].count).toBe(1);
    expect(bins[1].count).toBe(2);
    expect(bins[2].count).toBe(2);
  });

  it("ignoriert DNFs in der Aggregation", () => {
    const solves = [
      sp(10000),
      sp(10500),
      sp(99000, { dnf: true }),
      sp(11000),
    ];
    const bins = buildHistogram(solves, 1000);
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(3); // DNF rausgeworfen
  });

  it("rechnet +2 in die effektive Zeit ein", () => {
    // 9.5s mit +2 = 11.5s effektiv
    const solves = [sp(9500, { plus_two: true })];
    const bins = buildHistogram(solves, 1000);
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(1);
    // Der eine Bin mit count=1 sollte 11s enthalten
    const filled = bins.find((b) => b.count > 0)!;
    expect(filled.from_ms).toBeLessThanOrEqual(11500);
    expect(filled.to_ms).toBeGreaterThan(11500);
  });

  it("Label hat die erwartete Form '10.0–11.0'", () => {
    const solves = [sp(10000), sp(10500), sp(11000)];
    const bins = buildHistogram(solves, 1000);
    expect(bins[0].label).toMatch(/^\d+\.\d+–\d+\.\d+$/);
  });
});

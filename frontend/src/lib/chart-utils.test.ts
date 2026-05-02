// Tests fuer Chart-Domain-Berechnung.

import { describe, expect, it } from "vitest";
import { computeYDomain, parseSecondsToMs, percentile } from "./chart-utils";

describe("percentile", () => {
  it("liefert 0 bei leerem Array", () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it("liefert das eine Element bei n=1", () => {
    expect(percentile([42], 0.5)).toBe(42);
  });

  it("Median bei sortierter Liste", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("interpoliert linear zwischen Nachbarn", () => {
    // n=4, p=0.5 → idx = 1.5, lo=1 hi=2 → (2+3)/2 = 2.5
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
});

describe("computeYDomain — Zweck: Verlauf gut lesbar machen", () => {
  it("liefert default-domain bei leerem Input", () => {
    expect(computeYDomain([])).toEqual([0, 1000]);
  });

  it("ignoriert nulls und negative Werte", () => {
    const [lo, hi] = computeYDomain([null, undefined, -5, 10000, 11000, 12000]);
    expect(lo).toBeGreaterThan(9000);
    expect(hi).toBeLessThan(13000);
  });

  it("clipt Outliers via P2/P98 — Hauptverlauf bleibt sichtbar", () => {
    // 100 Werte um 12s + 1 ausreisser bei 120s
    const values: number[] = Array.from({ length: 100 }, (_, i) => 12000 + i * 10);
    values.push(120000); // ausreisser
    const [, hi] = computeYDomain(values);
    // hi sollte deutlich unter 120s liegen (Outlier wegclipt)
    expect(hi).toBeLessThan(20000);
  });

  it("startet NICHT bei 0, wenn alle Werte oben liegen", () => {
    const [lo, hi] = computeYDomain([10000, 10500, 11000, 11500, 12000]);
    // Wichtigste Eigenschaft: lo >> 0
    expect(lo).toBeGreaterThan(8000);
    // und hi nahe an max
    expect(hi).toBeLessThan(13000);
  });

  it("padding macht Domain ein bisschen groesser als Datenbereich", () => {
    const values = Array.from({ length: 50 }, (_, i) => 10000 + i * 100);
    // p2..p98 von 50 werten: ~10100..14800
    const [lo, hi] = computeYDomain(values, 0.05);
    expect(lo).toBeLessThan(10100);
    expect(hi).toBeGreaterThan(14800);
  });

  it("liefert minimal-spanne >= 0 bei einem einzigen Wert", () => {
    const [lo, hi] = computeYDomain([12000]);
    expect(hi).toBeGreaterThan(lo);
    expect(lo).toBeGreaterThanOrEqual(0);
  });
});

describe("parseSecondsToMs", () => {
  it("parst plain Sekunden", () => {
    expect(parseSecondsToMs("12.34")).toBe(12340);
    expect(parseSecondsToMs("15")).toBe(15000); // anders als Stackmat — hier 15s, nicht 0.15s
    expect(parseSecondsToMs("0.5")).toBe(500);
  });

  it("parst MM:SS.cc", () => {
    expect(parseSecondsToMs("1:23.45")).toBe(83450);
    expect(parseSecondsToMs("2:00")).toBe(120000);
  });

  it("liefert null bei ungueltig", () => {
    expect(parseSecondsToMs("")).toBeNull();
    expect(parseSecondsToMs("abc")).toBeNull();
    expect(parseSecondsToMs("-5")).toBeNull();
  });
});

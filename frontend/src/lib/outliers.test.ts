// Tests fuer Outlier-Detection.

import { describe, expect, it } from "vitest";
import { findOutliers, findOutliersBySession, type OutlierInput } from "./outliers";

const mk = (
  id: number,
  time_ms: number,
  cube_type: string = "3x3",
  opts: { dnf?: boolean; plus_two?: boolean } = {}
): OutlierInput => ({
  id,
  time_ms,
  cube_type,
  dnf: opts.dnf ?? false,
  plus_two: opts.plus_two ?? false,
});

describe("findOutliers — Grundverhalten", () => {
  it("liefert leeres Array bei leerem Input", () => {
    expect(findOutliers([])).toEqual([]);
  });

  it("ueberspringt Cube-Types mit < 10 Solves", () => {
    // 5 Solves, einer extrem schnell — sollte trotzdem keinen Outlier liefern,
    // weil die Median-Schaetzung bei 5 Solves zu unsicher ist.
    const solves = [mk(1, 100), mk(2, 10000), mk(3, 11000), mk(4, 12000), mk(5, 13000)];
    expect(findOutliers(solves)).toEqual([]);
  });

  it("ignoriert DNFs in der Median-Berechnung und meldet sie nicht als Outlier", () => {
    // 10 Solves um 10s, plus 1 DNF mit time_ms=99999 — DNF darf nicht als
    // Outlier auftauchen
    const solves = Array.from({ length: 10 }, (_, i) => mk(i, 10000 + i * 100));
    solves.push(mk(99, 999_999, "3x3", { dnf: true }));
    const result = findOutliers(solves);
    expect(result).toEqual([]); // weder die normalen noch die DNF taucht auf
  });
});

describe("findOutliers — too_fast", () => {
  it("findet Solve unter 30% des Medians", () => {
    // 10 normale Solves um 10s, plus 1 mit 0.67s
    const solves = Array.from({ length: 10 }, (_, i) => mk(i, 10000 + i * 100));
    solves.push(mk(100, 670)); // 0.67s
    const result = findOutliers(solves);
    expect(result).toHaveLength(1);
    expect(result[0].cube_type).toBe("3x3");
    expect(result[0].outliers).toHaveLength(1);
    expect(result[0].outliers[0].id).toBe(100);
    expect(result[0].outliers[0].reason).toBe("too_fast");
    expect(result[0].outliers[0].factor).toBeLessThan(0.3);
  });

  it("findet KEINEN Outlier bei knapp unter Median", () => {
    // 10 Solves um 10s, einer bei 5s — das ist 50% des Medians, ueber dem 30%-Schwellwert
    const solves = Array.from({ length: 10 }, (_, i) => mk(i, 10000));
    solves.push(mk(100, 5000));
    expect(findOutliers(solves)).toEqual([]);
  });
});

describe("findOutliers — too_slow", () => {
  it("findet Solve ueber 5x Median", () => {
    // 10 Solves um 10s, plus 1 mit 117 Minuten
    const solves = Array.from({ length: 10 }, (_, i) => mk(i, 10000 + i * 100));
    solves.push(mk(200, 117 * 60 * 1000));
    const result = findOutliers(solves);
    expect(result).toHaveLength(1);
    expect(result[0].outliers[0].id).toBe(200);
    expect(result[0].outliers[0].reason).toBe("too_slow");
    expect(result[0].outliers[0].factor).toBeGreaterThan(5);
  });
});

describe("findOutliers — Gruppierung nach Cube-Type", () => {
  it("erkennt Outlier pro Cube-Type unabhaengig", () => {
    // 3x3 normal um 10s, plus 1 zu schnell
    const cube3x3 = Array.from({ length: 10 }, (_, i) => mk(i, 10000 + i * 100, "3x3"));
    cube3x3.push(mk(100, 500, "3x3"));
    // 4x4 normal um 60s, einer zu langsam
    const cube4x4 = Array.from({ length: 10 }, (_, i) => mk(i + 200, 60000 + i * 100, "4x4"));
    cube4x4.push(mk(300, 60 * 60 * 1000, "4x4"));

    const result = findOutliers([...cube3x3, ...cube4x4]);
    expect(result).toHaveLength(2);
    const types = result.map((g) => g.cube_type).sort();
    expect(types).toEqual(["3x3", "4x4"]);
  });

  it("nutzt cube-spezifischen Median (Skewb 5s ist OK, fuer 3x3 Outlier)", () => {
    // Skewb median ~5s — 4s ist normal, kein Outlier
    const skewb = Array.from({ length: 10 }, (_, i) => mk(i, 4500 + i * 100, "Skewb"));
    skewb.push(mk(100, 4000, "Skewb")); // knapp unter 5s, kein Outlier
    expect(findOutliers(skewb)).toEqual([]);

    // Aber 4s in 3x3-Kontext (median 12s) — too fast (factor 0.33 ist knapp unter 0.3)
    // → bauen wir extremer:
    const cube3x3 = Array.from({ length: 10 }, (_, i) => mk(i, 12000 + i * 100, "3x3"));
    cube3x3.push(mk(200, 1000, "3x3")); // 1s in 3x3, sicher Outlier
    const result = findOutliers(cube3x3);
    expect(result).toHaveLength(1);
    expect(result[0].outliers[0].id).toBe(200);
  });
});

describe("findOutliers — Sortierung", () => {
  it("Gruppen mit mehr Outliers zuerst", () => {
    // 3x3: 2 outliers
    const cube3x3 = Array.from({ length: 10 }, (_, i) => mk(i, 10000 + i * 100, "3x3"));
    cube3x3.push(mk(100, 500, "3x3"), mk(101, 200, "3x3"));
    // 4x4: 1 outlier
    const cube4x4 = Array.from({ length: 10 }, (_, i) => mk(i + 200, 60000, "4x4"));
    cube4x4.push(mk(300, 600, "4x4"));

    const result = findOutliers([...cube3x3, ...cube4x4]);
    expect(result[0].cube_type).toBe("3x3");
    expect(result[1].cube_type).toBe("4x4");
  });
});


describe("findOutliersBySession (Phase 8.1)", () => {
  const mkS = (
    id: number,
    time_ms: number,
    session_id: number | null,
    cube_type: string = "3x3",
    opts: { dnf?: boolean } = {}
  ): OutlierInput => ({
    id,
    time_ms,
    cube_type,
    session_id,
    dnf: opts.dnf ?? false,
    plus_two: false,
  });

  it("gruppiert per session_id statt cube_type", () => {
    // Session 1: 10 normale 3x3-Solves, 1 verdaechtig
    const s1 = Array.from({ length: 10 }, (_, i) => mkS(i, 10000 + i * 100, 1));
    s1.push(mkS(100, 500, 1));
    // Session 2: 10 normale OH-Solves (langsamer), keine Outliers
    const s2 = Array.from({ length: 10 }, (_, i) => mkS(i + 200, 25000 + i * 100, 2, "OH"));

    const result = findOutliersBySession([...s1, ...s2]);
    expect(result).toHaveLength(1);
    expect(result[0].session_id).toBe(1);
    expect(result[0].outliers[0].id).toBe(100);
  });

  it("solves ohne session_id landen in 'no-session'-Gruppe", () => {
    const orphans = Array.from({ length: 10 }, (_, i) => mkS(i, 10000 + i * 100, null));
    orphans.push(mkS(100, 500, null));
    const result = findOutliersBySession(orphans);
    expect(result).toHaveLength(1);
    expect(result[0].group_key).toBe("no-session");
    expect(result[0].session_id).toBeNull();
  });

  it("session-mode trennt Cube-uebergreifend (3x3 + OH in einer Session)", () => {
    // Session 1 mischt 3x3 und OH — beim cube-mode waeren das zwei Gruppen,
    // beim session-mode eine. Median verschwimmt → andere Outlier-Detection.
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => mkS(i, 10000 + i * 100, 1, "3x3")),
      ...Array.from({ length: 5 }, (_, i) => mkS(i + 100, 25000 + i * 100, 1, "OH")),
    ];
    mixed.push(mkS(999, 200, 1, "3x3")); // verdaechtig schnell vs gemischtem Median
    const result = findOutliersBySession(mixed);
    expect(result).toHaveLength(1);
    expect(result[0].outliers.some((o) => o.id === 999)).toBe(true);
  });
});

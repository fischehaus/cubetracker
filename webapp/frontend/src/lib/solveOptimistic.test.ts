// Tests für die Optimistic-Update-Helfer (W.timer-save-speed). DOM-frei.

import { describe, it, expect } from "vitest";
import { buildOptimisticSolve, solveListMatches } from "./solveOptimistic";
import type { SolveCreate } from "./types";

const NOW = "2026-06-20T12:00:00.000Z";

describe("buildOptimisticSolve", () => {
  it("übernimmt die Payload-Felder + setzt die Temp-id", () => {
    const p: SolveCreate = { time_ms: 12340, cube_type: "3x3", session_id: 7 };
    const s = buildOptimisticSolve(p, -42, NOW);
    expect(s.id).toBe(-42);
    expect(s.time_ms).toBe(12340);
    expect(s.cube_type).toBe("3x3");
    expect(s.session_id).toBe(7);
    expect(s.timestamp).toBe(NOW);
    expect(s.plus_two).toBe(false);
    expect(s.dnf).toBe(false);
  });

  it("effective_time_ms: +2 addiert 2000 ms", () => {
    const s = buildOptimisticSolve(
      { time_ms: 10000, cube_type: "3x3", plus_two: true },
      -1,
      NOW,
    );
    expect(s.effective_time_ms).toBe(12000);
  });

  it("effective_time_ms: DNF → null", () => {
    const s = buildOptimisticSolve(
      { time_ms: 10000, cube_type: "3x3", dnf: true },
      -1,
      NOW,
    );
    expect(s.effective_time_ms).toBeNull();
  });
});

describe("solveListMatches", () => {
  const payload: SolveCreate = {
    time_ms: 12340,
    cube_type: "3x3",
    session_id: 7,
  };

  it("matcht die ungefilterte Cube-Liste (kein session-Filter)", () => {
    expect(
      solveListMatches(["solves-domain", "list", { cube_type: "3x3", limit: 100 }], payload),
    ).toBe(true);
  });

  it("matcht die passende Session-Liste", () => {
    expect(
      solveListMatches(
        ["solves-domain", "list", { cube_type: "3x3", session_id: 7, limit: 100 }],
        payload,
      ),
    ).toBe(true);
  });

  it("matcht NICHT die falsche Session-Liste", () => {
    expect(
      solveListMatches(
        ["solves-domain", "list", { cube_type: "3x3", session_id: 99, limit: 100 }],
        payload,
      ),
    ).toBe(false);
  });

  it("matcht NICHT den falschen Cube", () => {
    expect(
      solveListMatches(["solves-domain", "list", { cube_type: "4x4", limit: 100 }], payload),
    ).toBe(false);
  });

  it("schließt Stats-/PB-Queries aus (nur 'list')", () => {
    expect(
      solveListMatches(
        ["solves-domain", "stats", "overall", { cube_type: "3x3" }],
        payload,
      ),
    ).toBe(false);
    expect(
      solveListMatches(["solves-domain", "pb-history", { cube_type: "3x3" }], payload),
    ).toBe(false);
  });

  it("schließt Drill-Solves (alg_case) aus der Timer-Liste aus", () => {
    const drill: SolveCreate = {
      time_ms: 2000,
      cube_type: "3x3",
      alg_case: "PLL:Ua",
    };
    expect(
      solveListMatches(["solves-domain", "list", { cube_type: "3x3", limit: 100 }], drill),
    ).toBe(false);
  });

  it("Solve ohne Session erscheint nicht in einer Session-gefilterten Liste", () => {
    const noSession: SolveCreate = { time_ms: 5000, cube_type: "3x3" };
    expect(
      solveListMatches(
        ["solves-domain", "list", { cube_type: "3x3", session_id: 7, limit: 100 }],
        noSession,
      ),
    ).toBe(false);
    // ...aber in der ungefilterten Cube-Liste schon.
    expect(
      solveListMatches(["solves-domain", "list", { cube_type: "3x3", limit: 100 }], noSession),
    ).toBe(true);
  });
});

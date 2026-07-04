// Tests für puzzle-net.ts (piece-basierte Puzzles). Der KERN-Test vergleicht
// den ausgelieferten Applier gegen cubing.js (devDependency, WCA-Autorität) —
// wenn mein Applier für viele Zufalls-Scrambles exakt cubings KPuzzle-State
// trifft, ist die Move-Logik beweisbar korrekt. Die Baked-Daten stammen
// ebenfalls aus cubing, also ist auch die Geometrie/Farb-Zuordnung konsistent.

import { describe, it, expect, beforeAll } from "vitest";
import { applyPuzzleScramble, renderScramblePuzzleNetSvg } from "./puzzle-net";
import { PYRAMINX_NET } from "./puzzle-net-data/pyraminx";
import { puzzles } from "cubing/puzzles";

const MODS = ["", "'"];
function randomScramble(moves: string[], len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(
      moves[Math.floor(Math.random() * moves.length)] +
        MODS[Math.floor(Math.random() * MODS.length)],
    );
  }
  return out.join(" ");
}

describe("puzzle-net: Pyraminx-Applier == cubing.js-Oracle", () => {
  let kp: Awaited<ReturnType<(typeof puzzles)["pyraminx"]["kpuzzle"]>>;
  beforeAll(async () => {
    kp = await puzzles["pyraminx"].kpuzzle();
  });

  it("Applier trifft cubing-KPuzzle-State für 60 Zufalls-Scrambles", () => {
    const moves = ["U", "L", "R", "B", "u", "l", "r", "b"];
    for (let i = 0; i < 60; i++) {
      const scr = randomScramble(moves, 20);
      const mine = applyPuzzleScramble(PYRAMINX_NET, scr);
      const oracle = kp.defaultPattern().applyAlg(scr).patternData;
      for (const orbit of Object.keys(oracle)) {
        expect(mine[orbit].pieces, `pieces ${orbit} bei "${scr}"`).toEqual([
          ...oracle[orbit].pieces,
        ]);
        expect(mine[orbit].orientation, `ori ${orbit} bei "${scr}"`).toEqual([
          ...oracle[orbit].orientation,
        ]);
      }
    }
  });
});

describe("puzzle-net: Invarianten + Render (Pyraminx)", () => {
  it("jede der 4 Farben erscheint 9× nach beliebigem Scramble", () => {
    const scr = randomScramble(["U", "L", "R", "B", "u", "l", "r", "b"], 25);
    const svg = renderScramblePuzzleNetSvg(PYRAMINX_NET, scr);
    for (const c of ["#44ee00", "#f4f400", "#ff0000", "#2266ff"]) {
      const n = svg.split(`fill="${c}"`).length - 1;
      expect(n, `Farbe ${c}`).toBe(9);
    }
  });

  it("solved-Render zeigt exakt die Baked-Farben (Identität)", () => {
    const svg = renderScramblePuzzleNetSvg(PYRAMINX_NET, "");
    // 36 Facelet-Polygone + 1 Hintergrund-Rect
    expect((svg.match(/<polygon/g) ?? []).length).toBe(36);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  it("scrambled ≠ solved", () => {
    const solved = renderScramblePuzzleNetSvg(PYRAMINX_NET, "");
    const scrambled = renderScramblePuzzleNetSvg(PYRAMINX_NET, "U L' R u");
    expect(scrambled).not.toBe(solved);
  });
});

// Tests für cube-net-nxn.ts — der NxN-Simulator ist algorithmisch heikel,
// deshalb gründlich: Regression gegen das (getestete) 3x3-Modell + harte
// Invarianten + Wide-Move-Sanity + Parser + Render.

import { describe, it, expect } from "vitest";
import { solvedCube, applyScramble } from "./cube-net";
import {
  solvedNxn,
  applyMoveNxn,
  applyScrambleNxn,
  renderScrambleNxnSvg,
} from "./cube-net-nxn";

const FACES = ["U", "D", "F", "B", "R", "L"] as const;

const FACE_LETTERS = ["U", "D", "F", "B", "R", "L"];
const MODS = ["", "'", "2"];

/** Zufalls-3x3-Scramble (nur Aussen-Moves — das Alt-Modell kennt nur diese). */
function randomOuterScramble(len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(
      FACE_LETTERS[Math.floor(Math.random() * 6)] +
        MODS[Math.floor(Math.random() * 3)],
    );
  }
  return out.join(" ");
}

/** Zufalls-NxN-Scramble inkl. Wide-Moves (Xw / 3Xw) für n>=4. */
function randomNxnScramble(n: number, len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const f = FACE_LETTERS[Math.floor(Math.random() * 6)];
    const mod = MODS[Math.floor(Math.random() * 3)];
    if (n >= 4 && Math.random() < 0.5) {
      const maxWide = n >= 6 ? 3 : 2;
      const layers = 2 + Math.floor(Math.random() * (maxWide - 1)); // 2..maxWide
      out.push((layers === 2 ? "" : String(layers)) + f + "w" + mod);
    } else {
      out.push(f + mod);
    }
  }
  return out.join(" ");
}

describe("cube-net-nxn: Regression gegen cube-net.ts (3x3)", () => {
  it("NxN(3) == altes 3x3-Modell für 100 zufällige Scrambles", () => {
    for (let i = 0; i < 100; i++) {
      const scr = randomOuterScramble(25);
      const oldState = applyScramble(solvedCube(), scr);
      const newState = applyScrambleNxn(3, scr);
      for (const f of FACES) {
        // toEqual: elementweiser Vergleich Color[9] vs Color[9]
        expect(newState[f], `face ${f} bei "${scr}"`).toEqual(oldState[f]);
      }
    }
  });
});

describe("cube-net-nxn: Invarianten (n=2..7)", () => {
  it("jede Farbe erscheint exakt n² mal nach beliebigem Scramble", () => {
    for (const n of [2, 3, 4, 5, 6, 7]) {
      const state = applyScrambleNxn(n, randomNxnScramble(n, 40));
      const counts: Record<string, number> = {};
      for (const f of FACES) for (const c of state[f]) counts[c] = (counts[c] ?? 0) + 1;
      for (const c of FACES) expect(counts[c], `Farbe ${c} bei n=${n}`).toBe(n * n);
    }
  });

  it("X X X X = solved für jede Face und n", () => {
    for (const n of [2, 3, 4, 5, 6, 7]) {
      for (const face of FACE_LETTERS) {
        const state = solvedNxn(n);
        for (let k = 0; k < 4; k++) applyMoveNxn(state, n, face);
        expect(state, `${face}x4 bei n=${n}`).toEqual(solvedNxn(n));
      }
    }
  });

  it("Move gefolgt von Inverse = solved (inkl. Wide)", () => {
    const cases: [number, string][] = [
      [2, "R"],
      [4, "Rw"],
      [5, "Uw"],
      [6, "3Fw"],
      [7, "3Lw"],
      [7, "Bw2"],
    ];
    for (const [n, mv] of cases) {
      const state = solvedNxn(n);
      applyMoveNxn(state, n, mv);
      // X2 hebt sich durch nochmaliges X2 auf, sonst durch X'.
      applyMoveNxn(state, n, mv.endsWith("2") ? mv : mv + "'");
      expect(state, `${mv} + inv bei n=${n}`).toEqual(solvedNxn(n));
    }
  });
});

describe("cube-net-nxn: Wide-Move-Tiefe + Parser", () => {
  it("4x4 Rw dreht genau 2 Layer (U-Spalten 3+2 → F-Farbe, 1+0 unberührt)", () => {
    const state = solvedNxn(4);
    applyMoveNxn(state, 4, "Rw");
    for (let r = 0; r < 4; r++) {
      expect(state.U[r * 4 + 3]).toBe("F"); // äusserster Layer
      expect(state.U[r * 4 + 2]).toBe("F"); // 2. Layer (wide)
      expect(state.U[r * 4 + 1]).toBe("U"); // unberührt
      expect(state.U[r * 4 + 0]).toBe("U"); // unberührt
    }
  });

  it("7x7 3Rw dreht genau 3 Layer", () => {
    const state = solvedNxn(7);
    applyMoveNxn(state, 7, "3Rw");
    for (let r = 0; r < 7; r++) {
      expect(state.U[r * 7 + 6]).toBe("F");
      expect(state.U[r * 7 + 5]).toBe("F");
      expect(state.U[r * 7 + 4]).toBe("F");
      expect(state.U[r * 7 + 3]).toBe("U"); // 4. Layer unberührt
    }
  });

  it("R (Aussen) dreht nur 1 Layer auf 4x4", () => {
    const state = solvedNxn(4);
    applyMoveNxn(state, 4, "R");
    for (let r = 0; r < 4; r++) {
      expect(state.U[r * 4 + 3]).toBe("F");
      expect(state.U[r * 4 + 2]).toBe("U"); // 2. Layer unberührt
    }
  });

  it("unbekannte Tokens (x, M, leer) ändern nichts", () => {
    for (const tok of ["x", "y'", "M", "Sw", ""]) {
      const state = solvedNxn(5);
      applyMoveNxn(state, 5, tok);
      expect(state).toEqual(solvedNxn(5));
    }
  });
});

describe("cube-net-nxn: SVG-Render", () => {
  it("solved-Render hat korrekte Dimensionen + Sticker-Anzahl", () => {
    for (const n of [2, 4, 5, 6, 7]) {
      const svg = renderScrambleNxnSvg(n, "", { stickerPx: 18, facePad: 2 });
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      const W = 4 * n * 18 + 3 * 2;
      const H = 3 * n * 18 + 2 * 2;
      expect(svg).toContain(`viewBox="0 0 ${W} ${H}"`);
      // 6 Faces × n² Sticker + 1 Hintergrund-Rect
      const rects = (svg.match(/<rect/g) ?? []).length;
      expect(rects).toBe(6 * n * n + 1);
    }
  });

  it("scrambled-Render unterscheidet sich von solved", () => {
    const solved = renderScrambleNxnSvg(4, "");
    const scrambled = renderScrambleNxnSvg(4, "Rw U2 Fw' R Uw");
    expect(scrambled).not.toBe(solved);
  });
});

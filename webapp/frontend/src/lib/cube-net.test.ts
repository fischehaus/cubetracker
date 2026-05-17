// Tests fuer cube-net.ts — kritische Logik, deshalb sorgfaeltig.
//
// Strategie: bekannte Speedcubing-Identitaeten testen.
//   1. Trivial: solved bleibt solved, R+R' = identity, etc.
//   2. Centers nie aenderen (Centerstuecke sind fix).
//   3. Group-Order: bekannte Algorithmen mit Order N -> N-fach = identity.
//      - Sexy-Move (R U R' U') hat Order 6
//      - T-Perm hat Order 2
//      - Sune hat Order 6
//   4. Snapshot eines bekannten Algorithms (Sune) gegen erwartetes Pattern.

import { describe, it, expect } from "vitest";
import {
  applyMove,
  applyScramble,
  solvedCube,
  renderScrambleSvg,
  cloneState,
  type CubeState,
} from "./cube-net";

/** Bequemer Vergleich: 2 States gleich? */
function statesEqual(a: CubeState, b: CubeState): boolean {
  const faces: (keyof CubeState)[] = ["U", "D", "F", "B", "R", "L"];
  for (const f of faces) {
    for (let i = 0; i < 9; i++) {
      if (a[f][i] !== b[f][i]) return false;
    }
  }
  return true;
}

describe("solvedCube", () => {
  it("hat jede Face mono-color = ihr eigener Name", () => {
    const s = solvedCube();
    const faces: (keyof CubeState)[] = ["U", "D", "F", "B", "R", "L"];
    for (const f of faces) {
      for (let i = 0; i < 9; i++) {
        expect(s[f][i]).toBe(f);
      }
    }
  });
});

describe("applyMove — Identitaeten", () => {
  it("R + R' = identity", () => {
    const s = solvedCube();
    applyMove(s, "R");
    applyMove(s, "R'");
    expect(statesEqual(s, solvedCube())).toBe(true);
  });

  it("R2 + R2 = identity", () => {
    const s = solvedCube();
    applyMove(s, "R2");
    applyMove(s, "R2");
    expect(statesEqual(s, solvedCube())).toBe(true);
  });

  it("4x R = identity", () => {
    const s = solvedCube();
    for (let i = 0; i < 4; i++) applyMove(s, "R");
    expect(statesEqual(s, solvedCube())).toBe(true);
  });

  it("alle 6 Faces: 4x = identity", () => {
    const faces = ["U", "D", "F", "B", "R", "L"];
    for (const f of faces) {
      const s = solvedCube();
      for (let i = 0; i < 4; i++) applyMove(s, f);
      expect(statesEqual(s, solvedCube())).toBe(true);
    }
  });

  it("unbekannte Tokens werden ignoriert (kein Crash)", () => {
    const s = solvedCube();
    applyMove(s, "Rw"); // wide-move, nicht supported
    applyMove(s, "x"); // rotation, nicht supported
    applyMove(s, ""); // leer
    expect(statesEqual(s, solvedCube())).toBe(true);
  });
});

describe("applyMove — Center-Invariante", () => {
  it("Centers (Index 4) aendern sich nie nach beliebigem Move", () => {
    const moves = [
      "R", "R'", "R2",
      "L", "L'", "L2",
      "U", "U'", "U2",
      "D", "D'", "D2",
      "F", "F'", "F2",
      "B", "B'", "B2",
    ];
    for (const m of moves) {
      const s = solvedCube();
      applyMove(s, m);
      const faces: (keyof CubeState)[] = ["U", "D", "F", "B", "R", "L"];
      for (const f of faces) {
        expect(s[f][4]).toBe(f);
      }
    }
  });
});

describe("applyScramble — bekannte Group-Orders", () => {
  it("Sexy-Move (R U R' U') hat Order 6", () => {
    // QA-Fix #8 (2026-05-17): vorher leitete eine Loop ueber `s` ein,
    // mutierte aber `s` nicht (applyScramble macht intern cloneState),
    // war also dead-code. Entfernt.
    const sexy = "R U R' U'";
    const full5 = `${sexy} ${sexy} ${sexy} ${sexy} ${sexy}`;
    const t = solvedCube();
    const after5 = applyScramble(t, full5);
    expect(statesEqual(after5, solvedCube())).toBe(false); // 5x != solved
    const after6 = applyScramble(t, `${full5} ${sexy}`);
    expect(statesEqual(after6, solvedCube())).toBe(true); // 6x = solved
  });

  it("T-Perm hat Order 2 (2x applied = identity)", () => {
    const tperm = "R U R' U' R' F R2 U' R' U' R U R' F'";
    const s = solvedCube();
    const after1 = applyScramble(s, tperm);
    expect(statesEqual(after1, solvedCube())).toBe(false); // 1x != solved
    const after2 = applyScramble(s, `${tperm} ${tperm}`);
    expect(statesEqual(after2, solvedCube())).toBe(true); // 2x = solved
  });

  it("Sune (R U R' U R U2 R') hat Order 6", () => {
    const sune = "R U R' U R U2 R'";
    const s = solvedCube();
    for (let i = 1; i < 6; i++) {
      const seq = Array(i).fill(sune).join(" ");
      const after = applyScramble(s, seq);
      expect(statesEqual(after, solvedCube())).toBe(false);
    }
    const seq6 = Array(6).fill(sune).join(" ");
    const after6 = applyScramble(s, seq6);
    expect(statesEqual(after6, solvedCube())).toBe(true);
  });
});

describe("applyScramble — Inverse-Invariante", () => {
  /** Berechnet inverse-Scramble: reverse order + jeden Move negieren. */
  function inverseScramble(scramble: string): string {
    return scramble
      .split(/\s+/)
      .filter((t) => t)
      .reverse()
      .map((token) => {
        if (token.endsWith("2")) return token; // self-inverse
        if (token.endsWith("'")) return token.slice(0, -1);
        return `${token}'`;
      })
      .join(" ");
  }

  // Wenn wir einen Scramble S anwenden und dann S^-1, muessen wir zu
  // solved zurueckkehren. Klassischer Smoke-Test ueber mehrere Scrambles.
  const scrambles = [
    "R U R' F' R U R' U' R' F R2 U' R' U'",
    "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    "U2 R2 U2 F2 D' R2 L2 D2 B2 R' B' L U R D' L2",
    "R", // trivial
    "R U R' U'", // sexy-move
  ];
  for (const sc of scrambles) {
    it(`Scramble "${sc}" + inverse = identity`, () => {
      const s = solvedCube();
      const after = applyScramble(s, `${sc} ${inverseScramble(sc)}`);
      expect(statesEqual(after, solvedCube())).toBe(true);
    });
  }
});

describe("renderScrambleSvg", () => {
  it("erzeugt einen vollstaendigen <svg>-String fuer solved cube", () => {
    const svg = renderScrambleSvg("");
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
    // 54 rect-Sticker + 1 Hintergrund-rect = 55 rects
    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBe(55);
  });

  it("erzeugt ein anderes SVG fuer Scramble vs Identity", () => {
    const solvedSvg = renderScrambleSvg("");
    const scrambledSvg = renderScrambleSvg("R U R' U'");
    expect(scrambledSvg).not.toBe(solvedSvg);
  });

  it("ignoriert Whitespace-Variationen", () => {
    const a = renderScrambleSvg("R U R'");
    const b = renderScrambleSvg("  R   U  R'  ");
    expect(a).toBe(b);
  });

  it("respektiert opts.stickerPx fuer custom size", () => {
    const small = renderScrambleSvg("", { stickerPx: 10 });
    const large = renderScrambleSvg("", { stickerPx: 30 });
    expect(small).not.toBe(large);
    // viewBox sollte unterschiedlich gross sein
    expect(small).toMatch(/viewBox="0 0 \d+/);
    expect(large).toMatch(/viewBox="0 0 \d+/);
  });
});

describe("cloneState", () => {
  it("liefert tiefe Kopie — Aenderungen am Klon beeinflussen Original nicht", () => {
    const original = solvedCube();
    const clone = cloneState(original);
    applyMove(clone, "R");
    expect(statesEqual(original, solvedCube())).toBe(true);
    expect(statesEqual(clone, solvedCube())).toBe(false);
  });
});

// cube-net-nxn.ts (Phase W.scramble-net-nxn, 2026-06-29) —
// Generalisierter N×N-Cube-State-Simulator + 2D-Net-SVG-Renderer.
//
// Verallgemeinert cube-net.ts (das 3x3-only ist) auf N = 2,4,5,6,7. Gleiche
// Face-/Orientierungs-Konventionen wie cube-net.ts: 6 Faces, jede als
// row-major Color[] der Länge N² (Index = row*N + col, row 0 = oben, col 0 =
// links, alle Faces "von aussen" betrachtet). U/D oben/unten, F/B vorne/hinten,
// R/L rechts/links.
//
// Move-Strips: die depth-parametrisierten Adjacent-Strips wurden aus den
// (getesteten) 3x3-Zyklen in cube-net.ts MOVES abgeleitet — der Regressions-
// Test (cube-net-nxn.test.ts) prüft, dass NxN(3) für viele Scrambles exakt
// denselben State wie cube-net.ts produziert.
//
// Notation (WCA Big-Cube, verifiziert an echten scrambow-Ausgaben):
//   - Aussen:  R R' R2            (1 Layer, depth 0)
//   - Wide:    Rw Rw' Rw2         (2 Layer, depth 0..1)
//   - n-Wide:  3Rw 3Uw2           (n Layer, depth 0..n-1)
//   Rotationen (x/y/z), Slices (M/E/S) und Kleinbuchstaben kommen in WCA-
//   NxN-Scrambles nicht vor → unbekannte Tokens werden ignoriert (kein Crash).

import { COLOR_HEX, SVG_BG, STICKER_STROKE, type Color } from "./cube-net";

type FaceName = "U" | "D" | "F" | "B" | "R" | "L";

/** Komplettstand: 6 Faces, jede row-major Color[] der Länge n². */
export type NxnState = Record<FaceName, Color[]>;

const FACE_ORDER: FaceName[] = ["U", "D", "F", "B", "R", "L"];

/** Gelöster N×N-Cube — jede Face mono-color (ihr eigener Name). */
export function solvedNxn(n: number): NxnState {
  const fill = (c: Color): Color[] => new Array<Color>(n * n).fill(c);
  return {
    U: fill("U"),
    D: fill("D"),
    F: fill("F"),
    B: fill("B"),
    R: fill("R"),
    L: fill("L"),
  };
}

/** Tiefe Kopie. */
export function cloneNxn(s: NxnState): NxnState {
  return {
    U: s.U.slice(),
    D: s.D.slice(),
    F: s.F.slice(),
    B: s.B.slice(),
    R: s.R.slice(),
    L: s.L.slice(),
  };
}

/**
 * Dreht eine N×N-Face 90° im Uhrzeigersinn (von aussen betrachtet).
 * (r,c) → (c, n-1-r):  new[c*n + (n-1-r)] = old[r*n + c].
 */
function rotateFaceCW(face: Color[], n: number): Color[] {
  const out = new Array<Color>(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c * n + (n - 1 - r)] = face[r * n + c];
    }
  }
  return out;
}

interface Strip {
  face: FaceName;
  /** n Sticker-Indices, in Zyklus-Leserichtung. */
  idx: number[];
}

// Index-Helper (row-major, n×n).
const rowLR = (n: number, row: number): number[] =>
  Array.from({ length: n }, (_, c) => row * n + c); // links → rechts
const rowRL = (n: number, row: number): number[] =>
  Array.from({ length: n }, (_, c) => row * n + (n - 1 - c)); // rechts → links
const colTB = (n: number, col: number): number[] =>
  Array.from({ length: n }, (_, r) => r * n + col); // oben → unten
const colBT = (n: number, col: number): number[] =>
  Array.from({ length: n }, (_, r) => (n - 1 - r) * n + col); // unten → oben

/**
 * Liefert für einen CW-Move der Face `face` in Tiefe `d` (0 = Layer direkt
 * an der Face) die 4 Adjacent-Strips in Zyklus-Reihenfolge:
 * strip[0] → strip[1] → strip[2] → strip[3] → strip[0].
 *
 * Abgeleitet aus cube-net.ts MOVES (3x3, d=0) und auf beliebige Tiefe
 * generalisiert. Gegen die 3x3-Zyklen verifiziert (siehe Test).
 */
function stripsFor(face: FaceName, d: number, n: number): Strip[] {
  const last = n - 1;
  switch (face) {
    case "U": // Reihe d von oben; Zyklus F→L→B→R
      return [
        { face: "F", idx: rowLR(n, d) },
        { face: "L", idx: rowLR(n, d) },
        { face: "B", idx: rowLR(n, d) },
        { face: "R", idx: rowLR(n, d) },
      ];
    case "D": // Reihe (last-d) von oben; Zyklus F→R→B→L
      return [
        { face: "F", idx: rowLR(n, last - d) },
        { face: "R", idx: rowLR(n, last - d) },
        { face: "B", idx: rowLR(n, last - d) },
        { face: "L", idx: rowLR(n, last - d) },
      ];
    case "R": // Spalte (last-d); Zyklus F→U→B(inv)→D
      return [
        { face: "F", idx: colTB(n, last - d) },
        { face: "U", idx: colTB(n, last - d) },
        { face: "B", idx: colBT(n, d) },
        { face: "D", idx: colTB(n, last - d) },
      ];
    case "L": // Spalte d; Zyklus F→D→B(inv)→U
      return [
        { face: "F", idx: colTB(n, d) },
        { face: "D", idx: colTB(n, d) },
        { face: "B", idx: colBT(n, last - d) },
        { face: "U", idx: colTB(n, d) },
      ];
    case "F": // Zyklus U(row last-d)→R(col d)→D(row d inv)→L(col last-d inv)
      return [
        { face: "U", idx: rowLR(n, last - d) },
        { face: "R", idx: colTB(n, d) },
        { face: "D", idx: rowRL(n, d) },
        { face: "L", idx: colBT(n, last - d) },
      ];
    case "B": // Zyklus U(row d inv)→L(col d)→D(row last-d)→R(col last-d inv)
      return [
        { face: "U", idx: rowRL(n, d) },
        { face: "L", idx: colTB(n, d) },
        { face: "D", idx: rowLR(n, last - d) },
        { face: "R", idx: colBT(n, last - d) },
      ];
  }
}

/** Wendet einen CW-Strip-Zyklus an: strip[0]→strip[1]→strip[2]→strip[3]→strip[0]. */
function applyCycleCW(state: NxnState, strips: Strip[]): void {
  const len = strips[0].idx.length;
  const tmp = strips[3].idx.map((i) => state[strips[3].face][i]);
  for (let dst = 3; dst > 0; dst--) {
    const src = dst - 1;
    for (let k = 0; k < len; k++) {
      state[strips[dst].face][strips[dst].idx[k]] =
        state[strips[src].face][strips[src].idx[k]];
    }
  }
  for (let k = 0; k < len; k++) {
    state[strips[0].face][strips[0].idx[k]] = tmp[k];
  }
}

const MOVE_RE = /^(\d*)([UDFBRL])(w?)(['2]?)$/;

/**
 * Wendet einen einzelnen Move auf den State an (mutiert in-place, gibt state
 * für Chaining zurück). Unbekannte Tokens (Rotationen/Slices/…) → ignoriert.
 */
export function applyMoveNxn(state: NxnState, n: number, move: string): NxnState {
  const m = MOVE_RE.exec(move.trim());
  if (!m) return state;
  const [, lead, face, wide, mod] = m;
  // Layer-Zahl: Wide ohne Zahl = 2; mit Zahl = die Zahl; ohne 'w' = 1 (Aussen).
  let layers = wide === "w" ? (lead ? parseInt(lead, 10) : 2) : 1;
  if (layers < 1) layers = 1;
  if (layers > n) layers = n; // defensiv clampen
  const turns = mod === "2" ? 2 : mod === "'" ? 3 : 1;

  for (let t = 0; t < turns; t++) {
    // Die Face selbst rotiert (depth 0 ist immer Teil eines Aussen-/Wide-Moves).
    state[face as FaceName] = rotateFaceCW(state[face as FaceName], n);
    for (let d = 0; d < layers; d++) {
      applyCycleCW(state, stripsFor(face as FaceName, d, n));
    }
  }
  return state;
}

/** Solved → Scramble anwenden. Tokens per Whitespace gesplittet. */
export function applyScrambleNxn(n: number, scramble: string): NxnState {
  const state = solvedNxn(n);
  for (const tok of scramble.split(/\s+/)) {
    if (tok) applyMoveNxn(state, n, tok);
  }
  return state;
}

// ============================================================
// SVG-Render (Cross-Layout, generalisiert aus cube-net.ts)
// ============================================================

interface RenderOptions {
  /** Sticker-Kantenlaenge in px. Default 18. */
  stickerPx?: number;
  /** Padding zwischen Faces (px). Default 2. */
  facePad?: number;
}

/**
 * Rendert den N×N-State als SVG-String im Cross-Layout:
 *           [U]
 *        [L][F][R][B]
 *           [D]
 */
export function renderNxnSvg(
  state: NxnState,
  n: number,
  opts: RenderOptions = {},
): string {
  const s = opts.stickerPx ?? 18;
  const pad = opts.facePad ?? 2;

  // 4 Faces breit (L F R B), 3 Faces hoch (U / Mitte / D).
  const W = 4 * n * s + 3 * pad;
  const H = 3 * n * s + 2 * pad;

  const facePos: Record<FaceName, [number, number]> = {
    U: [n * s + pad, 0],
    L: [0, n * s + pad],
    F: [n * s + pad, n * s + pad],
    R: [2 * n * s + 2 * pad, n * s + pad],
    B: [3 * n * s + 3 * pad, n * s + pad],
    D: [n * s + pad, 2 * n * s + 2 * pad],
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cube-Net nach Scramble">`,
  );
  parts.push(`<rect width="${W}" height="${H}" fill="${SVG_BG}" />`);

  for (const faceName of FACE_ORDER) {
    const [fx, fy] = facePos[faceName];
    const face = state[faceName];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      const x = fx + c * s;
      const y = fy + r * s;
      const fill = COLOR_HEX[face[i]];
      parts.push(
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="1.5" ry="1.5" fill="${fill}" stroke="${STICKER_STROKE}" stroke-width="0.7" />`,
      );
    }
  }

  parts.push("</svg>");
  return parts.join("");
}

/** Convenience: N + Scramble-String → SVG-String in einem Rutsch. */
export function renderScrambleNxnSvg(
  n: number,
  scramble: string,
  opts?: RenderOptions,
): string {
  return renderNxnSvg(applyScrambleNxn(n, scramble), n, opts);
}

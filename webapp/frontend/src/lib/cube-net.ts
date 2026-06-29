// cube-net.ts (Phase W.scramble-image, 2026-05-17) —
// Eigenbau-Cube-State-Simulator + 2D-Net-SVG-Renderer für 3x3.
//
// Warum Eigenbau statt cubing.js / sr-visualizer:
//   - Kein Bundle-Bloat (~5kB statt 150-500kB)
//   - Kein Vendoring-Risiko (cstimer_module-Drama 2026-05-16 noch frisch)
//   - Voll kontrollierbar / testbar / leicht erweiterbar
//
// Datenmodell:
//   - 6 Faces × 9 Sticker = 54 Sticker insgesamt
//   - Jede Face = Color[9], indices 0-8 von oben-links nach unten-rechts:
//       0 1 2
//       3 4 5
//       6 7 8
//   - Faces blicken alle "von aussen drauf". U/D = oben/unten,
//     F/B = vorne/hinten, R/L = rechts/links.
//
// Notation (WCA):
//   - 18 Basic-Moves: U, U', U2, D, D', D2, R, R', R2, L, L', L2, F, F', F2, B, B', B2
//   - Cube-Rotations (x, y, z) und Wide-Moves (Rw, Uw, ...) sind NICHT
//     implementiert — für 3x3-Scramble-Visualisierung reichen die 18
//     Basic-Moves voellig (WCA-Scrambles nutzen nur diese).
//
// SVG-Render: Cross-Layout
//          [U U U]
//          [U U U]
//          [U U U]
//   [L L L][F F F][R R R][B B B]
//   [L L L][F F F][R R R][B B B]
//   [L L L][F F F][R R R][B B B]
//          [D D D]
//          [D D D]
//          [D D D]

/** Sticker-Farbe nach WCA-Konvention. */
export type Color = "U" | "D" | "F" | "B" | "R" | "L";

/** Eine Face = 9 Sticker, indices 0..8 (oben-links bis unten-rechts). */
export type Face = [Color, Color, Color, Color, Color, Color, Color, Color, Color];

/** Komplettstand: 6 Faces. */
export interface CubeState {
  U: Face;
  D: Face;
  F: Face;
  B: Face;
  R: Face;
  L: Face;
}

/** Geloeste Cube — jede Face mono-color (entspricht ihrem eigenen Namen). */
export function solvedCube(): CubeState {
  const fill = (c: Color): Face => [c, c, c, c, c, c, c, c, c];
  return {
    U: fill("U"),
    D: fill("D"),
    F: fill("F"),
    B: fill("B"),
    R: fill("R"),
    L: fill("L"),
  };
}

/**
 * Dreht eine Face (9 Sticker) 90 Grad im Uhrzeigersinn.
 *   0 1 2        6 3 0
 *   3 4 5   ->   7 4 1
 *   6 7 8        8 5 2
 */
function rotateFaceCW(f: Face): Face {
  return [f[6], f[3], f[0], f[7], f[4], f[1], f[8], f[5], f[2]];
}

// rotateFace180 + rotateFaceCCW könnten als Optimierung Sinn machen,
// sind aber aktuell nicht benötigt — applyMove nutzt `turns`-Counter mit
// rotateFaceCW (max 3x). Wenn Performance mal Engpass wird: hier
// re-introducen + applyMove dispatchen. QA-Fix #7 (2026-05-17): vorher
// als dead-code + void-ESLint-Trick — sauberer entfernt.

/**
 * Zyklus-Definition für einen 90-Grad-CW-Move einer Face.
 *
 * `cycle` listet die 12 Sticker, die zwischen 4 Adjacent-Faces zykliert
 * werden, in 4 Gruppen à 3 Stickern. Ein 90-Grad-CW-Move schiebt
 * Gruppe[0] -> Gruppe[1] -> Gruppe[2] -> Gruppe[3] -> Gruppe[0].
 *
 * Jeder Sticker als (FaceName, Index 0-8).
 */
interface MoveCycle {
  /** Welche Face dreht sich selbst. */
  selfFace: keyof CubeState;
  /** Zyklus der 12 Adjacent-Sticker, 4×3. */
  cycle: [keyof CubeState, number][][];
}

// Die 6 Move-Definitionen.
// WICHTIG: Cycle-Direction = bei einem CW-Move einer Face wandern die
// Sticker in der definierten Reihenfolge weiter: pos[0] kommt nach pos[1]
// kommt nach pos[2] kommt nach pos[3] kommt nach pos[0].
const MOVES: Record<"U" | "D" | "R" | "L" | "F" | "B", MoveCycle> = {
  // U (top im Uhrzeigersinn von oben gesehen):
  // F-top-row (0,1,2) -> L-top-row (0,1,2) -> B-top-row (0,1,2) -> R-top-row (0,1,2) -> F
  U: {
    selfFace: "U",
    cycle: [
      [["F", 0], ["F", 1], ["F", 2]],
      [["L", 0], ["L", 1], ["L", 2]],
      [["B", 0], ["B", 1], ["B", 2]],
      [["R", 0], ["R", 1], ["R", 2]],
    ],
  },
  // D (bottom im Uhrzeigersinn von unten gesehen):
  // F-bottom-row (6,7,8) -> R-bottom-row (6,7,8) -> B-bottom-row (6,7,8) -> L-bottom-row (6,7,8) -> F
  D: {
    selfFace: "D",
    cycle: [
      [["F", 6], ["F", 7], ["F", 8]],
      [["R", 6], ["R", 7], ["R", 8]],
      [["B", 6], ["B", 7], ["B", 8]],
      [["L", 6], ["L", 7], ["L", 8]],
    ],
  },
  // R (right im Uhrzeigersinn von rechts gesehen):
  // F-right-col (2,5,8) -> U-right-col (2,5,8) -> B-left-col-inverted (6,3,0) -> D-right-col (2,5,8) -> F
  // Achtung: B ist "spiegelverkehrt" zu F, weil wir B "von hinten" sehen.
  // R-Spalte auf U/F/D ist (2,5,8); auf B aber (6,3,0) weil B-rechts (vom-User-aus-gesehen) der Index-spalte (6,3,0) entspricht.
  R: {
    selfFace: "R",
    cycle: [
      [["F", 2], ["F", 5], ["F", 8]],
      [["U", 2], ["U", 5], ["U", 8]],
      [["B", 6], ["B", 3], ["B", 0]],
      [["D", 2], ["D", 5], ["D", 8]],
    ],
  },
  // L (left im Uhrzeigersinn von links gesehen):
  // Analog R, gegen-orientiert.
  // F-left-col (0,3,6) -> D-left-col (0,3,6) -> B-right-col-inverted (8,5,2) -> U-left-col (0,3,6) -> F
  L: {
    selfFace: "L",
    cycle: [
      [["F", 0], ["F", 3], ["F", 6]],
      [["D", 0], ["D", 3], ["D", 6]],
      [["B", 8], ["B", 5], ["B", 2]],
      [["U", 0], ["U", 3], ["U", 6]],
    ],
  },
  // F (front im Uhrzeigersinn von vorne gesehen):
  // U-bottom-row (6,7,8) -> R-left-col (0,3,6) -> D-top-row-inverted (2,1,0) -> L-right-col-inverted (8,5,2) -> U
  F: {
    selfFace: "F",
    cycle: [
      [["U", 6], ["U", 7], ["U", 8]],
      [["R", 0], ["R", 3], ["R", 6]],
      [["D", 2], ["D", 1], ["D", 0]],
      [["L", 8], ["L", 5], ["L", 2]],
    ],
  },
  // B (back im Uhrzeigersinn von hinten gesehen):
  // U-top-row-inverted (2,1,0) -> L-left-col (0,3,6) -> D-bottom-row (6,7,8) -> R-right-col-inverted (8,5,2) -> U
  B: {
    selfFace: "B",
    cycle: [
      [["U", 2], ["U", 1], ["U", 0]],
      [["L", 0], ["L", 3], ["L", 6]],
      [["D", 6], ["D", 7], ["D", 8]],
      [["R", 8], ["R", 5], ["R", 2]],
    ],
  },
};

/**
 * Wendet einen CW-Zyklus an: cycle[0] -> cycle[1] -> cycle[2] -> cycle[3] -> cycle[0].
 */
function applyCycleCW(state: CubeState, cycle: MoveCycle["cycle"]): void {
  const tmp = cycle[3].map(([f, i]) => state[f][i]);
  for (let dst = 3; dst > 0; dst--) {
    const src = dst - 1;
    for (let k = 0; k < 3; k++) {
      const [df, di] = cycle[dst][k];
      const [sf, si] = cycle[src][k];
      state[df][di] = state[sf][si];
    }
  }
  for (let k = 0; k < 3; k++) {
    const [df, di] = cycle[0][k];
    state[df][di] = tmp[k];
  }
}

/**
 * Wendet einen einzelnen Move auf den State an (mutiert state in-place,
 * gibt aber state zurück für Convenience-Chaining).
 *
 * Akzeptierte Notation: U, U', U2, D, D', D2, R, R', R2, L, L', L2,
 * F, F', F2, B, B', B2. Alles andere wird stillschweigend ignoriert
 * (Wide-Moves, Rotationen, Slice-Moves sind in 3x3-WCA-Scrambles nicht
 * vorhanden — bei unbekanntem Token tun wir lieber nichts als zu crashen).
 */
export function applyMove(state: CubeState, move: string): CubeState {
  const trimmed = move.trim();
  if (!trimmed) return state;

  // Move-Face (1. Char) + Modifier (Rest)
  const face = trimmed[0] as "U" | "D" | "R" | "L" | "F" | "B";
  const modifier = trimmed.slice(1);

  const moveDef = MOVES[face];
  if (!moveDef) return state; // unbekannte Face (z.B. "x", "M") → ignore

  // Nur leer, "'" oder "2" sind valide Modifier. Wide-Moves (z.B. "Rw") /
  // mit Suffix-Suffix (z.B. "R2'") werden defensiv ignoriert — auf einer
  // 3x3-Cube-WCA-Scramble kommen nur die 18 Basic-Moves vor.
  if (modifier !== "" && modifier !== "'" && modifier !== "2") return state;

  // CW = 1x apply, double = 2x, CCW = 3x. So ist die Logik symmetrisch.
  const turns = modifier === "2" ? 2 : modifier === "'" ? 3 : 1;

  for (let i = 0; i < turns; i++) {
    state[moveDef.selfFace] = rotateFaceCW(state[moveDef.selfFace]);
    applyCycleCW(state, moveDef.cycle);
  }

  return state;
}

/**
 * Wendet eine ganze Scramble-Sequenz an. Tokens werden per Whitespace
 * gesplittet. Leere/unbekannte Tokens werden ignoriert.
 *
 * Erzeugt eine TIEFE Kopie des input-state — der Aufrufer kann ohne Sorge
 * den solved-cube übergeben.
 */
export function applyScramble(initial: CubeState, scramble: string): CubeState {
  const state = cloneState(initial);
  const tokens = scramble.split(/\s+/).filter((t) => t.length > 0);
  for (const t of tokens) {
    applyMove(state, t);
  }
  return state;
}

/** Tiefe Kopie des States — wir mutieren in applyMove. */
export function cloneState(s: CubeState): CubeState {
  return {
    U: [...s.U] as Face,
    D: [...s.D] as Face,
    F: [...s.F] as Face,
    B: [...s.B] as Face,
    R: [...s.R] as Face,
    L: [...s.L] as Face,
  };
}

// ============================================================
// SVG-Render
// ============================================================

/** Standard-Farben pro Color (WCA-Standard für 3x3). */
export const COLOR_HEX: Record<Color, string> = {
  U: "#f8f8f8", // weiss
  D: "#f8d62b", // gelb (yellow)
  F: "#1da647", // grün (green)
  B: "#1257c4", // blau (blue)
  R: "#d22020", // rot (red)
  L: "#f08a1a", // orange
};

/** Hintergrund + Stroke für das SVG-Frame. */
export const SVG_BG = "#1f2937"; // tailwind gray-800-ish, passt zur App
export const STICKER_STROKE = "#0d1117"; // dark border zwischen Stickern

interface RenderOptions {
  /** Sticker-Kantenlaenge in px. Default 18. */
  stickerPx?: number;
  /** Padding zwischen Faces (px). Default 2 (subtiler Frame). */
  facePad?: number;
}

/**
 * Rendert den State als SVG-String im Cross-Layout. Liefert kompletten
 * `<svg>...</svg>` String, der direkt in JSX als `dangerouslySetInnerHTML`
 * eingebettet werden kann (oder via React-SVG-Komponente reproduziert).
 *
 * Wir nehmen den String-Ansatz für Einfachheit + leichte Kopierbarkeit
 * (Right-click → Bild speichern funktioniert).
 */
export function renderCubeNetSvg(state: CubeState, opts: RenderOptions = {}): string {
  const s = opts.stickerPx ?? 18;
  const pad = opts.facePad ?? 2;

  // Cross-Layout: 4 Faces breit (L-F-R-B), 3 Faces hoch (U / mitte / D).
  // Breite: 4×3 Sticker + 3 Face-Paddings = 12s + 3p
  // Höhe: 3×3 Sticker + 2 Face-Paddings = 9s + 2p
  const W = 12 * s + 3 * pad;
  const H = 9 * s + 2 * pad;

  // Top-Left-Koordinaten der 6 Faces im Cross-Layout:
  // U sitzt zentriert oben (col-offset = 3 sticker = 1 face-breite).
  // L, F, R, B sitzen in der Mitte nebeneinander.
  // D sitzt zentriert unten.
  const facePositions: Record<keyof CubeState, [number, number]> = {
    U: [3 * s + pad, 0],
    L: [0, 3 * s + pad],
    F: [3 * s + pad, 3 * s + pad],
    R: [6 * s + 2 * pad, 3 * s + pad],
    B: [9 * s + 3 * pad, 3 * s + pad],
    D: [3 * s + pad, 6 * s + 2 * pad],
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cube-Net nach Scramble">`,
  );
  parts.push(`<rect width="${W}" height="${H}" fill="${SVG_BG}" />`);

  // 6 Faces durchgehen, je 9 Sticker rendern.
  for (const faceName of Object.keys(facePositions) as (keyof CubeState)[]) {
    const [fx, fy] = facePositions[faceName];
    const face = state[faceName];
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const x = fx + c * s;
      const y = fy + r * s;
      const fill = COLOR_HEX[face[i]];
      // 1px rx für dezent abgerundete Sticker — wirkt sauberer
      parts.push(
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="1.5" ry="1.5" fill="${fill}" stroke="${STICKER_STROKE}" stroke-width="0.7" />`,
      );
    }
  }

  parts.push("</svg>");
  return parts.join("");
}

/**
 * Convenience: Scramble-String → SVG-String in einem Rutsch.
 * Macht intern: solvedCube() → applyScramble(scramble) → renderCubeNetSvg().
 */
export function renderScrambleSvg(scramble: string, opts?: RenderOptions): string {
  const state = applyScramble(solvedCube(), scramble);
  return renderCubeNetSvg(state, opts);
}

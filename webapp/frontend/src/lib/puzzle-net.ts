// puzzle-net.ts (Phase W.scramble-net-pyraminx, 2026-06-29) —
// Generischer, leichtgewichtiger Applier + 2D-SVG-Renderer für piece-basierte
// Puzzles (Pyraminx, Skewb, Megaminx). Die Geometrie + Move-Transforms werden
// aus cubing.js gebacken (scripts/gen-puzzle-net.mjs, DEV-only) und liegen als
// statische Daten in lib/puzzle-net-data/<puzzle>.ts. AUSGELIEFERT wird nur
// dieses Modul + die Daten — cubing.js bleibt reine devDependency (kein Bundle).
//
// Standard-KPuzzle-Modell: pro Orbit eine Permutation `pieces` + `orientation`
// (mod numOri). Ein Move ist selbst ein solcher Transform; Komposition wie bei
// cubing:  (S·M).pieces[i] = S.pieces[M.pieces[i]];
//          (S·M).ori[i]    = (S.ori[M.pieces[i]] + M.ori[i]) mod numOri.
// Render: Slot-Facelet (orbit,piece p,sticker s) zeigt im State das Sticker-
// Farbfeld des aktuell dort liegenden Pieces, um dessen Orientierung gedreht.

interface OrbitTransform {
  pieces: readonly number[];
  orientation: readonly number[];
}
export interface PuzzleNetData {
  viewBox: string;
  orbitOri: Readonly<Record<string, number>>;
  facelets: ReadonlyArray<{
    readonly o: string;
    readonly p: number;
    readonly s: number;
    readonly c: string;
    readonly pts: string;
  }>;
  moves: Readonly<Record<string, Readonly<Record<string, OrbitTransform>>>>;
}

interface OrbitState {
  pieces: number[];
  orientation: number[];
}
type PuzzleState = Record<string, OrbitState>;

/** numPieces je Orbit aus den Facelets ableiten (max piece-Index + 1). */
function orbitSizes(data: PuzzleNetData): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const f of data.facelets) {
    sizes[f.o] = Math.max(sizes[f.o] ?? 0, f.p + 1);
  }
  return sizes;
}

function solvedState(data: PuzzleNetData): PuzzleState {
  const sizes = orbitSizes(data);
  const st: PuzzleState = {};
  for (const orbit of Object.keys(sizes)) {
    const n = sizes[orbit];
    st[orbit] = {
      pieces: Array.from({ length: n }, (_, i) => i),
      orientation: new Array<number>(n).fill(0),
    };
  }
  return st;
}

/** state = state · move (KPuzzle-Komposition). Mutiert nicht, gibt neuen State. */
function composeMove(
  data: PuzzleNetData,
  state: PuzzleState,
  move: Readonly<Record<string, OrbitTransform>>,
): PuzzleState {
  const next: PuzzleState = {};
  for (const orbit of Object.keys(state)) {
    const s = state[orbit];
    const m = move[orbit];
    if (!m) {
      next[orbit] = { pieces: s.pieces.slice(), orientation: s.orientation.slice() };
      continue;
    }
    const numOri = data.orbitOri[orbit];
    const n = s.pieces.length;
    const pieces = new Array<number>(n);
    const orientation = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const from = m.pieces[i];
      pieces[i] = s.pieces[from];
      orientation[i] = (s.orientation[from] + m.orientation[i]) % numOri;
    }
    next[orbit] = { pieces, orientation };
  }
  return next;
}

/** Scramble (Whitespace-getrennt) anwenden; unbekannte Tokens ignoriert. */
export function applyPuzzleScramble(data: PuzzleNetData, scramble: string): PuzzleState {
  let state = solvedState(data);
  for (const tok of scramble.split(/\s+/)) {
    const move = data.moves[tok];
    if (move) state = composeMove(data, state, move);
  }
  return state;
}

interface RenderOptions {
  /** Ziel-Breite in px (Höhe proportional zur viewBox). Default 220. */
  width?: number;
  /** Rand um die Facelet-Bounding-Box in viewBox-Einheiten. Default 6. */
  pad?: number;
}

const SVG_BG = "#1f2937";
const STROKE = "#0d1117";

/** Baked-Farbe des Facelets (orbit, piece, sticker) — Solved-Farbe des Pieces. */
function colorLookup(data: PuzzleNetData): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of data.facelets) map.set(`${f.o}.${f.p}.${f.s}`, f.c);
  return map;
}

export function renderPuzzleNetSvg(
  data: PuzzleNetData,
  state: PuzzleState,
  opts: RenderOptions = {},
): string {
  const pad = opts.pad ?? 6;
  const colors = colorLookup(data);

  // Tight-Bounding-Box aus allen Facelet-Punkten (die cubing-viewBox hat Rand).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const parsed = data.facelets.map((f) => {
    const nums = f.pts.split(/\s+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
    }
    return f;
  });
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = maxX - minX + 2 * pad, vbH = maxY - minY + 2 * pad;
  const width = opts.width ?? 220;
  const height = Math.round((width * vbH) / vbW);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${width}" height="${height}" role="img" aria-label="Puzzle-Net nach Scramble">`,
  );
  parts.push(
    `<rect x="${vbX.toFixed(1)}" y="${vbY.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" fill="${SVG_BG}" />`,
  );
  for (const f of parsed) {
    const s = state[f.o];
    const numOri = data.orbitOri[f.o];
    const curPiece = s.pieces[f.p];
    const ori = s.orientation[f.p];
    const srcSticker = ((f.s - ori) % numOri + numOri) % numOri;
    const fill = colors.get(`${f.o}.${curPiece}.${srcSticker}`) ?? "#000000";
    parts.push(
      `<polygon points="${f.pts}" fill="${fill}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="round" />`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

/** Convenience: Scramble-String → SVG. */
export function renderScramblePuzzleNetSvg(
  data: PuzzleNetData,
  scramble: string,
  opts?: RenderOptions,
): string {
  return renderPuzzleNetSvg(data, applyPuzzleScramble(data, scramble), opts);
}

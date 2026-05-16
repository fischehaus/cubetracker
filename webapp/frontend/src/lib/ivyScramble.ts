// Ivy Cube Random-State-Scrambler (Phase W.ivy-rs, 2026-05-17).
//
// User-Wunsch: echte WCA-Quality-Scrambles (Random-State + Optimal-Solver)
// statt Random-Move-Sequenzen. Erster Eigenbau-Solver fuer ein nicht-WCA-
// Puzzle. Wenn das Konzept hier funktioniert, dient es als Template fuer
// Gear/Redi/Master Pyraminx.
//
// REFERENZ: csTimer src/js/scramble/skewb.js, Funktion getScrambleIvy.
// Gleiche State-Repraesentation + Move-Wirkung, aber sauber als
// TypeScript ohne csTimer mathlib-Dependency neu geschrieben.
//
// STATE-MODELL (29.160 reachable states):
//   centers : Permutation von 6 Center-Stuecken (nur gerade Permutationen,
//             6!/2 = 360 reachable). Centers: 0=U, 1=R, 2=F, 3=B, 4=L, 5=D.
//   corners : Orientierung der 4 movable Corners (3 Twists pro Corner,
//             3^4 = 81). Corner-IDs: 0=URF, 1=ULB, 2=DRB, 3=DLF.
//
// MOVES: 4 Corners (R, L, D, B in csTimer-Notation) × 2 Richtungen.
//   Pro Move: 3-Cycle auf 3 angrenzenden Centers + +1 (mod 3) Twist auf
//   dem entsprechenden Corner.
//
// LOOKUP-TABLE: BFS vom solved state baut eine Map jedes State → (distance,
// erstes-Move-zum-Solven). Lazy-init beim ersten getScramble-Aufruf,
// dauert ~50-200ms im Browser. Danach jeder Scramble in <1ms.

/** 4 Corner-Achsen (csTimer-Notation, jaap-z2-rotated). */
const MOVE_LABELS = ["R", "L", "D", "B"] as const;

/** Center-3-Cycle pro Corner-Move. Reihenfolge: Move 0=R, 1=L, 2=D, 3=B. */
const MOVE_CENTERS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 3, 1], // R: U → B → R → U
  [0, 2, 4], // L: U → F → L → U
  [1, 5, 2], // D: R → D → F → R
  [3, 4, 5], // B: B → L → D → B
];

/**
 * Zykle 3 Slots: arr[cycle[0]] <- arr[cycle[1]] <- arr[cycle[2]] <- arr[cycle[0]].
 * Eine Anwendung = 120° CW, zwei Anwendungen = 120° CCW.
 */
function cycle3<T>(arr: T[], c: readonly [number, number, number], dir: 1 | -1): T[] {
  const next = arr.slice();
  if (dir === 1) {
    next[c[0]] = arr[c[2]];
    next[c[2]] = arr[c[1]];
    next[c[1]] = arr[c[0]];
  } else {
    next[c[0]] = arr[c[1]];
    next[c[1]] = arr[c[2]];
    next[c[2]] = arr[c[0]];
  }
  return next;
}

/** State-Encoding als kompakter String fuer Map-Keys. */
type StateKey = string;

function encodeState(centers: number[], corners: number[]): StateKey {
  // 6 centers (0-5 each) + 4 corners (0-2 each) = 10 stellige Repraesentation
  return centers.join(",") + "|" + corners.join("");
}

function decodeState(key: StateKey): { centers: number[]; corners: number[] } {
  const [centersStr, cornersStr] = key.split("|");
  return {
    centers: centersStr.split(",").map(Number),
    corners: cornersStr.split("").map(Number),
  };
}

const SOLVED_KEY: StateKey = encodeState([0, 1, 2, 3, 4, 5], [0, 0, 0, 0]);

/**
 * Wende einen Move (axisIndex 0-3, dir +1 oder -1) auf einen State an.
 * Returns new state (immutable).
 */
function applyMove(
  centers: number[],
  corners: number[],
  axisIdx: number,
  dir: 1 | -1,
): { centers: number[]; corners: number[] } {
  const newCenters = cycle3(centers, MOVE_CENTERS[axisIdx], dir);
  const newCorners = corners.slice();
  // Corner-Twist: +1 mod 3 fuer CW, +2 mod 3 (= -1) fuer CCW
  newCorners[axisIdx] = (newCorners[axisIdx] + (dir === 1 ? 1 : 2)) % 3;
  return { centers: newCenters, corners: newCorners };
}

/**
 * Move-Index in MOVE_LABELS-Notation. Beispiel: (axis=0, dir=+1) → "R",
 * (axis=2, dir=-1) → "D'".
 */
function moveLabel(axisIdx: number, dir: 1 | -1): string {
  return MOVE_LABELS[axisIdx] + (dir === 1 ? "" : "'");
}

/**
 * Inverse-Move-Label (R ↔ R', etc.) — wird beim Scramble-Generieren
 * gebraucht: Solution invertieren = Scramble.
 */
function inverseMoveLabel(label: string): string {
  if (label.endsWith("'")) return label.slice(0, -1);
  return label + "'";
}

/**
 * BFS vom solved state: berechnet fuer jeden erreichbaren State die
 * Distanz + das erste Move zum Lösen. Wird beim ersten getIvyScramble-
 * Aufruf einmal initialisiert (~50-200ms).
 *
 * Returns: Map<StateKey, { distance: number; firstMoveToSolve: string }>
 */
let cachedTable: Map<StateKey, { distance: number; firstMoveToSolve: string }> | null = null;

function buildLookupTable(): Map<
  StateKey,
  { distance: number; firstMoveToSolve: string }
> {
  if (cachedTable) return cachedTable;

  const table = new Map<StateKey, { distance: number; firstMoveToSolve: string }>();
  // SOLVED hat distance 0, kein move
  table.set(SOLVED_KEY, { distance: 0, firstMoveToSolve: "" });

  // BFS-Queue
  let frontier: StateKey[] = [SOLVED_KEY];
  let depth = 0;
  const MAX_DEPTH = 12; // Gott-Zahl von Ivy ist 6, doppelt fuer Sicherheit

  while (frontier.length > 0 && depth < MAX_DEPTH) {
    const nextFrontier: StateKey[] = [];
    for (const key of frontier) {
      const { centers, corners } = decodeState(key);
      // Probiere alle 8 Moves (4 axes × 2 directions)
      for (let axis = 0; axis < 4; axis++) {
        for (const dir of [1, -1] as const) {
          const next = applyMove(centers, corners, axis, dir);
          const nextKey = encodeState(next.centers, next.corners);
          if (!table.has(nextKey)) {
            // INVERSER Move ist das Move zum Loesen DIESES States
            // (wenn der Forward-Move von SOLVED hierhin fuehrt,
            //  fuehrt der Backward-Move von hier nach SOLVED).
            const forwardLabel = moveLabel(axis, dir);
            table.set(nextKey, {
              distance: depth + 1,
              firstMoveToSolve: inverseMoveLabel(forwardLabel),
            });
            nextFrontier.push(nextKey);
          }
        }
      }
    }
    frontier = nextFrontier;
    depth++;
  }

  cachedTable = table;
  return table;
}

/**
 * Pick a random non-solved state from the lookup table.
 *
 * Wir picken einen State mit distance >= 4 — kuerzere Scrambles wirken
 * fuer User als „trivial". csTimer hat dieselbe Konvention: ivyso macht
 * 6-Move-Scrambles, ivyo (ohne Mindest-Distanz) 0+.
 */
function pickRandomState(
  table: Map<StateKey, { distance: number; firstMoveToSolve: string }>,
  minDistance: number,
): StateKey {
  const eligible: StateKey[] = [];
  for (const [key, info] of table) {
    if (info.distance >= minDistance) eligible.push(key);
  }
  const idx = Math.floor(Math.random() * eligible.length);
  return eligible[idx];
}

/**
 * Loese einen State: gebe optimalen Move-Pfad zum Solved-State zurueck.
 *
 * Reverse-BFS-Walk: gegeben State, hol firstMoveToSolve, wende an, hol
 * nächsten Move, … bis SOLVED erreicht.
 */
function solveState(
  state: StateKey,
  table: Map<StateKey, { distance: number; firstMoveToSolve: string }>,
): string[] {
  const solution: string[] = [];
  let current = state;
  let safety = 0;
  while (current !== SOLVED_KEY && safety < 20) {
    const info = table.get(current);
    if (!info || !info.firstMoveToSolve) break;
    solution.push(info.firstMoveToSolve);
    // Wende den Move an um zum naechsten State zu kommen
    const { centers, corners } = decodeState(current);
    const label = info.firstMoveToSolve;
    const axis = MOVE_LABELS.indexOf(label.replace("'", "") as (typeof MOVE_LABELS)[number]);
    const dir = label.endsWith("'") ? -1 : 1;
    const next = applyMove(centers, corners, axis, dir);
    current = encodeState(next.centers, next.corners);
    safety++;
  }
  return solution;
}

/**
 * Invertiere eine Move-Sequenz: reverse Reihenfolge + jeden Move invertieren.
 * Solving-Path invertiert = Scramble (csTimer-Konvention).
 */
function invertSequence(moves: string[]): string[] {
  return moves.slice().reverse().map(inverseMoveLabel);
}

/**
 * Erzeuge einen Random-State-Ivy-Scramble.
 *
 * Workflow:
 *   1. Build lookup table (lazy, einmalig)
 *   2. Pick random state mit min-distance 4 (csTimer-Konvention)
 *   3. Solve state → optimale Loesung
 *   4. Inverse der Loesung = Scramble
 *
 * Returns: Scramble-String wie "R L' B R'" (csTimer-kompatibel).
 */
export function generateIvyScramble(): string {
  const table = buildLookupTable();
  const state = pickRandomState(table, 4);
  const solution = solveState(state, table);
  const scramble = invertSequence(solution);
  return scramble.join(" ");
}

/**
 * Test-Helper: leere den Cache. Nur fuer Vitest.
 */
export function _clearIvyCache(): void {
  cachedTable = null;
}

/**
 * Test-Helper: gibt die State-Space-Groesse zurueck. Sollte 29160 sein
 * (6!/2 = 360 Center-Permutationen × 3^4 = 81 Corner-Twists).
 */
export function _getStateSpaceSize(): number {
  return buildLookupTable().size;
}

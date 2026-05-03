// PLL + OLL Algorithm-Datenbank fuer den Trainer (Phase 8b).
//
// Strategie: statt scrambow's random-state pll/oll zu nutzen (wo wir
// den case-namen nicht kennen), drillen wir gezielte cases. Fuer jeden
// case kennen wir den Standard-Algorithm und generieren den Scramble
// als invertierten Algorithmus — klassische speedcubing-praxis.
//
// Datenquelle: WCA-/Speedsolving-Standard-Algorithmen. Format-Konvention:
//   case_id   = "PLL-Tperm" | "OLL-21" — wird in solves.alg_case
//               gespeichert und ist beim Trainer-modus auto-getagged.
//   name      = User-sichtbarer Name ("T-perm")
//   alg       = Standard-WCA-notation, soll von rechts nach links auf
//               einem geloesten cube angewendet werden.
//
// Konvention: alle algs in WCA-3x3-notation. Inversion siehe inverseAlg().

export type AlgSubsetId = "pll" | "oll";

export interface AlgCase {
  id: string; // z.B. "PLL-Tperm" — landet in solves.alg_case
  name: string; // z.B. "T-perm"
  alg: string; // Standard-Algorithmus
}

// ============================================================
// PLL — alle 21 Cases
// ============================================================
//
// Algorithmen-Auswahl: gaengige speedsolving-standards (aus wiki +
// J Perm's beginner-friendly set). Konsistente notation, keine
// rotations (x/y/z) im algorithm — die wuerden inversion erschweren.

export const PLL_CASES: AlgCase[] = [
  { id: "PLL-Aa", name: "Aa-perm", alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { id: "PLL-Ab", name: "Ab-perm", alg: "x R2 D2 R U R' D2 R U' R x'" },
  { id: "PLL-E", name: "E-perm", alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { id: "PLL-F", name: "F-perm", alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { id: "PLL-Ga", name: "Ga-perm", alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { id: "PLL-Gb", name: "Gb-perm", alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { id: "PLL-Gc", name: "Gc-perm", alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { id: "PLL-Gd", name: "Gd-perm", alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { id: "PLL-H", name: "H-perm", alg: "M2 U M2 U2 M2 U M2" },
  { id: "PLL-Ja", name: "Ja-perm", alg: "R' U L' U2 R U' R' U2 R L" },
  { id: "PLL-Jb", name: "Jb-perm", alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { id: "PLL-Na", name: "Na-perm", alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { id: "PLL-Nb", name: "Nb-perm", alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { id: "PLL-Ra", name: "Ra-perm", alg: "R U R' F' R U2 R' U2 R' F R U R U2 R'" },
  { id: "PLL-Rb", name: "Rb-perm", alg: "R' U2 R U2 R' F R U R' U' R' F' R2" },
  { id: "PLL-T", name: "T-perm", alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { id: "PLL-Ua", name: "Ua-perm", alg: "R U' R U R U R U' R' U' R2" },
  { id: "PLL-Ub", name: "Ub-perm", alg: "R2 U R U R' U' R' U' R' U R'" },
  { id: "PLL-V", name: "V-perm", alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { id: "PLL-Y", name: "Y-perm", alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { id: "PLL-Z", name: "Z-perm", alg: "M2 U M2 U M' U2 M2 U2 M' U2" },
];

// ============================================================
// OLL — alle 57 Cases (Standard-Numerierung 1-57)
// ============================================================
//
// Algs aus J Perm's beginner-2-look + intermediate set. Numerierung
// folgt Speedsolving-Wiki-Konvention.

export const OLL_CASES: AlgCase[] = [
  { id: "OLL-1", name: "OLL 1 (Dot)", alg: "R U2 R' R' F R F' U2 R' F R F'" },
  { id: "OLL-2", name: "OLL 2 (Dot)", alg: "F R U R' U' F' f R U R' U' f'" },
  { id: "OLL-3", name: "OLL 3 (Dot)", alg: "f R U R' U' f' U' F R U R' U' F'" },
  { id: "OLL-4", name: "OLL 4 (Dot)", alg: "f R U R' U' f' U F R U R' U' F'" },
  { id: "OLL-5", name: "OLL 5 (Square)", alg: "r' U2 R U R' U r" },
  { id: "OLL-6", name: "OLL 6 (Square)", alg: "r U2 R' U' R U' r'" },
  { id: "OLL-7", name: "OLL 7 (Lightning)", alg: "r U R' U R U2 r'" },
  { id: "OLL-8", name: "OLL 8 (Lightning)", alg: "r' U' R U' R' U2 r" },
  { id: "OLL-9", name: "OLL 9 (Lightning)", alg: "R U R' U' R' F R2 U R' U' F'" },
  { id: "OLL-10", name: "OLL 10 (Lightning)", alg: "R U R' U R' F R F' R U2 R'" },
  { id: "OLL-11", name: "OLL 11 (Lightning)", alg: "r U R' U R' F R F' R U2 r'" },
  { id: "OLL-12", name: "OLL 12 (Lightning)", alg: "F R U R' U' F' U F R U R' U' F'" },
  { id: "OLL-13", name: "OLL 13 (Knight)", alg: "F U R U' R2 F' R U R U' R'" },
  { id: "OLL-14", name: "OLL 14 (Knight)", alg: "R' F R U R' F' R F U' F'" },
  { id: "OLL-15", name: "OLL 15 (Knight)", alg: "l' U' l L' U' L U l' U l" },
  { id: "OLL-16", name: "OLL 16 (Knight)", alg: "r U r' R U R' U' r U' r'" },
  { id: "OLL-17", name: "OLL 17 (Cross)", alg: "F R' F' R U S R U' R' S'" },
  { id: "OLL-18", name: "OLL 18 (Cross)", alg: "r U R' U R U2 r2 U' R U' R' U2 r" },
  { id: "OLL-19", name: "OLL 19 (Cross)", alg: "r' R U R U R' U' r R2 F R F'" },
  { id: "OLL-20", name: "OLL 20 (Cross)", alg: "r U R' U' M2 U R U' R' U' M'" },
  { id: "OLL-21", name: "OLL 21 (H)", alg: "R U2 R' U' R U R' U' R U' R'" },
  { id: "OLL-22", name: "OLL 22 (Pi)", alg: "R U2 R2 U' R2 U' R2 U2 R" },
  { id: "OLL-23", name: "OLL 23 (U)", alg: "R2 D R' U2 R D' R' U2 R'" },
  { id: "OLL-24", name: "OLL 24 (T)", alg: "r U R' U' r' F R F'" },
  { id: "OLL-25", name: "OLL 25 (Bowtie)", alg: "F' r U R' U' r' F R" },
  { id: "OLL-26", name: "OLL 26 (Sune)", alg: "R U2 R' U' R U' R'" },
  { id: "OLL-27", name: "OLL 27 (Sune)", alg: "R U R' U R U2 R'" },
  { id: "OLL-28", name: "OLL 28 (Corners)", alg: "r U R' U' M U R U' R'" },
  { id: "OLL-29", name: "OLL 29 (Awkward)", alg: "R U R' U' R U' R' F' U' F R U R'" },
  { id: "OLL-30", name: "OLL 30 (Awkward)", alg: "F R' F R2 U' R' U' R U R' F2" },
  { id: "OLL-31", name: "OLL 31 (P)", alg: "R' U' F U R U' R' F' R" },
  { id: "OLL-32", name: "OLL 32 (P)", alg: "L U F' U' L' U L F L'" },
  { id: "OLL-33", name: "OLL 33 (T)", alg: "R U R' U' R' F R F'" },
  { id: "OLL-34", name: "OLL 34 (C)", alg: "R U R2 U' R' F R U R U' F'" },
  { id: "OLL-35", name: "OLL 35 (Fish)", alg: "R U2 R2 F R F' R U2 R'" },
  { id: "OLL-36", name: "OLL 36 (W)", alg: "L' U' L U' L' U L U L F' L' F" },
  { id: "OLL-37", name: "OLL 37 (Fish)", alg: "F R' F' R U R U' R'" },
  { id: "OLL-38", name: "OLL 38 (W)", alg: "R U R' U R U' R' U' R' F R F'" },
  { id: "OLL-39", name: "OLL 39 (BLS)", alg: "L F' L' U' L U F U' L'" },
  { id: "OLL-40", name: "OLL 40 (BLS)", alg: "R' F R U R' U' F' U R" },
  { id: "OLL-41", name: "OLL 41 (Awkward)", alg: "R U R' U R U2 R' F R U R' U' F'" },
  { id: "OLL-42", name: "OLL 42 (Awkward)", alg: "R' U' R U' R' U2 R F R U R' U' F'" },
  { id: "OLL-43", name: "OLL 43 (P)", alg: "f' L' U' L U f" },
  { id: "OLL-44", name: "OLL 44 (P)", alg: "f R U R' U' f'" },
  { id: "OLL-45", name: "OLL 45 (T)", alg: "F R U R' U' F'" },
  { id: "OLL-46", name: "OLL 46 (C)", alg: "R' U' R' F R F' U R" },
  { id: "OLL-47", name: "OLL 47 (Bowtie)", alg: "R' U' R' F R F' R' F R F' U R" },
  { id: "OLL-48", name: "OLL 48 (Bowtie)", alg: "F R U R' U' R U R' U' F'" },
  { id: "OLL-49", name: "OLL 49 (Awkward)", alg: "R B' R2 F R2 B R2 F' R" },
  { id: "OLL-50", name: "OLL 50 (Awkward)", alg: "R' F R2 B' R2 F' R2 B R'" },
  { id: "OLL-51", name: "OLL 51 (Lightning)", alg: "f R U R' U' R U R' U' f'" },
  { id: "OLL-52", name: "OLL 52 (Lightning)", alg: "R U R' U R U' B U' B' R'" },
  { id: "OLL-53", name: "OLL 53 (Lightning)", alg: "r' U' R U' R' U R U' R' U2 r" },
  { id: "OLL-54", name: "OLL 54 (Lightning)", alg: "r U R' U R U' R' U R U2 r'" },
  { id: "OLL-55", name: "OLL 55 (H/Pi)", alg: "R U2 R2 U' R U' R' U2 F R F'" },
  { id: "OLL-56", name: "OLL 56 (H/Pi)", alg: "r U r' U R U' R' U R U' R' r U' r'" },
  { id: "OLL-57", name: "OLL 57 (H)", alg: "R U R' U' M' U R U' r'" },
];

export const ALG_SUBSETS: Record<AlgSubsetId, { name: string; cases: AlgCase[] }> = {
  pll: { name: "PLL — Permutation der letzten Schicht", cases: PLL_CASES },
  oll: { name: "OLL — Orientierung der letzten Schicht", cases: OLL_CASES },
};

// ============================================================
// Algorithm-Inversion (Drill-Scramble-Generator)
// ============================================================
//
// Klassisches Speedsolving-Prinzip: scramble fuer case X = invers(alg(X)).
// Wenn ich X-alg auf gegebenen state anwende, lande ich beim Identitaets-
// state (geloester cube). Also: invers(X-alg) angewendet auf geloesten
// cube ergibt den state, von dem aus X-alg loest. → das IST der scramble.
//
// Invertierungs-Regel: tokenize, reverse-order, jedes token invertieren:
//   "R"   ↔ "R'"
//   "R2"  ↔ "R2"     (selbstinvers)
//   "R'"  ↔ "R"
// Gilt analog fuer alle moves: U/D/L/R/F/B/M/E/S/x/y/z + lowercase r/u/...

const TOKEN_RE = /\s+/;

function invertToken(token: string): string {
  if (token.length === 0) return token;
  // Selbst-invers: alle "X2" / "X2'" Half-Turns
  if (token.endsWith("2")) return token;
  if (token.endsWith("2'")) return token.slice(0, -1); // "R2'" → "R2"
  // Prime → kein-prime
  if (token.endsWith("'")) return token.slice(0, -1);
  // kein-prime → prime
  return token + "'";
}

/**
 * Liefert die Invers-Notation eines Algorithmus.
 * Beispiel: "R U R'" → "R U' R'"
 *           "F R U R' U' F'" → "F U R U' R' F'"
 */
export function inverseAlg(alg: string): string {
  const tokens = alg.trim().split(TOKEN_RE).filter((t) => t.length > 0);
  return tokens.reverse().map(invertToken).join(" ");
}

/**
 * Liefert einen Drill-Scramble fuer einen bestimmten case.
 * Optional Praefix mit zufaelliger AUF-Rotation (U/U2/U'), damit
 * der case nicht immer in derselben Orientierung steht.
 */
export function scrambleForCase(c: AlgCase, randomAUF: boolean = true): string {
  const inv = inverseAlg(c.alg);
  if (!randomAUF) return inv;
  const aufs = ["", "U ", "U2 ", "U' "];
  const auf = aufs[Math.floor(Math.random() * aufs.length)];
  return (auf + inv).trim();
}

export function findCaseById(id: string): AlgCase | undefined {
  return [...PLL_CASES, ...OLL_CASES].find((c) => c.id === id);
}

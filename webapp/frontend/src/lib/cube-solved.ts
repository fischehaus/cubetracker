// Cube-Solved-Detection — vergleicht einen Facelets-String gegen
// den "solved" State.
//
// W.gan-cube-auto-time (2026-05-28).
//
// Facelets-Format (gan-web-bluetooth liefert 54 Zeichen):
// Reihenfolge: U(p), R(ight), F(ront), D(own), L(eft), B(ack)
// Je 9 Zeichen pro Face. Ein "solved" Cube hat auf jeder Face alle
// 9 Stickers dieselbe Farbe (= dieselbe Letter).
//
// Beispiel solved-state:
// "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
//
// Robustheit: wenn der String nicht 54 Zeichen hat (Initial-State,
// Bug, anderer Cube-Type), geben wir `false` zurueck.

export function isCubeSolved(facelets: string | null | undefined): boolean {
  if (!facelets || facelets.length !== 54) return false;
  for (let face = 0; face < 6; face++) {
    const startIdx = face * 9;
    const firstChar = facelets[startIdx];
    for (let i = 1; i < 9; i++) {
      if (facelets[startIdx + i] !== firstChar) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Standard-solved-Facelets-String fuer 3x3. Wird nicht direkt
 * benoetigt fuer Vergleich (isCubeSolved arbeitet patternbasiert),
 * aber als Konstante fuer Logging + Debug.
 */
export const SOLVED_3X3_FACELETS =
  "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

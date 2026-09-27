// Welches 2D-Net passt zum angezeigten Scramble? (W.scramble-net-type, 2026-09-27)
//
// Bug davor: ScrambleNet wählte die Net-Form nach dem cube_type der Session.
// Der Scramble selbst entsteht aber aus dem EFFEKTIVEN Scramble-Typ
// (Picker-Auswahl > Session-Override > cube_type-Default, ScrambleCard).
// Session „3x3" + Picker „2x2" → 2x2-Scramble mit 3x3-Bild.
//
// Rückgabe ist ein App-cube_type-Schlüssel, den ScrambleNet schon kennt
// ("3x3", "2x2", …, "Pyraminx", "Skewb"), oder null = kein Net.

/** Scramble-Codes (WCA_SCRAMBLE_TYPES in scramble.ts) → Net-Schlüssel. */
const NET_KEY_BY_SCRAMBLE_TYPE: Record<string, string> = {
  "333": "3x3",
  "222": "2x2",
  "444": "4x4",
  "555": "5x5",
  "666": "6x6",
  "777": "7x7",
  pyraminx: "Pyraminx",
  skewb: "Skewb",
};

/**
 * Net-Schlüssel für einen Scramble. Ist der effektive Scramble-Typ bekannt,
 * entscheidet NUR er (ein unbekannter Typ ergibt null statt eines falschen
 * Bildes). Ohne Scramble-Typ bleibt es beim cube_type (alter Pfad).
 */
export function resolveScrambleNetKey(
  cubeType: string,
  scrambleType?: string | null,
): string | null {
  if (scrambleType) return NET_KEY_BY_SCRAMBLE_TYPE[scrambleType] ?? null;
  return cubeType;
}

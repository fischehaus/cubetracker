// Helper: Zeit-Formatierung + Cube-Type-Liste.

import type { Solve } from "./types";

/**
 * Formatiert Millisekunden im csTimer-Stil:
 * < 60s  → "12.34"
 * >= 60s → "1:23.45"
 * DNF    → "DNF"
 */
export function formatTime(ms: number | null, dnf: boolean = false): string {
  if (dnf || ms === null) return "DNF";
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return totalSeconds.toFixed(2);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

/**
 * Formatiert einen Solve mit Strafe-Markern: "12.34+", "DNF".
 */
export function formatSolveTime(s: Solve): string {
  if (s.dnf) return "DNF";
  const base = formatTime(s.effective_time_ms);
  return s.plus_two ? `${base}+` : base;
}

/**
 * Parst einen User-Input-String zu Millisekunden.
 *
 * Akzeptierte Formate:
 *   - "12.34"    → SS.cc (klassisch mit Punkt)
 *   - "1:23.45"  → MM:SS.cc (mit Doppelpunkt + Punkt)
 *   - "1234"     → SS.cc nach csTimer-Stackmat-Konvention:
 *                  rechteste 2 Stellen = Hundertstel, dann Sekunden, dann Minuten.
 *                  Beispiele:
 *                    "5"      → 0.05s   (50 ms)
 *                    "945"    → 9.45s   (9450 ms)
 *                    "1234"   → 12.34s  (12340 ms)
 *                    "15102"  → 1:51.02 (111020 ms)
 *                    "123456" → 12:34.56 (754560 ms)
 *
 * Liefert null bei ungueltigem Input.
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // "1:23.45" oder "1:23" → MM:SS.cc
  if (trimmed.includes(":")) {
    const [minStr, secStr] = trimmed.split(":");
    const min = parseInt(minStr, 10);
    const sec = parseFloat(secStr);
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) return null;
    return Math.round((min * 60 + sec) * 1000);
  }

  // Reine Ziffern → csTimer-Stackmat-Konvention
  if (/^\d+$/.test(trimmed)) {
    return parseDigitsOnly(trimmed);
  }

  // "12.34" → SS.cc (klassisch)
  const sec = parseFloat(trimmed);
  if (isNaN(sec) || sec < 0) return null;
  return Math.round(sec * 1000);
}

/**
 * Interne Helper: Zifferkette nach csTimer-Stackmat-Regel parsen.
 * - Letzte 2 Ziffern  = Hundertstel
 * - Naechste 2 Ziffern = Sekunden
 * - Rest             = Minuten
 *
 * Sekunden- und Hundertstel-Teile duerfen logisch jeden Wert annehmen
 * (User schreibt was er tippt — z.B. "1099" → 10.99s, valide).
 */
function parseDigitsOnly(digits: string): number | null {
  if (!digits) return null;
  const padded = digits.padStart(2, "0"); // mind. 2 Ziffern fuer centi
  const centi = parseInt(padded.slice(-2), 10);
  const rest = padded.slice(0, -2);
  let seconds = 0;
  let minutes = 0;
  if (rest.length > 0) {
    const restPad = rest.padStart(2, "0");
    seconds = parseInt(restPad.slice(-2), 10);
    const minStr = restPad.slice(0, -2);
    if (minStr.length > 0) {
      minutes = parseInt(minStr, 10);
    }
  }
  return minutes * 60_000 + seconds * 1000 + centi * 10;
}

/**
 * Formatiert ein ISO-Datum kompakt: "02.05.2026 14:23".
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

/**
 * Standard-Liste haeufiger Cube-Types (Reihenfolge fuer Dropdown-Default).
 * User kann beliebige andere Strings im POST schicken — das hier ist nur UX.
 *
 * Erweitert in Phase W.cstimer-more-puzzles-qa (2026-05-17) um die 11
 * inoffiziellen Cubes die ueber csTimer-Vendor Scrambles bekommen. Vorher
 * konnten User diese im Scramble-Picker waehlen, aber NICHT als cube_type
 * fuer Solve-Speicherung setzen → Solves landen unter falschem Type
 * (QA-Befund #1 vom 2026-05-17).
 */
export const COMMON_CUBE_TYPES = [
  // WCA-Events (Reihenfolge nach Geschwindigkeit / Beliebtheit)
  "3x3",
  "2x2",
  "4x4",
  "5x5",
  "6x6",
  "7x7",
  "OH",
  "3BLD",
  "Pyraminx",
  "Skewb",
  "Square-1",
  "Megaminx",
  "Clock",
  // Inoffizielle Cubes (Phase W.cstimer-more-puzzles, 2026-05-17;
  // bereinigt im QA-Fix selbentags — broken cubes raus)
  "Ivy",
  "Gear",
  "Redi",
  "Master Pyraminx",
  "Master Skewb",
  "FTO",
  "Dino",
  "Floppy",
  "Tower",
] as const;

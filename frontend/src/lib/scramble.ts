// Scramble-Generierung (Phase 8a) — duenner Wrapper um scrambow.
//
// scrambow = csTimer-Algorithmen geportet, deckt alle WCA-Events +
// die meisten Subsets fuer Algorithmus-Training ab.
//
// Architektur: pure helpers + Mapping app-cube_type → scrambow-type +
// Subset-Liste fuer den spaeteren Algorithm-Trainer (Phase 8b).
//
// Kein Singleton-State — jeder Aufruf macht eine frische Scrambow-
// Instanz. Das ist OK weil scrambow keine teure Initialisierung hat
// und wir so race-conditions zwischen concurrent generations vermeiden.

// Wir importieren NICHT von "scrambow" direkt, weil dessen UMD-Bundle
// von Vite 8 / Rolldown wegen scope-uebergreifender `f`-Wiederverwendung
// nicht geparst werden kann. Stattdessen patched-vendor-copy unter
// src/vendor/, die das zweite `f` zu `_F` umbenennt (semantisch
// identisch, im skewb-Scrambler-Loop). Types kommen aus dem npm-Paket
// via *.d.ts-Stub im selben vendor-Ordner.
import { Scrambow } from "../vendor/scrambow-patched";

/**
 * Mappt einen App-cube_type ("3x3", "OH", "Pyraminx", …) auf den
 * scrambow-internen Typen-Code.
 *
 * OH und 3BLD nutzen jeweils 3x3-WCA-Scrambles (csTimer-Konvention).
 * Unbekannte cube_types fallen auf 333 zurueck — sicherer Default,
 * weil 3x3 immer scrambelbar ist.
 */
export function cubeTypeToScrambowType(cubeType: string): string {
  switch (cubeType) {
    case "3x3":
      return "333";
    case "2x2":
      return "222";
    case "4x4":
      return "444";
    case "5x5":
      return "555";
    case "6x6":
      return "666";
    case "7x7":
      return "777";
    case "OH":
      return "333";
    case "3BLD":
      return "333";
    case "Pyraminx":
      return "pyraminx";
    case "Skewb":
      return "skewb";
    case "Square-1":
      return "square-1";
    case "Megaminx":
      return "megaminx";
    case "Clock":
      return "clock";
    default:
      return "333";
  }
}

/**
 * Subset-IDs fuer den Algorithm-Trainer (Phase 8b verwendet).
 * Bewusst eine eigene Liste: nicht jeder scrambow-type ist ein
 * Trainings-Subset (444, mega etc. sind Events, keine Subsets).
 *
 * Liste konservativ — nur was im MVP wirklich getestet ist.
 * Erweiterung spaeter ohne Backend-Aenderung moeglich.
 */
export const ALG_TRAINER_SUBSETS = ["pll", "oll"] as const;
export type AlgTrainerSubset = (typeof ALG_TRAINER_SUBSETS)[number];

/**
 * Liste aller fuer ScrambleType-Override unterstuetzten Strings.
 * Wird in Session.scramble_type genutzt — Phase 8b verzahnt das
 * mit dem Timer.
 */
export function isAlgTrainerSubset(s: string): s is AlgTrainerSubset {
  return (ALG_TRAINER_SUBSETS as readonly string[]).includes(s);
}

/**
 * Generiert einen Scramble-String fuer den gegebenen Typ (cube_type
 * oder scramble_type-override aus Session).
 *
 * Bei Fehler liefern wir leeren String — UI zeigt dann fallback-
 * meldung „Scramble nicht verfuegbar". Wir crashen nicht, weil ein
 * fehlender Scramble den Timer nicht blockieren soll.
 */
export function generateScramble(typeOverride: string): string {
  try {
    const scrambow = new Scrambow().setType(typeOverride);
    const result = scrambow.get(1);
    return result[0]?.scramble_string ?? "";
  } catch {
    return "";
  }
}

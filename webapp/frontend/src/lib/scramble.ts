// Scramble-Generierung (Phase 8a) — duenner Wrapper um scrambow + eigene
// Random-Move-Generatoren fuer Puzzles, die scrambow nicht abdeckt.
//
// scrambow = csTimer-Algorithmen geportet, deckt alle WCA-Events +
// die meisten Subsets fuer Algorithmus-Training ab. Aber: Ivy, Gear,
// Redi, Master Pyraminx, Master Skewb sind NICHT in scrambow drin.
// Fuer diese liefern wir einen einfachen Random-Move-Scrambler mit
// „kein direktes Wiederholen derselben Achse"-Filter — nicht
// WCA-quality, aber sauber fuer Casual-Training.
//
// Architektur: pure helpers + Kategorie-Listen fuer die UI.
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
// Eigenbau-Random-State-Solver fuer einzelne Custom-Puzzles
// (Phase W.ivy-rs, 2026-05-17 — erstes Puzzle). Reines TypeScript ohne
// externe Deps, BFS-Lookup-Table beim ersten Aufruf. Lesson aus dem
// cstimer_module-Browser-Crash: keine Native-Node-Globals importieren,
// daher Eigenbau statt npm-Paket.
import { generateIvyScramble } from "./ivyScramble";
// csTimer-Random-State-Scrambler fuer inoffizielle Cubes (Phase
// W.cstimer-vendor, 2026-05-17). GPL-v3, gevendorter Subset aus
// github.com/cs0x7f/cstimer. Public-API: getCstimerScramble(type).
// Liefert null wenn der Type nicht registriert ist (= safe-fallback
// auf unseren Random-Move-Generator weiter unten).
import { getCstimerScramble } from "./cstimer-vendor";

/**
 * Mapping unserer App-Codes auf csTimer-internal-Types. Nur Eintraege
 * hier werden via csTimer-Pfad bedient — andere fallen auf scrambow
 * oder Random-Move zurueck.
 *
 *   "gearso"  = Gear Cube, random-state-shortened (csTimer-Default, 4-10 moves)
 *   "rediso"  = Redi Cube, random-state
 *   "mpyrso"  = Master Pyraminx, random-state
 *   "ivyso"   = Ivy Cube, random-state (in csTimer-Source ueberraschend
 *               im skewb.js-File definiert, nicht in einem eigenen ivy.js)
 *
 * Phase W.cstimer-ivy-switch (2026-05-17): Ivy wurde von unserem Eigenbau-
 * BFS-Solver (ivyScramble.ts) auf csTimer umgeschwenkt fuer Konsistenz.
 * Eigenbau-Solver bleibt als Fallback hinter csTimer im Cascade falls
 * csTimer-Init crashen sollte.
 *
 * Master Skewb hat in csTimer keinen dedizierten Generator (`mgmlsll.js`
 * ist Megaminx-Last-Slot-Last-Layer, nicht Master Skewb) — bleibt auf
 * unserem Random-Move-Fallback.
 */
const APP_TO_CSTIMER: Record<string, string> = {
  gear: "gearso",
  redi: "rediso",
  master_pyraminx: "mpyrso",
  ivy: "ivyso",
  // Phase W.cstimer-more-puzzles (2026-05-17): 10 weitere inoffizielle
  // Cubes via vendored csTimer (1x3x3.js, 2x2x3.js, megaminx.js,
  // utilscramble.js). Alle Random-State (WCA-Quality im Sinne
  // garantierter Mindest-Distanz).
  dino: "dinoso",
  floppy: "133",
  tower: "223",
  // ENTFERNT (QA-Fix 2026-05-17): helicopter/gigaminx/bicube/bandaged_square/
  // square_2/curvy_copter/diamond/megaminx waren im ersten Push enthalten,
  // returnen aber leerstring/null weil src/js/solver/ + weitere lib-Files
  // fehlen. Im Cascade landeten sie still bei scrambow (das die Codes nicht
  // kennt) → User sah "Scramble nicht verfuegbar". Saubere Loesung: vorerst
  // raus, in der Roadmap als P6-Item mit Solver-Vendoring-Aufwand notiert.
};

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
    // Phase W.cstimer-more-puzzles-qa (2026-05-17): inoffizielle Cubes
    // bekommen ihren passenden Scramble-Type als Default. Codes matchen
    // UNOFFICIAL_SCRAMBLE_TYPES.code (lowercase, snake_case).
    case "Ivy":
      return "ivy";
    case "Gear":
      return "gear";
    case "Redi":
      return "redi";
    case "Master Pyraminx":
      return "master_pyraminx";
    case "Master Skewb":
      return "master_skewb";
    case "FTO":
      return "fto";
    case "Dino":
      return "dino";
    case "Floppy":
      return "floppy";
    case "Tower":
      return "tower";
    // ENTFERNT (QA-Fix 2026-05-17): broken solver-deps siehe
    // APP_TO_CSTIMER-Kommentar.
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
 * Phase 8.1: csTimer-WCA-Codes (444wca, pyrso, etc.) → scrambow-Codes.
 *
 * Hintergrund: Sessions die aus csTimer-Import stammen haben in
 * `scramble_type` den csTimer-internen Code. Mein Phase-8a-Code hat
 * den unveraendert an scrambow weitergegeben → leerer Scramble bei
 * 4x4/5x5/Pyra/etc. weil scrambow diese Codes nicht kennt.
 *
 * Liste analog zu backend/importers/cstimer.py SCRTYPE_TO_CUBE.
 */
const CSTIMER_TO_SCRAMBOW: Record<string, string> = {
  "": "333",
  "333wca": "333",
  "333oh": "333",
  "333bld": "333",
  "333fm": "333",
  "333mbf": "333",
  "222so": "222",
  "444wca": "444",
  "444bld": "444",
  "555wca": "555",
  "555bld": "555",
  "666wca": "666",
  "777wca": "777",
  "pyrso": "pyraminx",
  "skbso": "skewb",
  "sqrs": "square-1",
  "mgmp": "megaminx",
  "clkwca": "clock",
};

/**
 * Loest einen Session.scramble_type-Override auf den scrambow-Code auf.
 * Reihenfolge:
 *   1. csTimer-Code (z.B. "444wca") → scrambow-Code aus der Map
 *   2. Bereits scrambow-Code, Custom-Puzzle (ivy/gear/...) oder Trainer-
 *      Subset (z.B. "pll", "333") → direkt
 *   3. Unbekannter String → null (Caller faellt auf cube_type-Mapping zurueck)
 */
export function resolveScrambleTypeOverride(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null; // leer = kein Override
  // 1) csTimer-Code
  if (trimmed in CSTIMER_TO_SCRAMBOW) {
    return CSTIMER_TO_SCRAMBOW[trimmed];
  }
  // 2) Bereits scrambow-Code? Wir akzeptieren alles was scrambow kennt,
  //    unsere Custom-Puzzles und alles aus der Trainer-Subset-Liste.
  //    Whitelist statt Blackbox.
  const known = new Set([
    ...WCA_SCRAMBLE_TYPES.map((t) => t.code),
    ...UNOFFICIAL_SCRAMBLE_TYPES.map((t) => t.code),
    "fto",
    ...ALG_TRAINER_SUBSETS,
  ]);
  if (known.has(trimmed)) return trimmed;
  // 3) Unbekannt → Caller soll Override ignorieren
  return null;
}

// =====================================================================
// Scramble-Kategorien fuer die Picker-UI in ScrambleCard (Welle 3,
// 2026-05-16). WCA = offizielle Wettkampf-Cubes, Inoffiziell = alles
// andere, was wir scramblen koennen (teils via scrambow, teils via
// unserem eigenen Random-Move-Fallback weiter unten).
// =====================================================================

export interface ScrambleTypeInfo {
  /** scrambow-Code oder CUSTOM_PUZZLE_SPECS-Key */
  code: string;
  /** UI-Label (Deutsch / kurz) */
  label: string;
}

/** WCA-Cubes — alle haben einen scrambow-Generator. */
export const WCA_SCRAMBLE_TYPES: ScrambleTypeInfo[] = [
  { code: "333", label: "3x3" },
  { code: "222", label: "2x2" },
  { code: "444", label: "4x4" },
  { code: "555", label: "5x5" },
  { code: "666", label: "6x6" },
  { code: "777", label: "7x7" },
  { code: "pyraminx", label: "Pyraminx" },
  { code: "skewb", label: "Skewb" },
  { code: "square-1", label: "Square-1" },
  { code: "megaminx", label: "Megaminx" },
  { code: "clock", label: "Clock" },
];

/**
 * Inoffizielle Puzzles. Teilweise via scrambow (fto), teils via
 * eigenem Random-Move-Generator (ivy, gear, redi, master pyraminx,
 * master skewb). Die eigenen Scrambles sind NICHT WCA-quality
 * (keine garantierte Mindest-Distanz), aber gut genug fuer Casual-
 * Training.
 */
export const UNOFFICIAL_SCRAMBLE_TYPES: ScrambleTypeInfo[] = [
  // Phase 8a — urspruenglicher Bestand (Eigenbau-Random-Move / Eigenbau-BFS)
  { code: "ivy", label: "Ivy Cube" },
  { code: "gear", label: "Gear Cube" },
  { code: "redi", label: "Redi Cube" },
  { code: "master_pyraminx", label: "Master Pyraminx" },
  { code: "master_skewb", label: "Master Skewb" },
  { code: "fto", label: "FTO (Face-Turning Octahedron)" },
  // Phase W.cstimer-more-puzzles (2026-05-17) — funktionierende neue Cubes
  { code: "dino", label: "Dino Cube" },
  { code: "floppy", label: "Floppy Cube (1x3x3)" },
  { code: "tower", label: "Tower Cube (2x2x3)" },
  // ENTFERNT (QA-Fix 2026-05-17): helicopter/gigaminx/bicube/bandaged_square/
  // square_2/curvy_copter/diamond brauchen src/js/solver/-Files die wir noch
  // nicht vendored haben. Returnten leerstring → "Scramble nicht verfuegbar"
  // in UI. Bis solver-Vendoring (Roadmap P6) raus aus User-facing Liste.
];

/**
 * Defaul-Scramble-Code fuer einen App-cube_type — Convenience-Wrapper,
 * gibt dasselbe zurueck wie cubeTypeToScrambowType, aber semantisch
 * klar als „passender Default fuer den Picker" gemeint.
 */
export function defaultScrambleTypeForCube(cubeType: string): string {
  return cubeTypeToScrambowType(cubeType);
}

/**
 * Spec fuer den eigenen Random-Move-Generator. `moves` = Basis-Faces,
 * `modifiers` = Suffixe (z.B. "" oder "'"), `length` = Default-Move-Count.
 * Konsekutiv-Filter: kein direkt wiederholtes Base-Move (z.B. "L L'" raus).
 */
interface CustomScrambleSpec {
  moves: string[];
  modifiers: string[];
  length: number;
}

const CUSTOM_PUZZLE_SPECS: Record<string, CustomScrambleSpec> = {
  // Ivy Cube — Fix 2026-05-17 nach User-Hinweis dass Scrambles nicht
  // korrekt waren. Korrekte Standard-Notation (Speedsolving-Wiki):
  // 4 Eck-Achsen U/L/R/B (NICHT F — meine vorherige Liste war falsch).
  // Modifier "'" fuer CCW. 8-Move-Scrambles sind csTimer-Default.
  // Quelle: https://www.speedsolving.com/wiki/index.php/Ivy_Cube
  ivy: {
    moves: ["U", "L", "R", "B"],
    modifiers: ["", "'"],
    length: 8,
  },
  // Gear Cube — Fix 2026-05-17 (kritischster Bug der alten Version).
  // Wegen der Zahnrad-Mechanik sind NUR 180°-Drehungen physikalisch
  // moeglich — 90°-Turns gibt's nicht. Alle 6 Faces mit ausschliesslich
  // "2"-Suffix. Quelle: https://en.wikipedia.org/wiki/Gear_Cube
  // Vorher hatte ich faelschlich nur 3 Faces + Mischung 90°/180° —
  // beide grob falsch.
  gear: {
    moves: ["U", "D", "L", "R", "F", "B"],
    modifiers: ["2"],
    length: 12,
  },
  // Redi Cube — csTimer nutzt eine MoYu-Notation, die uneinheitlich
  // dokumentiert ist (mehrere Varianten in der Community). Wir bleiben
  // bei der Gross-/Kleinbuchstaben-Variante mit CCW-Suffix. Nicht
  // perfekt csTimer-kompatibel, aber inhaltlich plausibel.
  redi: {
    moves: ["L", "R", "B", "F", "l", "r", "b", "f"],
    modifiers: ["", "'"],
    length: 15,
  },
  // Master Pyraminx: 4 Tip-Achsen (gross) + 4 Wide-Layer (klein),
  // jeweils mit CCW-Option.
  master_pyraminx: {
    moves: ["U", "L", "R", "B", "u", "l", "r", "b"],
    modifiers: ["", "'"],
    length: 25,
  },
  // Master Skewb: analog Master Pyraminx (4 Corner + Wides).
  master_skewb: {
    moves: ["U", "L", "R", "B", "u", "l", "r", "b"],
    modifiers: ["", "'"],
    length: 25,
  },
};

/** Random-Helper — Math.random ist fuer Scrambles voellig ausreichend. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Erzeugt einen Random-Move-Scramble nach der Spec. „Kein direktes
 * Wiederholen derselben Base"-Filter (sonst kommen Moves wie "L L'"
 * raus, die effektiv nichts tun).
 *
 * QA-Fix Welle 3 (2026-05-16): Defensive Guard fuer `spec.moves.length < 2`.
 * Ohne Guard waere die while-Schleife ein Endlos-Loop (jeder neue Pick
 * waere immer derselbe wie lastBase, continue, repeat). Aktuell hat keine
 * Spec nur 1 Move — aber bei einem zukuenftigen Konfig-Tippfehler wuerde
 * der Tab haengen. Bei <2 Moves geben wir den Filter auf — Qualitaet
 * wird dann schlechter, aber Tab bleibt responsive.
 */
function generateCustomScramble(spec: CustomScrambleSpec): string {
  const moves: string[] = [];
  const filterEnabled = spec.moves.length >= 2;
  let lastBase: string | null = null;
  while (moves.length < spec.length) {
    const base = pick(spec.moves);
    if (filterEnabled && base === lastBase) continue;
    lastBase = base;
    const mod = pick(spec.modifiers);
    moves.push(base + mod);
  }
  return moves.join(" ");
}

/**
 * Liste der Custom-Puzzles, die einen Random-State-Scrambler haben
 * (= WCA-Quality, im Sinne von "korrekte Mindest-Distanz garantiert").
 * Wird von der UI genutzt um den „nicht WCA-Quality"-Disclaimer NUR
 * fuer die Random-Move-Puzzles anzuzeigen.
 *
 * Alle ausser master_skewb haben jetzt Random-State (W.cstimer-vendor +
 * W.cstimer-more-puzzles, 2026-05-17). Ivy hat zudem Eigenbau-BFS als
 * Fallback (ivyScramble.ts).
 */
const RANDOM_STATE_PUZZLES = new Set<string>([
  "ivy",
  "gear",
  "redi",
  "master_pyraminx",
  // Phase W.cstimer-more-puzzles (2026-05-17):
  "dino",
  "floppy",
  "tower",
  // 7 weitere (heli/giga/etc.) sind raus seit QA-Fix — brauchen solver/-Files.
]);

export function isWcaQualityCustomPuzzle(code: string): boolean {
  return RANDOM_STATE_PUZZLES.has(code);
}

/**
 * Generiert einen Scramble-String fuer den gegebenen Typ (cube_type
 * oder scramble_type-override aus Session).
 *
 * Reihenfolge:
 *   1. Eigener Random-State-Solver verfuegbar? → WCA-Quality
 *   2. Sonst: Custom-Puzzle-Spec? → Random-Move-Generator
 *   3. Sonst: scrambow probieren (WCA-Cubes + FTO)
 *   4. Bei Fehler → leerer String (UI zeigt Fallback-Meldung)
 *
 * Wir crashen nicht, weil ein fehlender Scramble den Timer nicht
 * blockieren soll.
 */
export function generateScramble(typeOverride: string): string {
  // 1) csTimer-Random-State-Scrambler (Phase W.cstimer-vendor, 2026-05-17;
  //    Ivy ergaenzt in W.cstimer-ivy-switch): gear/redi/master_pyraminx/ivy
  //    via vendored GPL-v3-Modul. Bei csTimer-Init-Crash → Fallback weiter
  //    unten greift (defensive).
  if (typeOverride in APP_TO_CSTIMER) {
    const cstimerType = APP_TO_CSTIMER[typeOverride];
    try {
      const s = getCstimerScramble(cstimerType);
      if (s && s.trim().length > 0) return s;
    } catch {
      // weiter zur naechsten Stufe
    }
  }
  // 2) Eigenbau-BFS-Solver fuer Ivy als Fallback (falls csTimer
   //    fehlschlaegt). Bleibt als Sicherheits-Netz seit W.cstimer-ivy-switch.
  if (typeOverride === "ivy") {
    try {
      const s = generateIvyScramble();
      if (s && s.trim().length > 0) return s;
    } catch {
      // Fallback auf Random-Move wenn Solver-Bug auftritt
    }
  }
  // 3) Custom Puzzles mit Random-Move-Spec (Fallback fuer master_skewb
  //    + zusaetzliches Sicherheits-Netz)
  if (typeOverride in CUSTOM_PUZZLE_SPECS) {
    return generateCustomScramble(CUSTOM_PUZZLE_SPECS[typeOverride]);
  }
  // 4) scrambow-Pfad (WCA + FTO + Trainer-Subsets)
  try {
    const scrambow = new Scrambow().setType(typeOverride);
    const result = scrambow.get(1);
    return result[0]?.scramble_string ?? "";
  } catch {
    return "";
  }
}

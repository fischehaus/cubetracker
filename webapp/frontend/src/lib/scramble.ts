// Scramble-Generierung (Phase 8a) — duenner Wrapper um scrambow + eigene
// Random-Move-Generatoren für Puzzles, die scrambow nicht abdeckt.
//
// scrambow = csTimer-Algorithmen geportet, deckt alle WCA-Events +
// die meisten Subsets für Algorithmus-Training ab. Aber: Ivy, Gear,
// Redi, Master Pyraminx, Master Skewb sind NICHT in scrambow drin.
// Für diese liefern wir einen einfachen Random-Move-Scrambler mit
// „kein direktes Wiederholen derselben Achse"-Filter — nicht
// WCA-quality, aber sauber für Casual-Training.
//
// Architektur: pure helpers + Kategorie-Listen für die UI.
//
// Kein Singleton-State — jeder Aufruf macht eine frische Scrambow-
// Instanz. Das ist OK weil scrambow keine teure Initialisierung hat
// und wir so race-conditions zwischen concurrent generations vermeiden.

// Bundle-Split (W.cstimer-dynamic-import, 2026-05-30):
// Die drei Scramble-Vendors (scrambow ~50 KB + cstimer-vendor ~140 KB
// unminified + ivyScramble klein) werden NICHT mehr top-level importiert,
// sondern lazy via dynamischem `import()` bei der ersten generateScramble-
// Anfrage geladen. Vorteile:
//   - Initial-Bundle (Login-Page, Stats-Tabs) wird ~50-80 KB minified
//     kleiner — sichtbar bei jedem Erstladen.
//   - Pure Helpers + Konstanten (Picker-UI etc.) bleiben sync verfügbar,
//     keine UI-Latenz beim Card-Mount.
//   - Bei Smoke-Test-Aufrufen werden die Vendors nur geladen wenn
//     wirklich generateScramble läuft — Test-Setup wird stabiler.
//
// Caveat: generateScramble + generateCustomScramble wurden zu async.
// ScrambleCard.tsx prefetched die Vendors beim Mount (fire-and-forget),
// damit der erste User-Klick auf "Skip" ohne spürbare Latenz ist.
//
// Die Vendor-Hintergründe (warum scrambow PATCHED ist, warum csTimer
// GPL-v3 als Vendor) sind unverändert — siehe alte Versionen in git
// blame falls man den Kontext braucht.

type ScrambowCtor = typeof import("../vendor/scrambow-patched").Scrambow;
type GetCstimerScramble = typeof import("./cstimer-vendor").getCstimerScramble;
type GenerateIvyScramble = typeof import("./ivyScramble").generateIvyScramble;

interface ScrambleVendors {
  Scrambow: ScrambowCtor;
  getCstimerScramble: GetCstimerScramble;
  generateIvyScramble: GenerateIvyScramble;
}

let vendorCache: Promise<ScrambleVendors> | null = null;

/**
 * Lädt die Scramble-Vendors lazy + memoiziert die Promise (idempotent,
 * parallele Calls warten auf denselben Promise statt zweimal zu fetchen).
 * Bei späteren Calls Mikrotask-schnell, weil die import-Promise resolved
 * ist und nur der Memo-Wert zurückgegeben wird.
 */
async function loadScrambleVendors(): Promise<ScrambleVendors> {
  if (!vendorCache) {
    // QA-Fix W.cstimer-dynamic-import (KRITISCH): bei einem Reject
    // (Network-Glitch, CDN-Hiccup beim Chunk-Fetch) MUSS der Cache
    // genullt werden — sonst awaitet jeder Folge-Call den rejected
    // Promise und Scramble-Generierung bleibt bis Hard-Reload tot.
    // Mit dem catch-Hook macht der nächste Call einen frischen
    // import()-Versuch.
    vendorCache = Promise.all([
      import("../vendor/scrambow-patched"),
      import("./cstimer-vendor"),
      import("./ivyScramble"),
    ])
      .then(([scrambow, cstimer, ivy]) => ({
        Scrambow: scrambow.Scrambow,
        getCstimerScramble: cstimer.getCstimerScramble,
        generateIvyScramble: ivy.generateIvyScramble,
      }))
      .catch((err) => {
        vendorCache = null;
        throw err;
      });
  }
  return vendorCache;
}

/**
 * Opportunistisches Vorladen — Caller (ScrambleCard.tsx beim Mount)
 * triggert dies fire-and-forget, damit zum ersten Scramble-Klick
 * alles im Hot-Cache liegt.
 */
export function prefetchScrambleVendors(): void {
  void loadScrambleVendors();
}

/**
 * Mapping unserer App-Codes auf csTimer-internal-Types. Nur Einträge
 * hier werden via csTimer-Pfad bedient — andere fallen auf scrambow
 * oder Random-Move zurück.
 *
 *   "gearso"  = Gear Cube, random-state-shortened (csTimer-Default, 4-10 moves)
 *   "rediso"  = Redi Cube, random-state
 *   "mpyrso"  = Master Pyraminx, random-state
 *   "ivyso"   = Ivy Cube, random-state (in csTimer-Source überraschend
 *               im skewb.js-File definiert, nicht in einem eigenen ivy.js)
 *
 * Phase W.cstimer-ivy-switch (2026-05-17): Ivy wurde von unserem Eigenbau-
 * BFS-Solver (ivyScramble.ts) auf csTimer umgeschwenkt für Konsistenz.
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
  // kennt) → User sah "Scramble nicht verfügbar". Saubere Lösung: vorerst
  // raus, in der Roadmap als P6-Item mit Solver-Vendoring-Aufwand notiert.
};

/**
 * Mappt einen App-cube_type ("3x3", "OH", "Pyraminx", …) auf den
 * scrambow-internen Typen-Code.
 *
 * OH und 3BLD nutzen jeweils 3x3-WCA-Scrambles (csTimer-Konvention).
 * Unbekannte cube_types fallen auf 333 zurück — sicherer Default,
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
    // Big Cubes (W.big-cube-scramble, 2026-06-06) — keine WCA-Events, eigener
    // csTimer-kompatibler Random-Move-Generator (BIG_CUBE_SPECS).
    case "8x8":
      return "888";
    case "9x9":
      return "999";
    case "10x10":
      return "101010";
    case "11x11":
      return "111111";
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
 * Subset-IDs für den Algorithm-Trainer (Phase 8b verwendet).
 * Bewusst eine eigene Liste: nicht jeder scrambow-type ist ein
 * Trainings-Subset (444, mega etc. sind Events, keine Subsets).
 *
 * Liste konservativ — nur was im MVP wirklich getestet ist.
 * Erweiterung später ohne Backend-Änderung möglich.
 */
export const ALG_TRAINER_SUBSETS = ["pll", "oll"] as const;
export type AlgTrainerSubset = (typeof ALG_TRAINER_SUBSETS)[number];

/**
 * Liste aller für ScrambleType-Override unterstützten Strings.
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
 * den unverändert an scrambow weitergegeben → leerer Scramble bei
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
  // FTO (W.fto-cstimer-roundtrip): csTimer-scrType "ftoso" → unser interner
  // Scramble-Code "fto". Konsistent mit SCRTYPE_TO_CUBE im Backend-Importer.
  "ftoso": "fto",
};

/**
 * Löst einen Session.scramble_type-Override auf den scrambow-Code auf.
 * Reihenfolge:
 *   1. csTimer-Code (z.B. "444wca") → scrambow-Code aus der Map
 *   2. Bereits scrambow-Code, Custom-Puzzle (ivy/gear/...) oder Trainer-
 *      Subset (z.B. "pll", "333") → direkt
 *   3. Unbekannter String → null (Caller fällt auf cube_type-Mapping zurück)
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
    ...BIG_CUBE_SCRAMBLE_TYPES.map((t) => t.code),
    ...UNOFFICIAL_SCRAMBLE_TYPES.map((t) => t.code),
    "fto",
    ...ALG_TRAINER_SUBSETS,
  ]);
  if (known.has(trimmed)) return trimmed;
  // 3) Unbekannt → Caller soll Override ignorieren
  return null;
}

// =====================================================================
// Scramble-Kategorien für die Picker-UI in ScrambleCard (Welle 3,
// 2026-05-16). WCA = offizielle Wettkampf-Cubes, Inoffiziell = alles
// andere, was wir scramblen können (teils via scrambow, teils via
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
 * Big Cubes 8x8–11x11 (Welle W.big-cube-scramble, 2026-06-06). KEINE
 * WCA-Events (WCA endet bei 7x7), aber „ernste" NxN-Cubes — daher eine
 * eigene Picker-Kategorie statt sie zu den Spaß-Puzzles zu werfen. Scramble
 * = csTimer-kompatibler Random-Move-Generator (BIG_CUBE_SPECS), SiGN-
 * Notation. Random-Move IST der Standard für große Cubes (auch WCA 6x6/7x7
 * sind random-move, nicht random-state) — also kein Qualitätsverlust.
 */
export const BIG_CUBE_SCRAMBLE_TYPES: ScrambleTypeInfo[] = [
  { code: "888", label: "8x8" },
  { code: "999", label: "9x9" },
  { code: "101010", label: "10x10" },
  { code: "111111", label: "11x11" },
];

/**
 * Inoffizielle Puzzles. Teilweise via scrambow (fto), teils via
 * eigenem Random-Move-Generator (ivy, gear, redi, master pyraminx,
 * master skewb). Die eigenen Scrambles sind NICHT WCA-quality
 * (keine garantierte Mindest-Distanz), aber gut genug für Casual-
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
  // nicht vendored haben. Returnten leerstring → "Scramble nicht verfügbar"
  // in UI. Bis solver-Vendoring (Roadmap P6) raus aus User-facing Liste.
];

/**
 * Defaul-Scramble-Code für einen App-cube_type — Convenience-Wrapper,
 * gibt dasselbe zurück wie cubeTypeToScrambowType, aber semantisch
 * klar als „passender Default für den Picker" gemeint.
 */
export function defaultScrambleTypeForCube(cubeType: string): string {
  return cubeTypeToScrambowType(cubeType);
}

/**
 * Spec für den eigenen Random-Move-Generator. `moves` = Basis-Faces,
 * `modifiers` = Suffixe (z.B. "" oder "'"), `length` = Default-Move-Count.
 * Konsekutiv-Filter: kein direkt wiederholtes Base-Move (z.B. "L L'" raus).
 */
interface CustomScrambleSpec {
  moves: string[];
  modifiers: string[];
  length: number;
}

// Exportiert für isolierte Fallback-Tests (scramble.test.ts) — die
// dino/floppy/tower-Specs greifen nur bei csTimer-Crash, daher nicht über
// generateScramble testbar (csTimer läuft im Test-Env).
export const CUSTOM_PUZZLE_SPECS: Record<string, CustomScrambleSpec> = {
  // Ivy Cube — Fix 2026-05-17 nach User-Hinweis dass Scrambles nicht
  // korrekt waren. Korrekte Standard-Notation (Speedsolving-Wiki):
  // 4 Eck-Achsen U/L/R/B (NICHT F — meine vorherige Liste war falsch).
  // Modifier "'" für CCW. 8-Move-Scrambles sind csTimer-Default.
  // Quelle: https://www.speedsolving.com/wiki/index.php/Ivy_Cube
  ivy: {
    moves: ["U", "L", "R", "B"],
    modifiers: ["", "'"],
    length: 8,
  },
  // Gear Cube — Fix 2026-05-17 (kritischster Bug der alten Version).
  // Wegen der Zahnrad-Mechanik sind NUR 180°-Drehungen physikalisch
  // möglich — 90°-Turns gibt's nicht. Alle 6 Faces mit ausschließlich
  // "2"-Suffix. Quelle: https://en.wikipedia.org/wiki/Gear_Cube
  // Vorher hatte ich fälschlich nur 3 Faces + Mischung 90°/180° —
  // beide grob falsch.
  gear: {
    moves: ["U", "D", "L", "R", "F", "B"],
    modifiers: ["2"],
    length: 12,
  },
  // Redi Cube — csTimer nutzt eine MoYu-Notation, die uneinheitlich
  // dokumentiert ist (mehrere Varianten in der Community). Wir bleiben
  // bei der Groß-/Kleinbuchstaben-Variante mit CCW-Suffix. Nicht
  // perfekt csTimer-kompatibel, aber inhaltlich plausibel.
  redi: {
    moves: ["L", "R", "B", "F", "l", "r", "b", "f"],
    modifiers: ["", "'"],
    length: 15,
  },
  // Master Pyraminx: 4 Tip-Achsen (groß) + 4 Wide-Layer (klein),
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
  // ── Crash-Fallbacks (W.random-move-fallback, 2026-05-29) ──
  // dino/floppy/tower laufen normalerweise über csTimer (APP_TO_CSTIMER,
  // Random-State). Diese Specs greifen NUR falls csTimer-Init crasht —
  // bisher lieferte generateScramble dann "" ("Scramble nicht verfügbar").
  // Notation ist approximativ (nicht exakt csTimer-kompatibel), aber
  // non-empty + plausibel. QA-Befund SOLLTE #3 (2026-05-17).
  dino: {
    // Dino-Cube: Ecken-Twist, hier als 6 Faces CW/CCW approximiert.
    moves: ["U", "R", "F", "D", "L", "B"],
    modifiers: ["", "'"],
    length: 10,
  },
  floppy: {
    // Floppy (1x3x3): flach → nur 180°-Turns sinnvoll.
    moves: ["U", "R", "D", "L"],
    modifiers: ["2"],
    length: 8,
  },
  tower: {
    // Tower (2x2x3): 180° ist auf jeder Fläche legal → uniform "2".
    moves: ["U", "D", "R", "F"],
    modifiers: ["2"],
    length: 10,
  },
};

/** Random-Helper — Math.random ist für Scrambles voellig ausreichend. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Erzeugt einen Random-Move-Scramble nach der Spec. „Kein direktes
 * Wiederholen derselben Base"-Filter (sonst kommen Moves wie "L L'"
 * raus, die effektiv nichts tun).
 *
 * QA-Fix Welle 3 (2026-05-16): Defensive Guard für `spec.moves.length < 2`.
 * Ohne Guard wäre die while-Schleife ein Endlos-Loop (jeder neue Pick
 * wäre immer derselbe wie lastBase, continue, repeat). Aktuell hat keine
 * Spec nur 1 Move — aber bei einem zukünftigen Konfig-Tippfehler würde
 * der Tab hängen. Bei <2 Moves geben wir den Filter auf — Qualitaet
 * wird dann schlechter, aber Tab bleibt responsive.
 */
// QA-NICE W.cstimer-dynamic-import: explizite Return-Type-Annotation
// für konsistenten Export-Stil (rest des Files macht es auch).
export function generateCustomScramble(
  spec: CustomScrambleSpec,
): string {
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

/** csTimer-Suffixe für NxN-Moves: keine / 180° / CCW. */
const CUBE_SUFFIXES = ["", "2", "'"];

/**
 * Big-Cube-Spec (8x8–11x11). 1:1 aus csTimers `megascramble.js` `args[]`:
 * `axes` = die drei Achsen-Gruppen (U/D-, R/L-, F/B-Achse), jede mit ihren
 * Layer-Moves in SiGN-Notation (z.B. "u" = 2. Ebene, "3u" = 3. Ebene …).
 * `length` = csTimer-Default-Move-Count (alle vier Größen: 120).
 */
interface BigCubeSpec {
  axes: string[][];
  length: number;
}

/**
 * Achsen-Move-Tabellen exakt aus csTimer (`megascramble.js`, GPL-v3). Die
 * SiGN-Notation skaliert mit N: 8x8 hat innere Layer bis 4er-Tiefe, 11x11
 * bis 5er-Tiefe (bei 11 = 2·5+1 ist die 6. Ebene die fixe Mittelschicht).
 */
export const BIG_CUBE_SPECS: Record<string, BigCubeSpec> = {
  // 8x8x8 (SiGN)
  "888": {
    axes: [
      ["U", "D", "u", "d", "3u", "3d", "4u"],
      ["R", "L", "r", "l", "3r", "3l", "4r"],
      ["F", "B", "f", "b", "3f", "3b", "4f"],
    ],
    length: 120,
  },
  // 9x9x9 (SiGN)
  "999": {
    axes: [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b"],
    ],
    length: 120,
  },
  // 10x10x10 (SiGN)
  "101010": {
    axes: [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d", "5u"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l", "5r"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b", "5f"],
    ],
    length: 120,
  },
  // 11x11x11 (SiGN)
  "111111": {
    axes: [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d", "5u", "5d"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l", "5r", "5l"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b", "5f", "5b"],
    ],
    length: 120,
  },
};

/**
 * Big-Cube-Scramble (8x8–11x11) — exakte Nachbildung von csTimers `mega()`
 * (scramble.js). Pro Move: zufällige Achse + zufällige Ebene; bei
 * Achsenwechsel wird die „in diesem Achsen-Lauf schon benutzte Ebenen"-
 * Bitmaske zurückgesetzt. Folge: dieselbe Achse darf direkt aufeinander
 * folgen, aber NICHT dieselbe Ebene zweimal (parallele Layer wie „U D"
 * sind legal + nicht redundant; „u u" würde sich kombinieren → verboten).
 *
 * Pure (Math.random reicht für Scrambles) — kein Vendor-Chunk nötig.
 */
export function generateBigCubeScramble(spec: BigCubeSpec): string {
  const { axes, length } = spec;
  const out: string[] = [];
  let lastAxis = -1;
  let usedLayers = 0; // Bitmaske der seit dem letzten Achsenwechsel belegten Ebenen
  for (let i = 0; i < length; i++) {
    let axis: number;
    let layer: number;
    // Terminierungs-Garantie: bei Achsenwechsel wird usedLayers=0 VOR dem
    // while-Check gesetzt → jeder Versuch hat P(exit) ≥ 2/3 (3 Achsen,
    // Achsenwechsel = sofortiger Ausstieg). Kein Hängen möglich, selbst wenn
    // alle Ebenen der aktuellen Achse erschöpft sind (QA W.big-cube-scramble).
    do {
      axis = Math.floor(Math.random() * axes.length);
      layer = Math.floor(Math.random() * axes[axis].length);
      if (axis !== lastAxis) {
        usedLayers = 0;
        lastAxis = axis;
      }
    } while (((usedLayers >> layer) & 1) !== 0);
    usedLayers |= 1 << layer;
    out.push(axes[axis][layer] + pick(CUBE_SUFFIXES));
  }
  return out.join(" ");
}

/**
 * Liste der Custom-Puzzles, die einen Random-State-Scrambler haben
 * (= WCA-Quality, im Sinne von "korrekte Mindest-Distanz garantiert").
 * Wird von der UI genutzt um den „nicht WCA-Quality"-Disclaimer NUR
 * für die Random-Move-Puzzles anzuzeigen.
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
 * Generiert einen Scramble-String für den gegebenen Typ (cube_type
 * oder scramble_type-override aus Session).
 *
 * Reihenfolge:
 *   1. Eigener Random-State-Solver verfügbar? → WCA-Quality
 *   2. Sonst: Custom-Puzzle-Spec? → Random-Move-Generator
 *   3. Sonst: scrambow probieren (WCA-Cubes + FTO)
 *   4. Bei Fehler → leerer String (UI zeigt Fallback-Meldung)
 *
 * Wir crashen nicht, weil ein fehlender Scramble den Timer nicht
 * blockieren soll.
 */
export async function generateScramble(typeOverride: string): Promise<string> {
  // 0) Big-Cubes (8x8–11x11, W.big-cube-scramble): csTimer-kompatibler
  //    Random-Move-Generator, pure (kein Vendor). Früher Return — spart den
  //    Vendor-Chunk-Load für große Cubes komplett.
  if (typeOverride in BIG_CUBE_SPECS) {
    return generateBigCubeScramble(BIG_CUBE_SPECS[typeOverride]);
  }
  // W.cstimer-dynamic-import (2026-05-30): vorher war diese Funktion
  // synchron mit top-level Vendor-Imports. Jetzt lazy — die ersten 3
  // Stufen brauchen die Vendor-Funktionen, also wird der Vendor-Chunk
  // einmalig geladen + gecacht (loadScrambleVendors). Memoisiert, also
  // kein Overhead bei Folge-Calls.
  const { getCstimerScramble, generateIvyScramble, Scrambow } =
    await loadScrambleVendors();
  // 1) csTimer-Random-State-Scrambler (Phase W.cstimer-vendor, 2026-05-17;
  //    Ivy ergänzt in W.cstimer-ivy-switch): gear/redi/master_pyraminx/ivy
  //    via vendored GPL-v3-Modul. Bei csTimer-Init-Crash → Fallback weiter
  //    unten greift (defensive).
  if (typeOverride in APP_TO_CSTIMER) {
    const cstimerType = APP_TO_CSTIMER[typeOverride];
    try {
      const s = getCstimerScramble(cstimerType);
      if (s && s.trim().length > 0) return s;
    } catch {
      // weiter zur nächsten Stufe
    }
  }
  // 2) Eigenbau-BFS-Solver für Ivy als Fallback (falls csTimer
   //    fehlschlägt). Bleibt als Sicherheits-Netz seit W.cstimer-ivy-switch.
  if (typeOverride === "ivy") {
    try {
      const s = generateIvyScramble();
      if (s && s.trim().length > 0) return s;
    } catch {
      // Fallback auf Random-Move wenn Solver-Bug auftritt
    }
  }
  // 3) Custom Puzzles mit Random-Move-Spec (Fallback für master_skewb
  //    + zusätzliches Sicherheits-Netz). generateCustomScramble ist pure
  //    (kein Vendor), bleibt sync.
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

// @vitest-environment happy-dom
//
// Smoke-Tests fuer den csTimer-Vendor-Port.
//
// Wir testen NICHT die internal csTimer-Logic — das ist GPL-Code mit
// eigener Verifikations-Historie. Hier nur die Brueckenfunktion:
//   1. Module laden ohne crash
//   2. window.scrMgr ist registriert
//   3. Scrambler fuer gear/redi/master_pyraminx liefern non-empty strings
//   4. Wiederholte Aufrufe produzieren unterschiedliche Scrambles
//      (Random-State → in der Praxis nie identisch)

import { describe, it, expect, beforeAll } from "vitest";
import {
  getCstimerScramble,
  hasCstimerScramble,
  listCstimerTypes,
} from "./index";

// Init via Module-Import (side effect):
// happy-dom hat window — die csTimer-Files registrieren sich dort.
// Erster Aufruf hinter init() ist langsam (Pruning-Tables aufbauen,
// ~hundert ms), danach instant.

beforeAll(() => {
  // Trigger die Initialisierung explizit damit die `before`-Aufrufe
  // erkennbar zaehlen. (Macht eigentlich nichts ausser nochmal-import.)
  expect(typeof window).toBe("object");
});

describe("csTimer-Vendor-Module", () => {
  it("registriert scrMgr global auf window", () => {
    expect(window.scrMgr).toBeDefined();
    expect(typeof window.scrMgr?.scramblers).toBe("object");
  });

  it("listCstimerTypes liefert eine non-empty Liste", () => {
    const types = listCstimerTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });

  it("erwartete Types sind registriert", () => {
    // Funktionierende Types (vendored + getestet):
    expect(hasCstimerScramble("gearso")).toBe(true);
    expect(hasCstimerScramble("rediso")).toBe(true);
    expect(hasCstimerScramble("dinoso")).toBe(true);
    expect(hasCstimerScramble("mpyrso")).toBe(true);
    expect(hasCstimerScramble("pyrso")).toBe(true);
    expect(hasCstimerScramble("ivyso")).toBe(true);
    expect(hasCstimerScramble("133")).toBe(true); // Floppy Cube
    expect(hasCstimerScramble("223")).toBe(true); // Tower Cube
    // Diese Types existieren NICHT (utilscramble/megaminx wurden entfernt
    // im QA-Fix 2026-05-17 weil broken). Kommen bei Solver-Vendoring zurueck.
    expect(hasCstimerScramble("heli")).toBe(false);
    expect(hasCstimerScramble("giga")).toBe(false);
    expect(hasCstimerScramble("bic")).toBe(false);
    expect(hasCstimerScramble("mgmso")).toBe(false);
    // Nicht-registrierter Type
    expect(hasCstimerScramble("does-not-exist-xyz")).toBe(false);
  });

  // QA-Fix #6 (2026-05-17): Char-Whitelist statt nur "non-empty".
  // Faengt Bug-Klassen wie "???" oder "undefined undefined" ab. Pattern:
  //   - Buchstaben (Move-Faces), Ziffern (Modifier 2 / Multi-Slice),
  //   - ' fuer CCW, Klammern fuer Square-1, Slash fuer FTO/Cyclic, Minus
  //     fuer negative SQ1-Werte, Komma fuer komplexe Notations
  //   - Whitespace
  const VALID_SCRAMBLE_CHARS = /^[A-Za-z0-9 '2()\/,\-+]+$/;

  it("getCstimerScramble('gearso') liefert validen Scramble-String", () => {
    const s = getCstimerScramble("gearso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("getCstimerScramble('rediso') liefert validen Scramble-String", () => {
    const s = getCstimerScramble("rediso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("getCstimerScramble('mpyrso') liefert validen Scramble-String", () => {
    const s = getCstimerScramble("mpyrso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("getCstimerScramble('dinoso') liefert validen Scramble-String", () => {
    const s = getCstimerScramble("dinoso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("getCstimerScramble('133') (Floppy) liefert validen Scramble-String", () => {
    const s = getCstimerScramble("133");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("getCstimerScramble('223') (Tower) liefert validen Scramble-String", () => {
    const s = getCstimerScramble("223");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
    expect(s!).toMatch(VALID_SCRAMBLE_CHARS);
  });

  it("unbekannter Type liefert null", () => {
    expect(getCstimerScramble("does-not-exist-xyz")).toBeNull();
  });

  it("zwei aufeinanderfolgende gearso-Scrambles sind verschieden", () => {
    // Random-State: bei genuegend grossem State-Space praktisch nie
    // identische Folge. Falls dieser Test flackert, ist das ein Hinweis
    // auf einen Seed-Bug.
    const a = getCstimerScramble("gearso");
    const b = getCstimerScramble("gearso");
    expect(a).not.toBe(b);
  });
});

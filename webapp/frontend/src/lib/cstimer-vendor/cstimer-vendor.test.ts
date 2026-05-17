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
    // Erwartet aus den vendored modules:
    expect(hasCstimerScramble("gearso")).toBe(true);
    expect(hasCstimerScramble("rediso")).toBe(true);
    expect(hasCstimerScramble("mpyrso")).toBe(true);
    // Aus pyraminx.js zusaetzlich:
    expect(hasCstimerScramble("pyrso")).toBe(true);
    // Nicht-registrierter Type
    expect(hasCstimerScramble("does-not-exist-xyz")).toBe(false);
  });

  it("getCstimerScramble('gearso') liefert non-empty string", () => {
    const s = getCstimerScramble("gearso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
  });

  it("getCstimerScramble('rediso') liefert non-empty string", () => {
    const s = getCstimerScramble("rediso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
  });

  it("getCstimerScramble('mpyrso') liefert non-empty string", () => {
    const s = getCstimerScramble("mpyrso");
    expect(typeof s).toBe("string");
    expect(s?.length ?? 0).toBeGreaterThan(0);
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

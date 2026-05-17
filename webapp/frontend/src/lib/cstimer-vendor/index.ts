// SPDX-License-Identifier: GPL-3.0-or-later
//
// Public-API fuer die vendored csTimer-Scramble-Module.
//
// Architektur:
//   - shim.js polyfillt die genutzten jQuery-Methoden auf window.$
//   - mathlib.js definiert window.mathlib (Permutations-/Solver-Utils)
//   - scramble.js definiert window.scrMgr (Generator-Registry)
//   - Puzzle-Module (gearcube/redi/pyraminx/skewb/mgmlsll) registrieren
//     ihre Scrambler bei window.scrMgr.scramblers[<type>]
//
// Lade-Reihenfolge wird durch die side-effect-Import-Reihenfolge
// erzwungen — JS-Statements werden top-to-bottom ausgefuehrt, ESM-Imports
// auch in Reihenfolge.
//
// Verfuegbare csTimer-Scramble-Typen (subset — wir vendoren nur die 5
// Module die fuer unsere inoffiziellen Cubes relevant sind):
//
//   Gear Cube:      "gearo"   (random-state, ~6-10 moves)
//                   "gearso"  (random-state-shortened)
//   Redi Cube:      "rediso"  (random-state)
//   Dino Cube:      "dinoo"   (random-orientation)
//                   "dinoso"  (random-state)
//   Pyraminx:       "pyrso"   (WCA random-state)
//                   "pyrl4e"  (4-edge-last)
//                   "pyro"    (random-moves)
//   Master Pyra:    "mpyrso"  (random-state)
//   Skewb:          "skbso"   (WCA random-state)
//                   "skbo"    (random-moves)
//   Master Skewb:   "mskbso"  (random-state)
//
// Diese Liste basiert auf der `scrMgr.reg(...)`-Aufrufe in den
// puzzle-Modulen. Erfasst beim Port 2026-05-17 — wenn csTimer-Upstream
// neue Typen registriert, hier nachziehen.

import "./shim.js";
import "./isaac.js"; // ISAAC PRNG, mathlib braucht's fuer setSeed()
import "./mathlib.js";
import "./scramble.js";
import "./gearcube.js";
import "./redi.js";
import "./pyraminx.js";
import "./skewb.js";
import "./mgmlsll.js";

// TypeScript: die Vendor-Files erweitern window mit { mathlib, scrMgr,
// redi, ... }. Wir typisieren nur was wir brauchen.
declare global {
  interface Window {
    scrMgr?: {
      scramblers: Record<string, (type: string, length?: number) => string>;
      reg(types: string | string[], fn: (type: string) => string): unknown;
    };
  }
}

/**
 * Generiert einen Scramble via csTimer-Modul. Returnt null wenn der
 * Type nicht in scrMgr.scramblers registriert ist (defensive — sollte
 * nicht passieren wenn die Module geladen sind).
 *
 * Bei erstem Aufruf werden die csTimer-Module initialisiert (Pruning-
 * Tabellen aufbauen — kann beim allerersten Scramble einige hundert ms
 * dauern, danach instant). Wir koennten das primen, aber lazy ist OK.
 */
export function getCstimerScramble(type: string): string | null {
  if (typeof window === "undefined") return null;
  const mgr = window.scrMgr;
  if (!mgr || !mgr.scramblers) return null;
  const fn = mgr.scramblers[type];
  if (typeof fn !== "function") return null;
  try {
    return fn(type);
  } catch {
    return null;
  }
}

/** Pruefe ob ein csTimer-Type registriert ist. */
export function hasCstimerScramble(type: string): boolean {
  if (typeof window === "undefined") return false;
  const mgr = window.scrMgr;
  return !!(mgr && mgr.scramblers && typeof mgr.scramblers[type] === "function");
}

/** Liste aller registrierten csTimer-Types (fuer Debug/Picker). */
export function listCstimerTypes(): string[] {
  if (typeof window === "undefined") return [];
  const mgr = window.scrMgr;
  if (!mgr || !mgr.scramblers) return [];
  return Object.keys(mgr.scramblers).sort();
}

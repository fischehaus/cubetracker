// Tests für resolveScrambleNetKey (W.scramble-net-type).

import { describe, expect, it } from "vitest";
import { resolveScrambleNetKey } from "./scramble-net-type";
import { cubeTypeToScrambowType } from "./scramble";

describe("resolveScrambleNetKey", () => {
  it("Session 3x3 + Picker 2x2 → 2x2-Net (der gemeldete Bug)", () => {
    expect(resolveScrambleNetKey("3x3", "222")).toBe("2x2");
  });

  it("Session 3x3 + Picker Pyraminx/Skewb → deren Net", () => {
    expect(resolveScrambleNetKey("3x3", "pyraminx")).toBe("Pyraminx");
    expect(resolveScrambleNetKey("3x3", "skewb")).toBe("Skewb");
  });

  it("Scramble-Typ ohne Net (Big Cube, Megaminx, inoffiziell) → kein Bild statt 3x3", () => {
    for (const t of ["888", "megaminx", "square-1", "clock", "ivy", "fto"]) {
      expect(resolveScrambleNetKey("3x3", t)).toBeNull();
    }
  });

  it("Default-Scramble jedes cube_type landet beim selben Net wie bisher", () => {
    for (const ct of [
      "3x3",
      "2x2",
      "4x4",
      "5x5",
      "6x6",
      "7x7",
      "Pyraminx",
      "Skewb",
    ]) {
      expect(resolveScrambleNetKey(ct, cubeTypeToScrambowType(ct))).toBe(ct);
    }
    // OH/3BLD scramblen als 333 → 3x3-Net
    expect(resolveScrambleNetKey("OH", cubeTypeToScrambowType("OH"))).toBe(
      "3x3",
    );
    expect(resolveScrambleNetKey("3BLD", cubeTypeToScrambowType("3BLD"))).toBe(
      "3x3",
    );
  });

  it("ohne Scramble-Typ bleibt der cube_type maßgeblich", () => {
    expect(resolveScrambleNetKey("4x4")).toBe("4x4");
    expect(resolveScrambleNetKey("4x4", null)).toBe("4x4");
  });
});

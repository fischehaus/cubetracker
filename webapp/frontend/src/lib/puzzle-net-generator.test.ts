// @vitest-environment happy-dom
//
// Eigene Datei wegen happy-dom: der csTimer-Vendor (isaac.js) braucht window;
// die Oracle-Tests in puzzle-net.test.ts laufen bewusst im Node-Environment.
import { describe, it, expect } from "vitest";
import { PYRAMINX_NET } from "./puzzle-net-data/pyraminx";
import { SKEWB_NET } from "./puzzle-net-data/skewb";
import { generateScramble } from "./scramble";

// QA W.scramble-net-skewb (SOLLTE): applyPuzzleScramble ignoriert unbekannte
// Tokens still. Dieser Test verbindet den echten App-Generator mit den
// gebackenen Move-Tabellen — eine Notations-Drift fiele sonst nicht auf.
describe("puzzle-net: echter App-Generator ↔ gebackene Moves", () => {
  const cases = [
    { code: "skewb", data: SKEWB_NET },
    { code: "pyraminx", data: PYRAMINX_NET },
  ];
  for (const { code, data } of cases) {
    it(`jedes Token aus generateScramble("${code}") ist ein bekannter Move`, async () => {
      for (let i = 0; i < 10; i++) {
        const s = await generateScramble(code);
        const tokens = s.split(/\s+/).filter((x) => x.length > 0);
        expect(tokens.length).toBeGreaterThan(0);
        const unknown = tokens.filter((t) => !(t in data.moves));
        expect(unknown, `Scramble: ${s}`).toEqual([]);
      }
    }, 30000);
  }
});

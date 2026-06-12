// PLL-Visualisierung — Bilder-Map (W.alg-diagrams-v2, 2026-06-13).
//
// 21 statische PNG-Imports aus src/assets/pll/ — exakt das Muster von
// oll-images.ts: Vite bundled die Imports automatisch + liefert
// URL-Strings, jedes Bild ist damit tree-shaking-fest referenziert.
// Schließt das Phase-8.3.2-TODO („PLL-Bilder fehlen aktuell").
//
// Bild-Quelle: User-generierte PLL-Diagramme (scripts/render_pll.py) —
// Top-Ansicht mit Permutations-Pfeilen + Seiten-Stickern, Dark-Theme-
// konform. Keys = case_id aus lib/algs.ts:PLL_CASES.

import pllAa from '../assets/pll/PLL_Aa.png';
import pllAb from '../assets/pll/PLL_Ab.png';
import pllE from '../assets/pll/PLL_E.png';
import pllF from '../assets/pll/PLL_F.png';
import pllGa from '../assets/pll/PLL_Ga.png';
import pllGb from '../assets/pll/PLL_Gb.png';
import pllGc from '../assets/pll/PLL_Gc.png';
import pllGd from '../assets/pll/PLL_Gd.png';
import pllH from '../assets/pll/PLL_H.png';
import pllJa from '../assets/pll/PLL_Ja.png';
import pllJb from '../assets/pll/PLL_Jb.png';
import pllNa from '../assets/pll/PLL_Na.png';
import pllNb from '../assets/pll/PLL_Nb.png';
import pllRa from '../assets/pll/PLL_Ra.png';
import pllRb from '../assets/pll/PLL_Rb.png';
import pllT from '../assets/pll/PLL_T.png';
import pllUa from '../assets/pll/PLL_Ua.png';
import pllUb from '../assets/pll/PLL_Ub.png';
import pllV from '../assets/pll/PLL_V.png';
import pllY from '../assets/pll/PLL_Y.png';
import pllZ from '../assets/pll/PLL_Z.png';

const PLL_IMAGES: Record<string, string> = {
  'PLL-Aa': pllAa,
  'PLL-Ab': pllAb,
  'PLL-E': pllE,
  'PLL-F': pllF,
  'PLL-Ga': pllGa,
  'PLL-Gb': pllGb,
  'PLL-Gc': pllGc,
  'PLL-Gd': pllGd,
  'PLL-H': pllH,
  'PLL-Ja': pllJa,
  'PLL-Jb': pllJb,
  'PLL-Na': pllNa,
  'PLL-Nb': pllNb,
  'PLL-Ra': pllRa,
  'PLL-Rb': pllRb,
  'PLL-T': pllT,
  'PLL-Ua': pllUa,
  'PLL-Ub': pllUb,
  'PLL-V': pllV,
  'PLL-Y': pllY,
  'PLL-Z': pllZ,
};

export function getPllImage(caseId: string): string | null {
  return PLL_IMAGES[caseId] ?? null;
}

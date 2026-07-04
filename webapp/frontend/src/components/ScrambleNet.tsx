// ScrambleNet (Phase W.scramble-image, 2026-05-17; NxN ergänzt
// W.scramble-net-nxn 2026-06-29) — React-Wrapper um die Cube-Net-Renderer.
// Rendert das 2D-Cross-Layout-Bild für einen Scramble.
//
// Dispatch nach cubeType:
//   - 3x3/OH/3BLD → cube-net.ts (getesteter 3x3-Renderer, unverändert)
//   - 2x2/4x4/5x5/6x6/7x7 → cube-net-nxn.ts (generischer NxN-Renderer)
//   - alles andere (Pyraminx/Skewb/Sq1/Mega/Clock) → null (andere Geometrie)
//   - useMemo cached das SVG pro (scramble, stickerPx) — bei jedem Re-
//     Render der ScrambleCard ohne Scramble-Änderung kein erneutes Parsen.
//   - SVG via dangerouslySetInnerHTML — der String ist 100% von uns
//     generiert, kein User-Input → XSS-frei.
//   - Aria-label damit Screen-Reader was Sinnvolles vorlesen können,
//     sonst „img" ohne Beschreibung.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { renderScrambleSvg } from "../lib/cube-net";
import { renderScrambleNxnSvg } from "../lib/cube-net-nxn";
import {
  renderScramblePuzzleNetSvg,
  type PuzzleNetData,
} from "../lib/puzzle-net";
import { PYRAMINX_NET } from "../lib/puzzle-net-data/pyraminx";

interface Props {
  /** Der Scramble-String. Leer / null → solved-Cube wird gerendert. */
  scramble: string;
  /** App-cube_type, z.B. "3x3". Nur "3x3" rendert aktuell. */
  cubeType: string;
  /** Sticker-Kantenlaenge in px. Default 18 (passt zu typischer Card-Breite). */
  stickerPx?: number;
}

/** 3x3-Familie: eigener (getesteter) 3x3-Renderer aus cube-net.ts.
 *  OH = One-Handed, 3BLD = Blindfold — mechanisch 3x3-Scrambles. */
const THREE_BY_THREE = new Set(["3x3", "OH", "3BLD"]);

/** Weitere NxN-Cubes (W.scramble-net-nxn, 2026-06-29) → generischer Renderer
 *  cube-net-nxn.ts. */
const NXN_BY_TYPE: Record<string, number> = {
  "2x2": 2,
  "4x4": 4,
  "5x5": 5,
  "6x6": 6,
  "7x7": 7,
};

/** Piece-basierte Nicht-Cube-Puzzles (W.scramble-net-pyraminx, 2026-06-29):
 *  eigener leichter Applier/Renderer (puzzle-net.ts) mit aus cubing.js
 *  gebackenen Daten (Geometrie + Move-Transforms). Skewb/Megaminx folgen;
 *  Square-1 (shape-shifting) + Clock (Zifferblätter) separat/gar nicht. */
const PUZZLE_NET_BY_TYPE: Record<string, PuzzleNetData> = {
  Pyraminx: PYRAMINX_NET,
};

/**
 * Public-Helper: weiss der Aufrufer (z.B. ScrambleCard), ob für diesen
 * Cube-Type überhaupt ein 2D-Net gerendert wird. Wird genutzt, um den
 * Toggle-Button nur dann anzuzeigen wenn er auch eine Wirkung hat —
 * sonst wäre er irreführend ("Toggle tut nichts").
 */
export function isScrambleNetSupported(cubeType: string): boolean {
  return (
    THREE_BY_THREE.has(cubeType) ||
    cubeType in NXN_BY_TYPE ||
    cubeType in PUZZLE_NET_BY_TYPE
  );
}

/** Sticker-Größe je N, sodass die Gesamtbreite ~konstant bleibt: `base` ist
 *  die 3x3-Sticker-Größe (3 Faces breit) → bei NxN auf n Faces umgerechnet.
 *  So wirkt ein Caller-Override (`stickerPx`-Prop) auch im NxN-Pfad. Clamp
 *  [7,28] — 7x7 wäre sonst zu breit. */
function nxnStickerPx(n: number, base: number): number {
  return Math.max(7, Math.min(28, Math.round((base * 3) / n)));
}

export function ScrambleNet({ scramble, cubeType, stickerPx = 18 }: Props) {
  const { t } = useTranslation();
  const svgString = useMemo(() => {
    try {
      if (THREE_BY_THREE.has(cubeType)) {
        return renderScrambleSvg(scramble || "", { stickerPx });
      }
      const n = NXN_BY_TYPE[cubeType];
      if (n) {
        return renderScrambleNxnSvg(n, scramble || "", {
          stickerPx: nxnStickerPx(n, stickerPx),
        });
      }
      const puzzleData = PUZZLE_NET_BY_TYPE[cubeType];
      if (puzzleData) {
        return renderScramblePuzzleNetSvg(puzzleData, scramble || "", {
          width: 220,
        });
      }
      return null;
    } catch {
      // Defensive — wenn der Render-Pfad crasht (sollte nicht, aber),
      // zeigen wir lieber nichts als die ganze ScrambleCard zu killen.
      return null;
    }
  }, [scramble, cubeType, stickerPx]);

  if (!svgString) return null;

  return (
    <div
      className="mt-3 flex justify-center"
      aria-label={t("scramble.netAriaLabel", {
        scramble: scramble || t("scramble.netSolvedFallback"),
      })}
    >
      <div
        // dangerouslySetInnerHTML: der String ist von cube-net.ts generiert,
        // kein User-Input fliesst da rein → XSS-sicher.
        dangerouslySetInnerHTML={{ __html: svgString }}
        className="inline-block rounded border border-gray-700/50 bg-gray-900 p-2"
      />
    </div>
  );
}

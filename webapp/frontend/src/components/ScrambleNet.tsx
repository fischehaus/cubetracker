// ScrambleNet (Phase W.scramble-image, 2026-05-17) — React-Wrapper um
// cube-net.ts. Rendert das 2D-Cross-Layout-Bild für einen 3x3-Scramble.
//
// Bewusst gehalten:
//   - Nur 3x3 (cubeType "3x3"). Andere Cubes → nichts rendern (kein
//     misleading-Bild, kein Crash). Wenn später 2x2/4x4-Support kommt,
//     hier dispatchen.
//   - useMemo cached das SVG pro (scramble, stickerPx) — bei jedem Re-
//     Render der ScrambleCard ohne Scramble-Änderung kein erneutes Parsen.
//   - SVG via dangerouslySetInnerHTML — der String ist 100% von uns
//     generiert, kein User-Input → XSS-frei.
//   - Aria-label damit Screen-Reader was Sinnvolles vorlesen können,
//     sonst „img" ohne Beschreibung.

import { useMemo } from "react";
import { renderScrambleSvg } from "../lib/cube-net";

interface Props {
  /** Der Scramble-String. Leer / null → solved-Cube wird gerendert. */
  scramble: string;
  /** App-cube_type, z.B. "3x3". Nur "3x3" rendert aktuell. */
  cubeType: string;
  /** Sticker-Kantenlaenge in px. Default 18 (passt zu typischer Card-Breite). */
  stickerPx?: number;
}

/** Akzeptierte Cube-Types für dieses Modul. Aktuell 3x3 + alle Cube-Types
 *  die mechanisch 3x3-Scrambles nutzen (OH = One-Handed, 3BLD = Blindfold
 *  3x3) — QA-Fix #5 vom 2026-05-17.
 *  Andere („Pyraminx", "4x4", ...) → return null, ScrambleCard zeigt nichts. */
const SUPPORTED_TYPES = new Set(["3x3", "OH", "3BLD"]);

/**
 * Public-Helper: weiss der Aufrufer (z.B. ScrambleCard), ob für diesen
 * Cube-Type überhaupt ein 2D-Net gerendert wird. Wird genutzt, um den
 * Toggle-Button nur dann anzuzeigen wenn er auch eine Wirkung hat —
 * sonst wäre er irreführend ("Toggle tut nichts").
 */
export function isScrambleNetSupported(cubeType: string): boolean {
  return SUPPORTED_TYPES.has(cubeType);
}

export function ScrambleNet({ scramble, cubeType, stickerPx = 18 }: Props) {
  const svgString = useMemo(() => {
    if (!SUPPORTED_TYPES.has(cubeType)) return null;
    try {
      return renderScrambleSvg(scramble || "", { stickerPx });
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
      aria-label={`2D-Cube-Net nach Scramble: ${scramble || "gelöst"}`}
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

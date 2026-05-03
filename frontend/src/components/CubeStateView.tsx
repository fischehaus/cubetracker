// CubeStateView (Phase 8.3.1) — zeigt das visuelle Cube-State-Diagramm
// fuer einen Algorithmus-Case (OLL/PLL).
//
// Aktuell: nur OLL hat Bilder (von User generiert). PLL kommt spaeter.
// Bei unbekannten/fehlenden Cases zeigt der Component dezent „kein
// Diagramm verfuegbar".

import { getOllImage } from "../lib/oll-images";

interface Props {
  /** Case-ID wie "OLL-1", "OLL-21", "PLL-T", ... */
  caseId: string;
  /** Visuelle Variante: "small" fuer case-grid-Tile, "large" fuer DrillCard */
  size?: "small" | "large";
  /** Optional: alt-text fuer screen reader */
  alt?: string;
}

export function CubeStateView({ caseId, size = "small", alt }: Props) {
  // Aktuell nur OLL — PLL gibt null zurueck und wir zeigen Placeholder.
  const url = caseId.startsWith("OLL-") ? getOllImage(caseId) : null;

  const dims =
    size === "large"
      ? "w-72 h-52" // 288px x 208px (DrillCard) — Phase 8.4-Update: groesseres Drill-Fenster
      : "w-16 h-11"; // 64px x 44px (case-grid)

  if (!url) {
    return (
      <div
        className={`${dims} rounded border border-dashed border-gray-700 bg-gray-900/30 flex items-center justify-center text-gray-600 text-xs`}
        title={`Kein Diagramm verfuegbar fuer ${caseId}`}
      >
        ∅
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? `Cube-State-Diagramm fuer ${caseId}`}
      className={`${dims} rounded object-contain bg-gray-900/40`}
      loading="lazy"
    />
  );
}

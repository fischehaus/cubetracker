// CubeStateView (Phase 8.3.1) — zeigt das visuelle Cube-State-Diagramm
// für einen Algorithmus-Case (OLL/PLL).
//
// Aktuell: nur OLL hat Bilder (von User generiert). PLL kommt später.
// Bei unbekannten/fehlenden Cases zeigt der Component dezent „kein
// Diagramm verfügbar".

import { useTranslation } from "react-i18next";
import { getOllImage } from "../lib/oll-images";

interface Props {
  /** Case-ID wie "OLL-1", "OLL-21", "PLL-T", ... */
  caseId: string;
  /** Visuelle Variante: "small" für case-grid-Tile, "large" für DrillCard */
  size?: "small" | "large";
  /** Optional: alt-text für screen reader */
  alt?: string;
}

export function CubeStateView({ caseId, size = "small", alt }: Props) {
  const { t } = useTranslation();
  // Aktuell nur OLL — PLL gibt null zurück und wir zeigen Placeholder.
  const url = caseId.startsWith("OLL-") ? getOllImage(caseId) : null;

  const dims =
    size === "large"
      ? "w-72 h-52" // 288px x 208px (DrillCard) — Phase 8.4-Update: groesseres Drill-Fenster
      : "w-16 h-11"; // 64px x 44px (case-grid)

  if (!url) {
    return (
      <div
        className={`${dims} rounded border border-dashed border-gray-700 bg-gray-900/30 flex items-center justify-center text-gray-600 text-xs`}
        title={t("algTrainer.noImage", { case: caseId })}
      >
        ∅
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? t("algTrainer.diagramAlt", { case: caseId })}
      className={`${dims} rounded object-contain bg-gray-900/40`}
      loading="lazy"
    />
  );
}

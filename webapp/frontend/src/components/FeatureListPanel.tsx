// FeatureListPanel — Auflistung aller App-Features.
//
// Wird in zwei Kontexten verwendet:
//  1. LoginPage (rechte Spalte auf Desktop, drunter auf Mobile)
//  2. Innerhalb der App als Modal via Footer-Link "Features"
//
// Source-of-Truth: lib/features-data.ts. Wenn neue Features
// dazukommen → dort einen Bullet adden, beide Stellen zeigen's.

import { useTranslation } from "react-i18next";
import { useFeatures } from "../lib/features-data";

interface Props {
  /** Header anzeigen (in Modal: ja; embedded auf LoginPage: optional). */
  showHeader?: boolean;
  /** Compact-Mode reduziert Padding + Font-Size — für schmale Sidebar. */
  compact?: boolean;
}

export function FeatureListPanel({
  showHeader = true,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const { categories } = useFeatures();
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {showHeader && (
        <header>
          <h2
            className={`font-semibold text-gray-100 ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            {t("features.modalHeading")}
          </h2>
          <p className={`mt-1 text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>
            {t("features.modalSubheading")}
          </p>
        </header>
      )}

      <ul className={compact ? "space-y-3" : "space-y-4"}>
        {categories.map((cat) => (
          <li
            key={cat.title}
            className={`rounded-lg border border-gray-700 bg-gray-900/50 ${
              compact ? "p-3" : "p-4"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true" className="text-lg">
                {cat.icon}
              </span>
              <h3
                className={`font-semibold text-purple-300 ${
                  compact ? "text-sm" : "text-base"
                }`}
              >
                {cat.title}
              </h3>
            </div>
            <ul
              className={`list-disc list-inside space-y-1 text-gray-300 ${
                compact ? "text-xs leading-snug" : "text-sm"
              }`}
            >
              {cat.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className={`text-gray-500 ${compact ? "text-[10px]" : "text-xs"}`}>
        {t("features.modalFooter")}
      </p>
    </div>
  );
}

// FeatureListPanel — Auflistung aller App-Features.
//
// Wird in zwei Kontexten verwendet:
//  1. LoginPage (rechte Spalte auf Desktop, drunter auf Mobile)
//  2. Innerhalb der App als Modal via Footer-Link "Features"
//
// Source-of-Truth: lib/features-data.ts. Wenn neue Features
// dazukommen → dort einen Bullet adden, beide Stellen zeigen's.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  filterBulletsByAudience,
  useFeatures,
  type BulletAudience,
} from "../lib/features-data";

interface Props {
  /** Header anzeigen (in Modal: ja; embedded auf LoginPage: optional). */
  showHeader?: boolean;
  /** Compact-Mode reduziert Padding + Font-Size — für schmale Sidebar. */
  compact?: boolean;
  /**
   * W.pre-demo-fixes (2026-05-29): Optionaler titleKey-String. Wenn
   * gesetzt, scrollt das Panel beim Mount zur entsprechenden Kategorie
   * und highlightet sie kurz mit einem lila Ring. Genutzt vom LoginPage-
   * Klick auf Trust-Pills + Feature-Tiles.
   */
  scrollToCategoryTitleKey?: string;
  /**
   * W.feature-curation (2026-05-29): Audience-Filter.
   *   - "public" (Default) → nur die kuratierten Marketing-Bullets
   *   - "expanded" → public + erweiterte Detail-Bullets (für "Mehr anzeigen")
   *   - "internal" → alles, inkl. Backstage-Bullets (Admin/QA-Sicht)
   * Kategorien ohne sichtbare Bullets werden ausgeblendet.
   */
  audienceFilter?: BulletAudience;
}

export function FeatureListPanel({
  showHeader = true,
  compact = false,
  scrollToCategoryTitleKey,
  audienceFilter = "public",
}: Props) {
  const { t } = useTranslation();
  const { categories } = useFeatures();
  const listRef = useRef<HTMLUListElement | null>(null);

  // Pro Kategorie nach audience filtern; leere Kategorien werden
  // unten beim Render uebersprungen.
  const visibleCategories = categories
    .map((cat) => ({
      ...cat,
      bullets: filterBulletsByAudience(cat.bullets, audienceFilter),
    }))
    .filter((cat) => cat.bullets.length > 0);

  // Beim Mount mit `scrollToCategoryTitleKey` zur Ziel-Card scrollen +
  // kurz highlighten. Die Card hat data-category-key (s.u.).
  useEffect(() => {
    if (!scrollToCategoryTitleKey) return;
    // Defer 50ms damit der DOM (inkl. eventuell wechselnder Modal-Position) gesetzt ist
    const id = window.setTimeout(() => {
      const root = listRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(
        `[data-category-key="${CSS.escape(scrollToCategoryTitleKey)}"]`,
      );
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("cubetracker-category-highlight");
      window.setTimeout(() => {
        target.classList.remove("cubetracker-category-highlight");
      }, 2400);
    }, 50);
    return () => window.clearTimeout(id);
  }, [scrollToCategoryTitleKey]);

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

      <ul ref={listRef} className={compact ? "space-y-3" : "space-y-4"}>
        {visibleCategories.map((cat) => (
          <li
            key={cat.title}
            data-category-key={cat.titleKey}
            className={`rounded-lg border border-gray-700 bg-gray-900/50 transition-shadow ${
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
              {cat.bullets.map((b) => (
                <li key={b.key}>{b.text}</li>
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

// Feature-Liste für Anmeldeseite + In-App-Modal.
//
// Single-Source: pflegt sich hier, wird in 2 Komponenten geteilt
// (LoginPage + FeaturesModal). Konvention bei neuem Feature: hier
// einen Bullet ergänzen statt nur Patch-Notes — Patch-Notes sind
// History, Features-Liste ist Marketing/Onboarding.
//
// Seit W.i18n-features (2026-05-27): Sprache wird via react-i18next
// resolved. Die Liste hier ist nur die Struktur (titles + bullet-keys
// als i18n-Schlüssel), die echten Strings liegen in den Locales unter
// dem Namespace `features.*`.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface FeatureCategory {
  title: string;
  icon: string;
  bullets: string[];
}

// Struktur: pro Category ein title-Key + bullet-Keys (1..N).
// Keys werden via t() resolved.
interface CategoryDef {
  titleKey: string;
  icon: string;
  bulletKeys: string[];
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    titleKey: "features.solvingTitle",
    icon: "⏱",
    bulletKeys: [
      "features.solvingBullet1",
      "features.solvingBullet2",
      "features.solvingBullet3",
      "features.solvingBullet4",
      "features.solvingBullet5",
      "features.solvingBullet6",
      "features.solvingBullet7",
      "features.solvingBullet8",
    ],
  },
  {
    titleKey: "features.analysisTitle",
    icon: "📈",
    bulletKeys: [
      "features.analysisBullet1",
      "features.analysisBullet2",
      "features.analysisBullet3",
      "features.analysisBullet4",
      "features.analysisBullet5",
      "features.analysisBullet6",
      "features.analysisBullet7",
      "features.analysisBullet8",
      "features.analysisBullet9",
    ],
  },
  {
    titleKey: "features.trainerTitle",
    icon: "🏆",
    bulletKeys: [
      "features.trainerBullet1",
      "features.trainerBullet2",
      "features.trainerBullet3",
    ],
  },
  {
    titleKey: "features.communityTitle",
    icon: "🤝",
    bulletKeys: [
      "features.communityBullet1",
      "features.communityBullet2",
      "features.communityBullet3",
    ],
  },
  {
    titleKey: "features.hardwareTitle",
    icon: "🧊",
    bulletKeys: [
      "features.hardwareBullet1",
      "features.hardwareBullet2",
      "features.hardwareBullet3",
      "features.hardwareBullet4",
    ],
  },
  {
    titleKey: "features.worldTitle",
    icon: "🌍",
    bulletKeys: [
      "features.worldBullet1",
      "features.worldBullet2",
      "features.worldBullet3",
      "features.worldBullet4",
      "features.worldBullet5",
    ],
  },
  {
    titleKey: "features.dataTitle",
    icon: "📥",
    bulletKeys: [
      "features.dataBullet1",
      "features.dataBullet2",
      "features.dataBullet3",
      "features.dataBullet4",
      "features.dataBullet5",
      "features.dataBullet6",
    ],
  },
  {
    titleKey: "features.accountTitle",
    icon: "🔒",
    bulletKeys: [
      "features.accountBullet1",
      "features.accountBullet2",
      "features.accountBullet3",
      "features.accountBullet4",
      "features.accountBullet5",
      "features.accountBullet6",
    ],
  },
];

const HERO_KEYS: string[] = [
  "features.heroHighlight1",
  "features.heroHighlight2",
  "features.heroHighlight3",
  "features.heroHighlight4",
];

/**
 * Hook: liefert die Feature-Liste in der aktuellen UI-Sprache.
 *
 * Returns:
 *   - categories: Feature-Categories mit aufgelösten Strings (title + bullets)
 *   - tagline: Kurz-Marketing-Zeile für Anmeldeseite
 *   - heroHighlights: 4 Headline-Bullets für Hero-Zeile auf Anmeldeseite
 */
export function useFeatures(): {
  categories: FeatureCategory[];
  tagline: string;
  heroHighlights: string[];
} {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      categories: CATEGORY_DEFS.map((def) => ({
        title: t(def.titleKey),
        icon: def.icon,
        bullets: def.bulletKeys.map((k) => t(k)),
      })),
      tagline: t("features.tagline"),
      heroHighlights: HERO_KEYS.map((k) => t(k)),
    }),
    [t],
  );
}

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
//
// W.feature-curation (2026-05-29): Jedes Bullet hat jetzt eine
// `audience`-Klassifikation:
//   - "public":   Standard-LoginPage-Modal-Default — die ~25 Bullets
//                 die einen User wirklich überzeugen
//   - "expanded": Wird im Modal nur sichtbar wenn der User auf
//                 "Mehr anzeigen" klickt — Bequemlichkeits-/Detail-Features
//   - "internal": Aus dem User-Modal komplett raus — bleibt nur als
//                 Anker für QA/Dokumentation/Hook (z.B. um zu wissen
//                 was die App alles kann ohne dass es Marketing-Wert hat)
//
// Konvention: jeder neue Bullet MUSS audience setzen. Der
// post-git-commit-Hook warnt bei feat()-Wellen ohne features-data-
// Touch.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export type BulletAudience = "public" | "expanded" | "internal";

export interface BulletDef {
  key: string;
  audience: BulletAudience;
}

export interface ResolvedBullet {
  text: string;
  audience: BulletAudience;
  key: string;
}

export interface FeatureCategory {
  title: string;
  icon: string;
  bullets: ResolvedBullet[];
  /**
   * titleKey bleibt erhalten damit Konsumenten (LoginPage-Klick-
   * Mapping, FeatureListPanel-Scroll-Target) die Kategorie sprach-
   * unabhängig identifizieren können.
   */
  titleKey: string;
}

interface CategoryDef {
  titleKey: string;
  icon: string;
  bullets: BulletDef[];
}

// Reihenfolge der Kategorien priorisiert nach Marketing-Punch:
// Solving zuerst (Kern-Pflicht), dann Differenzierer (Trainer, Community,
// Hardware mit Smart-Cube, Welt mit WCA), dann Analyse, dann Daten +
// Account.
const CATEGORY_DEFS: CategoryDef[] = [
  {
    titleKey: "features.solvingTitle",
    icon: "⏱",
    bullets: [
      { key: "features.solvingBullet1", audience: "public" }, // WCA-Timer + 3 Modi (merged with 2)
      { key: "features.solvingBullet3", audience: "public" }, // Touch-Timer Phone
      { key: "features.solvingBullet10", audience: "public" }, // Zen-Vollbild-Modus
      { key: "features.solvingBullet11", audience: "public" }, // Zeit bleibt stehen + Quick-Korrektur (auch Zen)
      { key: "features.solvingBullet4", audience: "public" }, // Scramble WCA + Inoffiziell
      { key: "features.solvingBullet5", audience: "public" }, // 2D-Cube-Net-Vorschau
      { key: "features.solvingBullet6", audience: "public" }, // Trainings-Sets + Sessions (merged with 8)
      { key: "features.solvingBullet9", audience: "public" }, // Voice-Alerts
      { key: "features.solvingBullet7", audience: "expanded" }, // Auto-Preselect Hardware
    ],
  },
  {
    titleKey: "features.trainerTitle",
    icon: "🏆",
    bullets: [
      { key: "features.trainerBullet1", audience: "public" }, // 30+ Achievements
      { key: "features.trainerBullet2", audience: "public" }, // Daily Challenges
      { key: "features.trainerBullet3", audience: "public" }, // PLL/OLL-Trainer
    ],
  },
  {
    titleKey: "features.communityTitle",
    icon: "🤝",
    bullets: [
      { key: "features.communityBullet1", audience: "public" }, // Freunde-System
      { key: "features.communityBullet3", audience: "public" }, // Bestenliste vs Freunde
      { key: "features.communityBullet5", audience: "public" }, // Öffentliche teilbare Solving-Card (W.public-profile)
      { key: "features.communityBullet4", audience: "public" }, // Feedback-Workflow (ex-accountBullet8)
      { key: "features.communityBullet2", audience: "internal" }, // Privacy-Opt-In (Trust-Block-Material)
    ],
  },
  {
    titleKey: "features.hardwareTitle",
    icon: "🧊",
    bullets: [
      { key: "features.hardwareBullet5", audience: "public" }, // GAN i4 Smart-Cube
      { key: "features.hardwareBullet1", audience: "public" }, // 30 Cubes + Markieren (merged with 2)
      { key: "features.hardwareBullet4", audience: "expanded" }, // Eigene Cubes anlegen
      { key: "features.hardwareBullet3", audience: "internal" }, // Bulk-Aktionen
    ],
  },
  {
    titleKey: "features.worldTitle",
    icon: "🌍",
    bullets: [
      { key: "features.worldBullet1", audience: "public" }, // WCA-Turniere Distanz
      { key: "features.worldBullet3", audience: "public" }, // News 3 Quellen
      { key: "features.worldBullet6", audience: "public" }, // WCA-ID → PRs + Wettkämpfe
      { key: "features.worldBullet8", audience: "public" }, // PLZ + Land (ex-accountBullet4)
      { key: "features.worldBullet2", audience: "expanded" }, // DACH-Bonus
      { key: "features.worldBullet7", audience: "expanded" }, // Mehrsprachig DE/EN
      { key: "features.worldBullet4", audience: "internal" }, // Auto-Refresh News
      { key: "features.worldBullet5", audience: "internal" }, // Datenquellen (Trust-Block-Material)
    ],
  },
  {
    titleKey: "features.analysisTitle",
    icon: "📈",
    bullets: [
      { key: "features.analysisBullet1", audience: "public" }, // Single/Mo3/AO5/12/100
      { key: "features.analysisBullet3", audience: "public" }, // Live-Form vs Schnitt
      { key: "features.analysisBullet6", audience: "public" }, // Charts Trends/Distribution
      { key: "features.analysisBullet7", audience: "public" }, // PB-Verlauf inkl. alter
      { key: "features.analysisBullet9", audience: "public" }, // Hardware-Compare
      { key: "features.analysisBullet10", audience: "public" }, // Multi-Cube-Compare
      { key: "features.analysisBullet2", audience: "expanded" }, // Best-Avg-Timestamps
      { key: "features.analysisBullet4", audience: "expanded" }, // Sortierbare Solve-Liste
      { key: "features.analysisBullet5", audience: "expanded" }, // Solve-Detail-Modal
      { key: "features.analysisBullet11", audience: "expanded" }, // Outlier-Pflege
      { key: "features.analysisBullet8", audience: "internal" }, // Avg-PB-Marker farbige Punkte
    ],
  },
  {
    titleKey: "features.dataTitle",
    icon: "📥",
    bullets: [
      { key: "features.dataBullet1", audience: "public" }, // JSON-Voll-Backup (merged with 5)
      { key: "features.dataBullet3", audience: "public" }, // csTimer-Import + Export (merged with 4)
      { key: "features.dataBullet2", audience: "internal" }, // Gefahren-Bereich
      { key: "features.dataBullet6", audience: "internal" }, // Snapshots vor Bulk
    ],
  },
  {
    titleKey: "features.accountTitle",
    icon: "🔒",
    bullets: [
      { key: "features.accountBullet10", audience: "public" }, // Angemeldet bleiben / Session-only
      { key: "features.accountBullet7", audience: "public" }, // 8 Hintergrund-Themen + Card-Stil
      { key: "features.accountBullet9", audience: "expanded" }, // Roadmap + Patch-Notes-Modal
      { key: "features.accountBullet5", audience: "expanded" }, // DSGVO-Account-Löschung
      { key: "features.accountBullet1", audience: "internal" }, // Kein Cookie-Banner (Trust-Block-Material)
      { key: "features.accountBullet2", audience: "internal" }, // Email-Verifikation
      { key: "features.accountBullet3", audience: "internal" }, // Display-Name + Email-Change
      { key: "features.accountBullet6", audience: "internal" }, // Multi-User-Isolation
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
 *   - categories: Feature-Categories mit aufgelösten Strings + audience pro Bullet
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
        bullets: def.bullets.map((b) => ({
          text: t(b.key),
          audience: b.audience,
          key: b.key,
        })),
        titleKey: def.titleKey,
      })),
      tagline: t("features.tagline"),
      heroHighlights: HERO_KEYS.map((k) => t(k)),
    }),
    [t],
  );
}

/**
 * Filter-Helfer: pickt aus den Bullets nur die, die zur Sicht passen.
 *   - audience="public":   nur public
 *   - audience="expanded": public + expanded (für "Mehr anzeigen"-Drawer)
 *   - audience="internal": alles inkl. internal (für interne Listen)
 */
export function filterBulletsByAudience(
  bullets: ResolvedBullet[],
  audience: BulletAudience,
): ResolvedBullet[] {
  return bullets.filter((b) => {
    if (audience === "public") return b.audience === "public";
    if (audience === "expanded")
      return b.audience === "public" || b.audience === "expanded";
    return true; // "internal" = alles
  });
}

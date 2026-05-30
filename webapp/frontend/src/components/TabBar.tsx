// TabBar: Top-Level-Navigation zwischen den 5 Haupt-Modi der App.
// - TIMER:      Solving-Modus, Eingabe groß + zentriert
// - STATISTIK:  Übersicht (Tagesform + Stats) + Detail (Charts + Solveliste).
//               Vereint das frühere Dashboard + Analyse (W.ia-statistik-merge,
//               2026-05-30) — Übersicht ist Default, Detail per Sub-Nav.
// - VERWALTUNG: NUR Admin/Tester (W.ia-konto-usermenu, 2026-05-31) —
//               Rollen-Werkzeuge. Normale User: „Konto & Daten" liegt jetzt
//               im UserMenu (Pseudo-Tab „konto", erscheint NICHT in der Leiste).
// - TRAINER:    Personal Trainer — Erfolge + Daily Challenges
// - COMMUNITY:  Freunde + Bestenliste
//
// Mobile-first (2026-05-14): nutzt ScrollableTabBar — auf Phone
// horizontal scrollbar, auf Desktop gleichmäßig verteilt.

import { useTranslation } from "react-i18next";
import { ScrollableTabBar } from "./ScrollableTabBar";

export type AppTab =
  | "timer"
  | "statistik"
  | "verwaltung"
  | "trainer"
  | "community"
  // Pseudo-Tab (W.ia-konto-usermenu): gültiger Routing-Zustand, aber NICHT
  // in der TabBar — erreichbar nur über das UserMenu → „Konto & Daten".
  | "konto";

interface TabDef {
  id: AppTab;
  label: string;
  icon: string;
  description: string;
}

// Tab-Reihenfolge + Icons sind sprach-unabhaengig; Labels + Descriptions
// werden zur Render-Zeit via t() lokalisiert (siehe useLocalizedTabs).
const TAB_ICONS: Record<AppTab, string> = {
  timer: "⏱",
  statistik: "📊",
  verwaltung: "⚙",
  trainer: "🏆",
  community: "🤝",
  // konto erscheint nie in der Leiste — Eintrag nur für die Record-
  // Vollständigkeit (TypeScript verlangt alle AppTab-Keys).
  konto: "👤",
};

// Haupt-Nav-Reihenfolge. Der Verwaltung-Tab ist seit W.ia-konto-usermenu
// nur noch für Admin/Tester sichtbar; normale User bekommen die schlanke
// 4-Tab-Leiste. „konto" ist ein Pseudo-Tab und nie in der Leiste.
const BASE_TAB_ORDER: AppTab[] = ["timer", "statistik", "trainer", "community"];
const STAFF_TAB_ORDER: AppTab[] = [
  "timer",
  "statistik",
  "verwaltung",
  "trainer",
  "community",
];

export function useLocalizedTabs(isStaff: boolean): TabDef[] {
  const { t } = useTranslation();
  const order = isStaff ? STAFF_TAB_ORDER : BASE_TAB_ORDER;
  return order.map((id) => ({
    id,
    label: t(`tabs.${id}`),
    icon: TAB_ICONS[id],
    description: t(`tabs.${id}Desc`),
  }));
}

interface Props {
  current: AppTab;
  onChange: (tab: AppTab) => void;
  /** Admin/Tester sehen zusätzlich den Verwaltung-Tab. */
  isStaff: boolean;
}

export function TabBar({ current, onChange, isStaff }: Props) {
  const { t } = useTranslation();
  const tabs = useLocalizedTabs(isStaff);
  return (
    <div className="mb-6">
      <ScrollableTabBar
        tabs={tabs}
        current={current}
        onChange={(id) => onChange(id as AppTab)}
        ariaLabel={t("tabs.mainNavAria")}
        size="lg"
      />
    </div>
  );
}

// TabBar: Top-Level-Navigation zwischen den 6 Haupt-Modi der App.
// - TIMER:      Solving-Modus, Eingabe groß + zentriert
// - DASHBOARD:  Live-Übersicht, Tagesform + Reminders
// - ANALYSE:    Deep-Dive, Charts + volle Solveliste (NUR Auswertung)
// - VERWALTUNG: Sessions, Hardware, Import, Outlier-Pflege (Daten-Pflege)
// - TRAINER:    Personal Trainer — Erfolge + Daily Challenges
// - COMMUNITY:  Freunde + Bestenliste
//
// Mobile-first (2026-05-14): nutzt ScrollableTabBar — auf Phone
// horizontal scrollbar, auf Desktop gleichmäßig verteilt.

import { useTranslation } from "react-i18next";
import { ScrollableTabBar } from "./ScrollableTabBar";

export type AppTab =
  | "timer"
  | "dashboard"
  | "analyse"
  | "verwaltung"
  | "trainer"
  | "community";

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
  dashboard: "📊",
  analyse: "📈",
  verwaltung: "⚙",
  trainer: "🏆",
  community: "🤝",
};

const TAB_ORDER: AppTab[] = [
  "timer",
  "dashboard",
  "analyse",
  "verwaltung",
  "trainer",
  "community",
];

export function useLocalizedTabs(): TabDef[] {
  const { t } = useTranslation();
  return TAB_ORDER.map((id) => ({
    id,
    label: t(`tabs.${id}`),
    icon: TAB_ICONS[id],
    description: t(`tabs.${id}Desc`),
  }));
}

interface Props {
  current: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ current, onChange }: Props) {
  const { t } = useTranslation();
  const tabs = useLocalizedTabs();
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

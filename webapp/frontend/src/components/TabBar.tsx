// TabBar: Top-Level-Navigation zwischen den 6 Haupt-Modi der App.
// - TIMER:      Solving-Modus, Eingabe gross + zentriert
// - DASHBOARD:  Live-Uebersicht, Tagesform + Reminders
// - ANALYSE:    Deep-Dive, Charts + volle Solveliste (NUR Auswertung)
// - VERWALTUNG: Sessions, Hardware, Import, Outlier-Pflege (Daten-Pflege)
// - TRAINER:    Personal Trainer — Erfolge + Daily Challenges
// - COMMUNITY:  Freunde + Bestenliste
//
// Mobile-first (2026-05-14): nutzt ScrollableTabBar — auf Phone
// horizontal scrollbar, auf Desktop gleichmaessig verteilt.

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

export const TABS: TabDef[] = [
  {
    id: "timer",
    label: "Timer",
    icon: "⏱",
    description: "Solves eintragen",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    description: "Tagesform + Stats im Blick",
  },
  {
    id: "analyse",
    label: "Analyse",
    icon: "📈",
    description: "Charts + Solveliste",
  },
  {
    id: "verwaltung",
    label: "Verwaltung",
    icon: "⚙",
    description: "Sessions, Hardware, Import, Outliers",
  },
  {
    id: "trainer",
    label: "Trainer",
    icon: "🏆",
    description: "Erfolge + Daily Challenges (Phase 7)",
  },
  {
    id: "community",
    label: "Community",
    icon: "🤝",
    description: "Freunde + Bestenliste (Vergleich mit Friends)",
  },
];

interface Props {
  current: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ current, onChange }: Props) {
  return (
    <div className="mb-6">
      <ScrollableTabBar
        tabs={TABS}
        current={current}
        onChange={(id) => onChange(id as AppTab)}
        ariaLabel="Hauptnavigation"
        size="lg"
      />
    </div>
  );
}

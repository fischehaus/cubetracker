// TabBar: Top-Level-Navigation = der tägliche Cubing-Loop, 4 Flow-Tabs:
// - TIMER:      Solving-Modus, Eingabe groß + zentriert
// - STATISTIK:  Übersicht (Tagesform + Stats) + Detail (Charts + Solveliste).
//               Vereint das frühere Dashboard + Analyse (W.ia-statistik-merge).
// - TRAINER:    Personal Trainer — Erfolge + Daily Challenges
// - COMMUNITY:  Freunde + Bestenliste
//
// Pseudo-Tabs (gültiges Routing, aber NICHT in der Leiste — nur über das
// UserMenu erreichbar): konto (Konto & Daten, alle User), admin (nur
// is_admin), tester (nur is_tester). „verwaltung" ist seit W.ia-admin-bereich
// ein toter Migrations-Durchgang — alter Tab-Zustand wird in App.tsx
// umgeleitet, nie gerendert.
//
// Mobile-first (2026-05-14): nutzt ScrollableTabBar — auf Phone
// horizontal scrollbar, auf Desktop gleichmäßig verteilt.

import { useTranslation } from "react-i18next";
import { ScrollableTabBar } from "./ScrollableTabBar";

export type AppTab =
  | "timer"
  | "statistik"
  | "trainer"
  | "community"
  // Pseudo-Tabs (W.ia-konto-usermenu / W.ia-admin-bereich): gültige Routing-
  // Zustände, aber NICHT in der TabBar — erreichbar nur über das UserMenu.
  | "konto" // Konto & Daten (alle User)
  | "admin" // nur is_admin
  | "tester" // nur is_tester && !is_admin
  // toter Migrations-Durchgang: alter „verwaltung"-Tab-Zustand wird in
  // App.tsx auf admin/tester/konto umgeleitet, nie gerendert.
  | "verwaltung";

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
  trainer: "🏆",
  community: "🤝",
  // Pseudo-Tabs erscheinen nie in der Leiste — Einträge nur für die
  // Record-Vollständigkeit (TypeScript verlangt alle AppTab-Keys).
  konto: "👤",
  admin: "🛡",
  tester: "🧪",
  verwaltung: "⚙",
};

// Haupt-Nav = 4 Flow-Tabs für ALLE (W.ia-admin-bereich): seit Admin/Tester
// einen eigenen UserMenu-Bereich haben, ist auch der frühere Verwaltung-Tab
// aus der Leiste verschwunden. Pseudo-Tabs (konto/admin/tester) tauchen hier
// nie auf.
const TAB_ORDER: AppTab[] = ["timer", "statistik", "trainer", "community"];

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

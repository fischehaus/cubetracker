// BottomNav (W.ia-app-shell, 2026-05-31) — fixe Bottom-Tab-Bar für Phones
// (<md). Die 4 Flow-Tabs (Timer/Statistik/Trainer/Community) daumen-
// erreichbar und immer sichtbar — das moderne App-Navigations-Muster
// (statt Hamburger). Auf Desktop (md+) ausgeblendet; dort lebt die Top-Tab-
// Leiste. Safe-Area-aware (iPhone-Home-Indikator). Wird in den Pseudo-Tabs
// (Profil/Konto/Einstellungen/Admin/Tester) gar nicht erst gerendert — die
// haben eigene Header mit Zurück-Button (siehe isPseudoView in App.tsx).

import { useTranslation } from "react-i18next";
import { useLocalizedTabs, type AppTab } from "./TabBar";

interface Props {
  current: AppTab;
  onChange: (tab: AppTab) => void;
}

export function BottomNav({ current, onChange }: Props) {
  const { t } = useTranslation();
  const tabs = useLocalizedTabs();
  return (
    <nav
      aria-label={t("tabs.mainNavAria")}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = tab.id === current;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] transition-colors ${
                active
                  ? "text-purple-300"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {tab.icon}
              </span>
              <span className="text-[11px] font-medium leading-none truncate max-w-full px-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

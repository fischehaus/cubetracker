// TabBar: Top-Level-Navigation zwischen den 3 Haupt-Modi der App.
// - TIMER:     Solving-Modus, Eingabe gross + zentriert
// - DASHBOARD: Live-Uebersicht, Tagesform + Reminders
// - ANALYSE:   Deep-Dive, Charts + Outliers + volle Liste
//
// Aktiver Tab ist klar hervorgehoben (lila Akzent + Hintergrund).
// Tasten-Targets sind gross (h-12), damit auch Touch funktioniert.

export type AppTab = "timer" | "dashboard" | "analyse";

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
    icon: "🔍",
    description: "Charts, Outliers, volle Liste",
  },
];

interface Props {
  current: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ current, onChange }: Props) {
  return (
    <nav
      className="flex gap-1 mb-6 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
      aria-label="Hauptnavigation"
    >
      {TABS.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 h-12 text-base font-medium transition ${
              active
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
            }`}
            title={t.description}
          >
            <span className="text-lg" aria-hidden="true">
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

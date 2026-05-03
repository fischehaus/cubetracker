// VerwaltungTab: Daten-Pflege (Phase L-1).
//
// Bewusst getrennt von ANALYSE: dort wird ausgewertet, hier wird
// administriert. Vier sub-bereiche, intern via sub-tab-state
// umgeschaltet (kein routing — die wahl bleibt nicht ueber app-
// reload erhalten, das ist OK fuer einen verwaltungs-tab).

import { useState } from "react";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { OutlierCard } from "./OutlierCard";
import { SessionList } from "./SessionList";

type VerwaltungSection = "sessions" | "hardware" | "import" | "outliers";

interface SubTab {
  id: VerwaltungSection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "sessions", label: "Sessions", icon: "📁" },
  { id: "hardware", label: "Hardware", icon: "🧊" },
  { id: "import", label: "Daten-Import", icon: "📥" },
  { id: "outliers", label: "Outliers", icon: "⚠" },
];

interface Props {
  /** Globaler Header-Session-Filter — nur fuer Outliers relevant */
  sessionId: number | null;
}

export function VerwaltungTab({ sessionId }: Props) {
  const [section, setSection] = useState<VerwaltungSection>("sessions");

  return (
    <div className="space-y-4">
      {/* Sub-Tab-Bar */}
      <nav
        className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
        aria-label="Verwaltungs-Bereiche"
      >
        {SUB_TABS.map((t) => {
          const active = section === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 h-11 text-base font-medium transition ${
                active
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Aktive Sektion */}
      {section === "sessions" && <SessionList />}
      {section === "hardware" && <HardwareList />}
      {section === "import" && <ImportPanel />}
      {section === "outliers" && <OutlierCard sessionId={sessionId} />}
    </div>
  );
}

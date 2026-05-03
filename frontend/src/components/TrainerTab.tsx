// TrainerTab: Personal Trainer (Phase 7).
//
// Phase 7a: Sub-Bereich „Erfolge" mit AchievementsCard.
// Phase 7b: Sub-Bereich „Heute" mit DailyChallengesPanel.
//
// Sub-Tab-Bar analog zu VerwaltungTab. Die aktuelle Wahl bleibt nicht
// ueber app-reload erhalten — bewusst, weil „Heute" der primaere
// Einstieg sein soll.

import { useState } from "react";
import { AchievementsCard } from "./AchievementsCard";
import { DailyChallengesPanel } from "./DailyChallengesPanel";

type TrainerSection = "heute" | "erfolge";

interface SubTab {
  id: TrainerSection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "heute", label: "Heute", icon: "🎯" },
  { id: "erfolge", label: "Erfolge", icon: "🏆" },
];

export function TrainerTab() {
  const [section, setSection] = useState<TrainerSection>("heute");

  return (
    <div className="space-y-4">
      {/* Sub-Tab-Bar */}
      <nav
        className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
        aria-label="Trainer-Bereiche"
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

      {section === "heute" && <DailyChallengesPanel />}
      {section === "erfolge" && <AchievementsCard />}
    </div>
  );
}

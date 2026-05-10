// TrainerTab: Personal Trainer (Phase 7 + 8b).
//
// Sub-Bereiche:
//   - „Heute"   (Phase 7b): DailyChallengesPanel
//   - „Algs"    (Phase 8b): AlgTrainerPanel (PLL/OLL-Drill mit per-case-Stats)
//   - „Erfolge" (Phase 7a): AchievementsCard
//
// Sub-Tab-Bar analog zu VerwaltungTab. Wahl persistiert NICHT ueber
// app-reload — bewusst, „Heute" soll der primaere Einstieg bleiben.

import { useState } from "react";
import { AchievementsCard } from "./AchievementsCard";
import { AlgTrainerPanel } from "./AlgTrainerPanel";
import { DailyChallengesPanel } from "./DailyChallengesPanel";

type TrainerSection = "heute" | "algs" | "erfolge";

interface SubTab {
  id: TrainerSection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "heute", label: "Heute", icon: "🎯" },
  { id: "algs", label: "Algs", icon: "🧩" },
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
      {section === "algs" && <AlgTrainerPanel />}
      {section === "erfolge" && <AchievementsCard />}
    </div>
  );
}

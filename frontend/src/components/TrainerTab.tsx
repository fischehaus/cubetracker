// TrainerTab: Personal Trainer (Phase 7).
//
// Phase 7a: Sub-Bereich „Erfolge" mit AchievementsCard.
// Phase 7b kommt: Sub-Bereich „Heute" mit Daily Challenges. Dann
// werden hier sub-tabs eingebaut, analog zur VerwaltungTab.

import { AchievementsCard } from "./AchievementsCard";

export function TrainerTab() {
  return (
    <div className="space-y-4">
      <AchievementsCard />
    </div>
  );
}

// CommunityTab (UX-Refactor 2026-05-14): Sammel-Tab fuer alles soziale —
// Freunde + Bestenliste. Macht aus 7 Top-Tabs 6 ohne dass jemand Features
// suchen muss.
//
// Sub-Tab-Logik identisch zum VerwaltungTab: lokaler useState, kein
// URL-Routing fuer Sub-Tabs (kostet sonst Komplexitaet). Initial-Section
// kann ueber Prop gesetzt werden — fuer URL-Hash-Backward-Compat
// (#friends → community/friends, #leaderboard → community/leaderboard).

import { useState } from "react";
import { FriendsTab } from "./FriendsTab";
import { LeaderboardTab } from "./LeaderboardTab";

export type CommunitySection = "friends" | "leaderboard";

interface SubTab {
  id: CommunitySection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "friends", label: "Freunde", icon: "🤝" },
  { id: "leaderboard", label: "Bestenliste", icon: "🏁" },
];

interface Props {
  /** Initial-Sub-Tab — fuer URL-Hash-Backward-Compat (#friends, #leaderboard). */
  initialSection?: CommunitySection;
}

export function CommunityTab({ initialSection = "friends" }: Props) {
  const [section, setSection] = useState<CommunitySection>(initialSection);

  return (
    <div className="space-y-4">
      <nav
        className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
        aria-label="Community-Bereiche"
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

      {section === "friends" && <FriendsTab />}
      {section === "leaderboard" && <LeaderboardTab />}
    </div>
  );
}

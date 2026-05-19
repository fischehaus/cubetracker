// CommunityTab (UX-Refactor 2026-05-14): Sammel-Tab für alles soziale —
// Freunde + Bestenliste. Macht aus 7 Top-Tabs 6 ohne dass jemand Features
// suchen muss.
//
// Sub-Tab-Logik identisch zum VerwaltungTab: lokaler useState, kein
// URL-Routing für Sub-Tabs (kostet sonst Komplexitaet). Initial-Section
// kann über Prop gesetzt werden — für URL-Hash-Backward-Compat
// (#friends → community/friends, #leaderboard → community/leaderboard).

import { useState } from "react";
import { FriendsTab } from "./FriendsTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { ScrollableTabBar } from "./ScrollableTabBar";

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
  /** Initial-Sub-Tab — für URL-Hash-Backward-Compat (#friends, #leaderboard). */
  initialSection?: CommunitySection;
}

export function CommunityTab({ initialSection = "friends" }: Props) {
  const [section, setSection] = useState<CommunitySection>(initialSection);

  return (
    <div className="space-y-4">
      <ScrollableTabBar
        tabs={SUB_TABS}
        current={section}
        onChange={(id) => setSection(id as CommunitySection)}
        ariaLabel="Community-Bereiche"
        size="md"
      />

      {section === "friends" && <FriendsTab />}
      {section === "leaderboard" && <LeaderboardTab />}
    </div>
  );
}

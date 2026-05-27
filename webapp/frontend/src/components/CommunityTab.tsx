// CommunityTab (UX-Refactor 2026-05-14): Sammel-Tab für alles soziale —
// Freunde + Bestenliste. Macht aus 7 Top-Tabs 6 ohne dass jemand Features
// suchen muss.
//
// Sub-Tab-Logik identisch zum VerwaltungTab: lokaler useState, kein
// URL-Routing für Sub-Tabs (kostet sonst Komplexitaet). Initial-Section
// kann über Prop gesetzt werden — für URL-Hash-Backward-Compat
// (#friends → community/friends, #leaderboard → community/leaderboard).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FriendsTab } from "./FriendsTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { ScrollableTabBar } from "./ScrollableTabBar";

export type CommunitySection = "friends" | "leaderboard";

interface Props {
  /** Initial-Sub-Tab — für URL-Hash-Backward-Compat (#friends, #leaderboard). */
  initialSection?: CommunitySection;
}

export function CommunityTab({ initialSection = "friends" }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<CommunitySection>(initialSection);

  const subTabs = [
    { id: "friends", label: t("communityTab.subTabFriends"), icon: "🤝" },
    {
      id: "leaderboard",
      label: t("communityTab.subTabLeaderboard"),
      icon: "🏁",
    },
  ];

  return (
    <div className="space-y-4">
      <ScrollableTabBar
        tabs={subTabs}
        current={section}
        onChange={(id) => setSection(id as CommunitySection)}
        ariaLabel={t("communityTab.ariaLabel")}
        size="md"
      />

      {section === "friends" && <FriendsTab />}
      {section === "leaderboard" && <LeaderboardTab />}
    </div>
  );
}

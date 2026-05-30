// AdminPanel — eigener Admin-Bereich (W.ia-admin-bereich, 2026-05-31).
//
// Erreichbar über UserMenu → Admin (nur is_admin), KEIN Haupt-Tab mehr.
// Früher 6 Panels gestapelt + langes Scrollen (Audit P4) — jetzt eine
// Sub-Navigation mit 6 Bereichen (Stats / Feedback-Inbox / Live-Tests /
// Roadmap / Nutzer / Ankündigung). section-State ist lokal — es gibt keine
// externen Direkt-Sprünge in einzelne Admin-Sub-Bereiche.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminAnnouncePanel } from "./AdminAnnouncePanel";
import { AdminFeedbackInboxPanel } from "./AdminFeedbackInboxPanel";
import { AdminLiveTestsPanel } from "./AdminLiveTestsPanel";
import { AdminRoadmapPanel } from "./AdminRoadmapPanel";
import { AdminStatsPanel } from "./AdminStatsPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { ScrollableTabBar } from "./ScrollableTabBar";
import { Button } from "./ui";

type AdminSection =
  | "stats"
  | "feedback"
  | "livetests"
  | "roadmap"
  | "users"
  | "announce";

// Reihenfolge + Icons sprach-unabhängig; Labels via t() zur Render-Zeit.
const SUB_TAB_ICONS: Record<AdminSection, string> = {
  stats: "📊",
  feedback: "📬",
  livetests: "🧪",
  roadmap: "🗺",
  users: "👥",
  announce: "📢",
};

const SUB_TAB_ORDER: AdminSection[] = [
  "stats",
  "feedback",
  "livetests",
  "roadmap",
  "users",
  "announce",
];

interface Props {
  /** Zurück in die App (Statistik-Tab) — Admin ist kein Haupt-Tab. */
  onBack: () => void;
}

export function AdminPanel({ onBack }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<AdminSection>("stats");
  const tabs = SUB_TAB_ORDER.map((id) => ({
    id,
    label: t(`adminBereich.tab_${id}`),
    icon: SUB_TAB_ICONS[id],
  }));

  return (
    <div className="space-y-4">
      {/* Kontext-Header (analog Konto & Daten): Admin ist ein Pseudo-Tab
          ohne Eintrag in der Haupt-Leiste — Titel + Zurück-Weg. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-100">
          <span aria-hidden="true">🛡</span>
          {t("adminBereich.title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("adminBereich.back")}
        </Button>
      </div>

      <ScrollableTabBar
        tabs={tabs}
        current={section}
        onChange={(id) => setSection(id as AdminSection)}
        ariaLabel={t("adminBereich.ariaSubTabs")}
        size="md"
      />

      {section === "stats" && <AdminStatsPanel />}
      {section === "feedback" && <AdminFeedbackInboxPanel />}
      {section === "livetests" && <AdminLiveTestsPanel />}
      {section === "roadmap" && <AdminRoadmapPanel />}
      {section === "users" && <AdminUsersPanel />}
      {section === "announce" && <AdminAnnouncePanel />}
    </div>
  );
}

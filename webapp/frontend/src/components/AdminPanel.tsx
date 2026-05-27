// AdminPanel — Wrapper für alle Admin-Bereiche.
//
// Stackt die drei Panels untereinander (Stats / Users / Bulk-Mail).
// Wenn das später zu lang wird, kann man hier auf inner-Tabs umstellen
// ohne die Sub-Panels anzufassen.

import { AdminAnnouncePanel } from "./AdminAnnouncePanel";
import { AdminFeedbackInboxPanel } from "./AdminFeedbackInboxPanel";
import { AdminLiveTestsPanel } from "./AdminLiveTestsPanel";
import { AdminRoadmapPanel } from "./AdminRoadmapPanel";
import { AdminStatsPanel } from "./AdminStatsPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";

export function AdminPanel() {
  return (
    <div className="space-y-6">
      <AdminStatsPanel />
      <AdminFeedbackInboxPanel />
      <AdminLiveTestsPanel />
      <AdminRoadmapPanel />
      <AdminUsersPanel />
      <AdminAnnouncePanel />
    </div>
  );
}

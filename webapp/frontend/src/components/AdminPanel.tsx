// AdminPanel — Wrapper fuer alle Admin-Bereiche.
//
// Stackt die drei Panels untereinander (Stats / Users / Bulk-Mail).
// Wenn das spaeter zu lang wird, kann man hier auf inner-Tabs umstellen
// ohne die Sub-Panels anzufassen.

import { AdminAnnouncePanel } from "./AdminAnnouncePanel";
import { AdminStatsPanel } from "./AdminStatsPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";

export function AdminPanel() {
  return (
    <div className="space-y-6">
      <AdminStatsPanel />
      <AdminUsersPanel />
      <AdminAnnouncePanel />
    </div>
  );
}

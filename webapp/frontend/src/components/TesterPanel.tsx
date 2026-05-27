// TesterPanel (Phase W.tester-tab-ui, 2026-05-28).
//
// Eigenes Panel für User mit is_tester=true && is_admin=false. Rendert
// die Tester-Berechtigungen: Live-Tests + Roadmap-Pflege.
//
// Admin-only-Komponenten (Stats, Users, Feedback-Inbox, Announce) sind
// hier bewusst NICHT enthalten — Tester sehen nur was ihre Rolle erlaubt.
//
// Re-Use: rendert die existierenden AdminLiveTestsPanel + AdminRoadmapPanel
// (gleiche UI, gleiche Hooks). Berechtigung wird Backend-seitig durch
// require_admin_or_tester geprüft.

import { AdminLiveTestsPanel } from "./AdminLiveTestsPanel";
import { AdminRoadmapPanel } from "./AdminRoadmapPanel";

export function TesterPanel() {
  return (
    <div className="space-y-6">
      <AdminLiveTestsPanel />
      <AdminRoadmapPanel />
    </div>
  );
}

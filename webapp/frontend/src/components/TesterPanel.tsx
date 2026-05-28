// TesterPanel (Phase W.tester-tab-ui, 2026-05-28).
//
// Eigenes Panel für User mit is_tester=true && is_admin=false. Rendert
// die Tester-Berechtigungen.
//
// Admin-only-Komponenten (Stats, Users, Feedback-Inbox, Announce) sind
// hier bewusst NICHT enthalten — Tester sehen nur was ihre Rolle erlaubt.
//
// Re-Use: rendert die existierenden AdminLiveTestsPanel + AdminRoadmapPanel
// (gleiche UI, gleiche Hooks).
//
// **W.tester-readonly-roadmap (2026-05-28):** AdminRoadmapPanel wird mit
// `readOnly={true}` aufgerufen. Der Tester sieht alle Items inkl.
// internal=True (über is_admin_or_tester-Filter im Public-Endpoint), aber
// die Action-Buttons (Quick-Toggles, Bearbeiten, Löschen, Neu) sind
// ausgeblendet. Backend-seitig sind die Roadmap-CRUD-Endpoints zurück
// auf require_admin — Defense-in-Depth gegen Frontend-Manipulation.
// Live-Tests bleiben editierbar (require_admin_or_tester).

import { AdminLiveTestsPanel } from "./AdminLiveTestsPanel";
import { AdminRoadmapPanel } from "./AdminRoadmapPanel";

export function TesterPanel() {
  return (
    <div className="space-y-6">
      <AdminLiveTestsPanel />
      <AdminRoadmapPanel readOnly={true} />
    </div>
  );
}

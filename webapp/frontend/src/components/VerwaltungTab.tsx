// VerwaltungTab — nach W.ia-konto-usermenu (2026-05-31) nur noch die
// ROLLEN-Werkzeuge: Admin-Panel (is_admin) bzw. Tester-Panel
// (is_tester && !is_admin). Dieser Tab ist nur für Admin/Tester sichtbar
// (die TabBar blendet ihn für normale User aus, App.tsx leitet einen alten
// "verwaltung"-Tab-Zustand normaler User auf "konto" um).
//
// Die früheren Base-Sub-Tabs (Sessions, Hardware, Daten, Outliers,
// Einstellungen) leben jetzt unter „UserMenu → Konto & Daten"
// (KontoDatenView). Der eigene Admin-/Tester-Bereich mit eigener
// Sub-Navigation kommt in W.ia-admin-bereich — dann verschwindet auch
// dieser Übergangs-Tab ganz.

import { useAuth } from "../auth/AuthContext";
import { AdminPanel } from "./AdminPanel";
import { TesterPanel } from "./TesterPanel";

export function VerwaltungTab() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  // Admin > Tester: Admin sieht das Admin-Panel (das die Tester-Funktionen
  // mitenthält), Tester-only-User das Tester-Panel.
  const isTesterOnly = !isAdmin && (user?.is_tester ?? false);

  if (isAdmin) {
    return (
      <div className="space-y-4">
        <AdminPanel />
      </div>
    );
  }
  if (isTesterOnly) {
    return (
      <div className="space-y-4">
        <TesterPanel />
      </div>
    );
  }
  // Normale User landen hier nicht (Tab unsichtbar + App.tsx-Umleitung) —
  // defensives null, falls doch (z.B. alter #verwaltung-Hash vor Umleitung).
  return null;
}

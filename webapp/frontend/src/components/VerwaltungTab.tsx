// VerwaltungTab: Daten-Pflege (Phase L-1).
//
// Bewusst getrennt von ANALYSE: dort wird ausgewertet, hier wird
// administriert. Vier sub-bereiche, intern via sub-tab-state
// umgeschaltet (kein routing — die wahl bleibt nicht über app-
// reload erhalten, das ist OK für einen verwaltungs-tab).

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AdminPanel } from "./AdminPanel";
import { BackupPanel } from "./BackupPanel";
import { DangerZoneCard } from "./DangerZoneCard";
import { MeineDatenCard } from "./MeineDatenCard";
import { CsTimerExportPanel } from "./CsTimerExportPanel";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { OutlierCard } from "./OutlierCard";
import { ScrollableTabBar } from "./ScrollableTabBar";
import { SessionList } from "./SessionList";
import { SettingsPanel } from "./SettingsPanel";

// UX-Refactor 2026-05-14: Patches-Sub-Tab raus — Patch Notes leben jetzt
// am Versions-Badge (Header rechts oben) als Modal. Natuerlicherer Ort.
type VerwaltungSection =
  | "sessions"
  | "hardware"
  | "daten"
  | "outliers"
  | "settings"
  | "admin";

interface SubTab {
  id: VerwaltungSection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "sessions", label: "Sessions", icon: "📁" },
  { id: "hardware", label: "Hardware", icon: "🧊" },
  { id: "daten", label: "Meine Daten", icon: "📥" },
  { id: "outliers", label: "Outliers", icon: "⚠" },
  { id: "settings", label: "Einstellungen", icon: "⚙" },
];

// Admin-Tab nur für User mit is_admin === true (env-driven, siehe
// backend api/admin.py). Liegt am Ende um die Tab-Reihenfolge für
// Non-Admins stabil zu halten.
const ADMIN_TAB: SubTab = { id: "admin", label: "Admin", icon: "🛡" };

export function VerwaltungTab() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const tabs = isAdmin ? [...SUB_TABS, ADMIN_TAB] : SUB_TABS;

  const [section, setSection] = useState<VerwaltungSection>("sessions");

  // UserMenu (App.tsx) feuert "cubetracker:goto-verwaltung-section" wenn
  // der User "Mein Account & Einstellungen" klickt — wir springen dann
  // direkt zum Settings-Sub-Tab. Generisch für kuenftige Direkt-Links.
  useEffect(() => {
    function onGoto(e: Event) {
      const detail = (e as CustomEvent<{ section?: string }>).detail;
      const target = detail?.section;
      if (!target) return;
      // Type-Guard: nur valide Sections setzen
      const valid: VerwaltungSection[] = [
        "sessions",
        "hardware",
        "daten",
        "outliers",
        "settings",
        "admin",
      ];
      if ((valid as string[]).includes(target)) {
        setSection(target as VerwaltungSection);
      }
    }
    window.addEventListener("cubetracker:goto-verwaltung-section", onGoto);
    return () =>
      window.removeEventListener("cubetracker:goto-verwaltung-section", onGoto);
  }, []);

  return (
    <div className="space-y-4">
      {/* Sub-Tab-Bar — mobile-first scrollbar (UX-Refactor 2026-05-14) */}
      <ScrollableTabBar
        tabs={tabs}
        current={section}
        onChange={(id) => setSection(id as VerwaltungSection)}
        ariaLabel="Verwaltungs-Bereiche"
        size="md"
      />

      {/* Aktive Sektion — Outliers managed Session-Filter intern.
          „Daten" enthält Import + Backup/Export untereinander. */}
      {section === "sessions" && <SessionList />}
      {section === "hardware" && <HardwareList />}
      {section === "daten" && (
        <div className="space-y-4">
          {/* Roadmap #6: Ownership-Botschaft + prominenter Backup-Download oben */}
          <MeineDatenCard />
          {/* Orientierungs-Hilfe: zwei verschiedene JSON-Formate
              im Spiel (Cubetracker-Backup vs csTimer-Export).
              User-Verwirrung-Potenzial hoch -> klarer Aufmacher. */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <p className="font-medium mb-1">Welches Format hast du?</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-100/80">
              <li>
                <strong>Cubetracker-Backup</strong> (Filename z.B.{" "}
                <code>cubetracker_…_….json</code>): unter
                <strong> „Backup &amp; Wiederherstellung"</strong> hochladen.
              </li>
              <li>
                <strong>csTimer-Export</strong> (Filename z.B.{" "}
                <code>cstimer_20260513_….txt</code> oder <code>.json</code>):
                unter <strong> „csTimer-Import"</strong> hochladen.
              </li>
            </ul>
          </div>

          {/* Reihenfolge nach Haeufigkeit/Use-Case:
              1. Voll-Backup (häufigste Aktion: Sicherung)
              2. csTimer-Import (Migration-Brücke)
              3. csTimer-Export (Export an csTimer-Mobile-App) */}
          <BackupPanel />
          <ImportPanel />
          <CsTimerExportPanel />
          {/* W.danger-zone: drei abgestufte Lösch-Aktionen ganz unten —
              bewusst nach Backup/Import-Tools, damit der User erst das
              Konstruktive sieht, dann das Destruktive. */}
          <DangerZoneCard />
        </div>
      )}
      {section === "outliers" && <OutlierCard />}
      {section === "settings" && <SettingsPanel />}
      {section === "admin" && isAdmin && <AdminPanel />}
    </div>
  );
}

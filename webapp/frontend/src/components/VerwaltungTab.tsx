// VerwaltungTab: Daten-Pflege (Phase L-1).
//
// Bewusst getrennt von ANALYSE: dort wird ausgewertet, hier wird
// administriert. Vier sub-bereiche, intern via sub-tab-state
// umgeschaltet (kein routing — die wahl bleibt nicht ueber app-
// reload erhalten, das ist OK fuer einen verwaltungs-tab).

import { useState } from "react";
import { BackupPanel } from "./BackupPanel";
import { CsTimerExportPanel } from "./CsTimerExportPanel";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { OutlierCard } from "./OutlierCard";
import { SessionList } from "./SessionList";
import { SettingsPanel } from "./SettingsPanel";

type VerwaltungSection =
  | "sessions"
  | "hardware"
  | "daten"
  | "outliers"
  | "settings";

interface SubTab {
  id: VerwaltungSection;
  label: string;
  icon: string;
}

const SUB_TABS: SubTab[] = [
  { id: "sessions", label: "Sessions", icon: "📁" },
  { id: "hardware", label: "Hardware", icon: "🧊" },
  { id: "daten", label: "Daten", icon: "📥" },
  { id: "outliers", label: "Outliers", icon: "⚠" },
  { id: "settings", label: "Einstellungen", icon: "⚙" },
];

export function VerwaltungTab() {
  const [section, setSection] = useState<VerwaltungSection>("sessions");

  return (
    <div className="space-y-4">
      {/* Sub-Tab-Bar */}
      <nav
        className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
        aria-label="Verwaltungs-Bereiche"
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

      {/* Aktive Sektion — Outliers managed Session-Filter intern.
          „Daten" enthaelt Import + Backup/Export untereinander. */}
      {section === "sessions" && <SessionList />}
      {section === "hardware" && <HardwareList />}
      {section === "daten" && (
        <div className="space-y-4">
          <ImportPanel />
          <CsTimerExportPanel />
          <BackupPanel />
        </div>
      )}
      {section === "outliers" && <OutlierCard />}
      {section === "settings" && <SettingsPanel />}
    </div>
  );
}

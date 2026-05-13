// VerwaltungTab: Daten-Pflege (Phase L-1).
//
// Bewusst getrennt von ANALYSE: dort wird ausgewertet, hier wird
// administriert. Vier sub-bereiche, intern via sub-tab-state
// umgeschaltet (kein routing — die wahl bleibt nicht ueber app-
// reload erhalten, das ist OK fuer einen verwaltungs-tab).

import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AdminPanel } from "./AdminPanel";
import { BackupPanel } from "./BackupPanel";
import { CsTimerExportPanel } from "./CsTimerExportPanel";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { OutlierCard } from "./OutlierCard";
import { PatchNotesPanel } from "./PatchNotesPanel";
import { SessionList } from "./SessionList";
import { SettingsPanel } from "./SettingsPanel";

type VerwaltungSection =
  | "sessions"
  | "hardware"
  | "daten"
  | "outliers"
  | "settings"
  | "patches"
  | "admin";

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
  { id: "patches", label: "Patch Notes", icon: "📋" },
];

// Admin-Tab nur fuer User mit is_admin === true (env-driven, siehe
// backend api/admin.py). Liegt am Ende um die Tab-Reihenfolge fuer
// Non-Admins stabil zu halten.
const ADMIN_TAB: SubTab = { id: "admin", label: "Admin", icon: "🛡" };

export function VerwaltungTab() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const tabs = isAdmin ? [...SUB_TABS, ADMIN_TAB] : SUB_TABS;

  const [section, setSection] = useState<VerwaltungSection>("sessions");

  return (
    <div className="space-y-4">
      {/* Sub-Tab-Bar */}
      <nav
        className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1"
        aria-label="Verwaltungs-Bereiche"
      >
        {tabs.map((t) => {
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
              1. Voll-Backup (haeufigste Aktion: Sicherung)
              2. csTimer-Import (Migration-Brücke)
              3. csTimer-Export (Export an csTimer-Mobile-App) */}
          <BackupPanel />
          <ImportPanel />
          <CsTimerExportPanel />
        </div>
      )}
      {section === "outliers" && <OutlierCard />}
      {section === "settings" && <SettingsPanel />}
      {section === "patches" && <PatchNotesPanel />}
      {section === "admin" && isAdmin && <AdminPanel />}
    </div>
  );
}

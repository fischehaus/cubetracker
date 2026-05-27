// VerwaltungTab: Daten-Pflege (Phase L-1).
//
// Bewusst getrennt von ANALYSE: dort wird ausgewertet, hier wird
// administriert. Vier sub-bereiche, intern via sub-tab-state
// umgeschaltet (kein routing — die wahl bleibt nicht über app-
// reload erhalten, das ist OK für einen verwaltungs-tab).

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { AdminPanel } from "./AdminPanel";
import { BackupPanel } from "./BackupPanel";
import { DangerZoneCard } from "./DangerZoneCard";
import { MeineDatenCard } from "./MeineDatenCard";
import { MyFeedbackPanel } from "./MyFeedbackPanel";
import { CsTimerExportPanel } from "./CsTimerExportPanel";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { OutlierCard } from "./OutlierCard";
import { ScrollableTabBar } from "./ScrollableTabBar";
import { SessionList } from "./SessionList";
import { SettingsPanel } from "./SettingsPanel";
import { TesterPanel } from "./TesterPanel";

// UX-Refactor 2026-05-14: Patches-Sub-Tab raus — Patch Notes leben jetzt
// am Versions-Badge (Header rechts oben) als Modal. Natuerlicherer Ort.
// W.tester-tab-ui (2026-05-28): „tester" als alternativer letzter Tab
// fuer User mit is_tester && !is_admin.
type VerwaltungSection =
  | "sessions"
  | "hardware"
  | "daten"
  | "outliers"
  | "settings"
  | "admin"
  | "tester";

interface SubTab {
  id: VerwaltungSection;
  label: string;
  icon: string;
}

// Reihenfolge + Icons sprach-unabhaengig; Labels via t() zur Render-Zeit.
const SUB_TAB_ICONS: Record<VerwaltungSection, string> = {
  sessions: "📁",
  hardware: "🧊",
  daten: "📥",
  outliers: "⚠",
  settings: "⚙",
  admin: "🛡",
  tester: "🧪",
};

const SUB_TAB_ORDER: VerwaltungSection[] = [
  "sessions",
  "hardware",
  "daten",
  "outliers",
  "settings",
];

export function VerwaltungTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  // Tester-Rolle (W.tester-tab-ui): User mit is_tester && !is_admin
  // bekommen einen eigenen "Tester"-Sub-Tab mit Live-Tests + Roadmap-
  // Pflege. Admin > Tester: Admin sieht den Admin-Tab (der die Tester-
  // Funktionen mitenthält), kein Tester-Tab zusätzlich.
  const isTesterOnly = !isAdmin && (user?.is_tester ?? false);
  const baseTabs: SubTab[] = SUB_TAB_ORDER.map((id) => ({
    id,
    label: t(`verwaltung.${id}`),
    icon: SUB_TAB_ICONS[id],
  }));
  const adminTab: SubTab = {
    id: "admin",
    label: t("verwaltung.admin"),
    icon: SUB_TAB_ICONS.admin,
  };
  const testerTab: SubTab = {
    id: "tester",
    label: t("verwaltung.tester"),
    icon: SUB_TAB_ICONS.tester,
  };
  const tabs = isAdmin
    ? [...baseTabs, adminTab]
    : isTesterOnly
      ? [...baseTabs, testerTab]
      : baseTabs;

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
        "tester",
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
        ariaLabel={t("verwaltung.ariaSubTabs")}
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
          {/* W.feedback-user-view: eigene Feedback-Items + Admin-Antworten.
              Direkt nach Ownership-Card weil thematisch ähnlich („was passiert
              mit meinen Daten / Anfragen?"). */}
          <MyFeedbackPanel />
          {/* Orientierungs-Hilfe: zwei verschiedene JSON-Formate
              im Spiel (Cubetracker-Backup vs csTimer-Export).
              User-Verwirrung-Potenzial hoch -> klarer Aufmacher. */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <p className="font-medium mb-1">
              {t("verwaltung.formatHintTitle")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-100/80">
              <li>{t("verwaltung.formatHintBackup")}</li>
              <li>{t("verwaltung.formatHintCstimer")}</li>
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
      {section === "tester" && isTesterOnly && <TesterPanel />}
    </div>
  );
}

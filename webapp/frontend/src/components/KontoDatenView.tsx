// KontoDatenView (W.ia-konto-usermenu, 2026-05-31): „Konto & Daten" —
// erreichbar über das UserMenu oben rechts (KEIN Haupt-Tab mehr). Vereint
// die früheren Verwaltung-Base-Sub-Tabs: Sessions, Hardware, Daten
// (Backup/Import/Export + eigenes Feedback), Outlier-Pflege, Sicherheit
// (Email/Passwort/Account-Löschen). Die App-/Aussehen-Einstellungen leben
// seit W.ia-einstellungen-bereich im eigenen „Einstellungen"-Bereich (UserMenu).
//
// CONTROLLED: section + onSectionChange leben in App.tsx (MainLayout, immer
// gemountet). So funktionieren Direkt-Sprünge von überall (UserMenu →
// Einstellungen, FeedbackUnreadToaster, OnboardingBanner) über den globalen
// `cubetracker:goto-konto-section`-Listener OHNE Event-Timing-Tanz — der
// frühere setTimeout-Hack entfällt.
//
// Hinweis: nutzt bewusst die bestehenden `verwaltung.*`-i18n-Keys für die
// Sub-Tab-Labels (Umbenennung wäre Mehraufwand ohne Nutzen; Keys sind nur
// intern). Admin/Tester-Werkzeuge bleiben im (rollensichtbaren) Verwaltung-
// Tab, bis W.ia-admin-bereich sie in einen eigenen Bereich zieht.

import { useTranslation } from "react-i18next";
import { Button } from "./ui";
import { BackupPanel } from "./BackupPanel";
import { CsTimerExportPanel } from "./CsTimerExportPanel";
import { DangerZoneCard } from "./DangerZoneCard";
import { HardwareList } from "./HardwareList";
import { ImportPanel } from "./ImportPanel";
import { MeineDatenCard } from "./MeineDatenCard";
import { MyFeedbackPanel } from "./MyFeedbackPanel";
import { OutlierCard } from "./OutlierCard";
import { ScrollableTabBar } from "./ScrollableTabBar";
import { SessionList } from "./SessionList";
import { AccountSettingsPanel } from "./AccountSettingsPanel";

export type KontoSection =
  | "sessions"
  | "hardware"
  | "daten"
  | "outliers"
  | "sicherheit";

// Reihenfolge + Icons sprach-unabhängig; Labels via t() zur Render-Zeit.
const SUB_TAB_ICONS: Record<KontoSection, string> = {
  sessions: "📁",
  hardware: "🧊",
  daten: "📥",
  outliers: "⚠",
  sicherheit: "🔐",
};

const SUB_TAB_ORDER: KontoSection[] = [
  "sessions",
  "hardware",
  "daten",
  "outliers",
  "sicherheit",
];

interface Props {
  section: KontoSection;
  onSectionChange: (s: KontoSection) => void;
  /** Zurück in die App (Statistik-Tab) — „konto" hat keine Haupt-TabBar. */
  onBack: () => void;
}

export function KontoDatenView({ section, onSectionChange, onBack }: Props) {
  const { t } = useTranslation();
  const tabs = SUB_TAB_ORDER.map((id) => ({
    id,
    label: t(`verwaltung.${id}`),
    icon: SUB_TAB_ICONS[id],
  }));

  return (
    <div className="space-y-4">
      {/* Kontext-Header: „konto" ist ein Pseudo-Tab ohne Eintrag in der
          Haupt-Leiste (die ist hier ausgeblendet). Titel + Zurück-Button
          machen klar, wo man ist und wie man zurück in die App kommt. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-100">
          <span aria-hidden="true">🗄</span>
          {t("kontoView.title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("kontoView.back")}
        </Button>
      </div>

      {/* Sub-Tab-Bar — mobile-first scrollbar */}
      <ScrollableTabBar
        tabs={tabs}
        current={section}
        onChange={(id) => onSectionChange(id as KontoSection)}
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

          {/* Reihenfolge nach Häufigkeit/Use-Case:
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
      {section === "sicherheit" && <AccountSettingsPanel />}
    </div>
  );
}

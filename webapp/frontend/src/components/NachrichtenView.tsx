// NachrichtenView (W.ia-nachrichten-bereich, 2026-05-31) — „Nachrichten":
// die Kommunikation User ↔ Team. Erreichbar über das UserMenu (Pseudo-Tab
// „nachrichten", NICHT in der Haupt-TabBar).
//
// Warum eigener Bereich: „Mein Feedback" ist ein Gesprächskanal mit dem Team
// (du schreibst, das Team antwortet) — keine „Daten"-Verwaltung. Lag bisher
// fehl-einsortiert unter Konto & Daten → Daten.
//
// Heute: Antworten des Teams auf dein Feedback (MyFeedbackPanel).
// Später (Roadmap „Nachrichten-Hub"): zusätzlich Community-/Friend-Nachrichten,
// sortiert nach Team vs. Freunde.

import { useTranslation } from "react-i18next";
import { Button } from "./ui";
import { MyFeedbackPanel } from "./MyFeedbackPanel";

interface Props {
  /** Zurück in die App (Statistik-Tab) — „nachrichten" hat keine Haupt-TabBar. */
  onBack: () => void;
}

export function NachrichtenView({ onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-100">
          <span aria-hidden="true">📬</span>
          {t("nachrichtenView.title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("nachrichtenView.back")}
        </Button>
      </div>
      <p className="text-sm text-gray-400 max-w-2xl">
        {t("nachrichtenView.intro")}
      </p>
      <MyFeedbackPanel />
    </div>
  );
}

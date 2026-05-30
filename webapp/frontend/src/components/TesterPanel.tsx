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

import { useTranslation } from "react-i18next";
import { AdminLiveTestsPanel } from "./AdminLiveTestsPanel";
import { AdminRoadmapPanel } from "./AdminRoadmapPanel";
import { Button } from "./ui";

interface Props {
  /** Zurück in die App (Statistik-Tab) — Tester ist kein Haupt-Tab. */
  onBack: () => void;
}

export function TesterPanel({ onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Kontext-Header (analog Konto & Daten / Admin): Tester ist ein
          Pseudo-Tab ohne Eintrag in der Haupt-Leiste. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-100">
          <span aria-hidden="true">🧪</span>
          {t("testerBereich.title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("testerBereich.back")}
        </Button>
      </div>

      {/* W.feedback-admin-tester-improvements (2026-05-28):
          „+ Feedback"-Button prominent oben. Beim Testen findet der
          Tester einen Bug oder einen Wunsch — ein Klick + er ist
          sofort im FeedbackModal, kann es eintragen ohne ueber den
          UserMenu zu gehen. Triggert das globale FeedbackModal via
          Custom-Event (Listener in App.tsx). */}
      <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-purple-100 leading-snug">
          {t("testerPanel.feedbackHint")}
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("cubetracker:open-feedback-modal"),
            )
          }
          className="text-sm rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors font-medium"
          title={t("testerPanel.feedbackButtonTitle")}
        >
          {t("testerPanel.feedbackButton")}
        </button>
      </div>
      <AdminLiveTestsPanel />
      <AdminRoadmapPanel readOnly={true} />
    </div>
  );
}

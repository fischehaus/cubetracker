// OnboardingBanner: Begrüßung + drei Quick-Aktionen, sichtbar wenn die
// DB leer ist (kein einziger Solve vorhanden).
//
// Bewusst klein und dismissable — wer einen leeren App-State eh kennt,
// will nicht jedesmal den Banner sehen. Nach „Ausblenden" merkt sich
// localStorage das, und der Banner bleibt weg auch wenn die DB später
// erneut leer wird (z.B. nach DB-Reset).
//
// Drei klare Pfade nach drin:
//  1. csTimer-Datei laden    → Konto & Daten / Daten (Import)
//  2. Ersten Solve eintragen → Tab-Wechsel zu TIMER
//  3. Hardware-Liste laden   → Konto & Daten / Hardware

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSolves } from "../lib/api";
import type { AppTab } from "./TabBar";

const STORAGE_KEY = "cubetracker.onboarding.dismissed";

// Sprung in die „Konto & Daten"-Ansicht (W.ia-konto-usermenu) — der globale
// Listener in App.tsx fängt das Event + setzt Tab + Sektion. „konto" ist ein
// Pseudo-Tab, daher kein direkter onSwitchTab-Pfad.
function gotoKonto(section: "daten" | "hardware") {
  window.dispatchEvent(
    new CustomEvent("cubetracker:goto-konto-section", { detail: { section } }),
  );
}

interface Props {
  onSwitchTab: (tab: AppTab) => void;
}

export function OnboardingBanner({ onSwitchTab }: Props) {
  const { t } = useTranslation();
  // Prüfen ob die DB leer ist — eine winzige query
  const { data: solves, isLoading } = useSolves({ limit: 1 });
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  // Solange wir nicht wissen ob leer: nichts zeigen (kein Flash)
  if (isLoading) return null;
  // DB hat schon Daten: Banner unnoetig
  if (solves && solves.length > 0) return null;
  // User hat Banner explizit ausgeblendet
  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border border-purple-500/40 bg-purple-500/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-purple-100 mb-2">
            {t("onboarding.welcome")}
          </h2>
          <p className="text-base text-gray-300 mb-4">
            {t("onboarding.intro")}
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => gotoKonto("daten")}
              className="rounded bg-purple-600 px-4 py-2 text-base text-white hover:bg-purple-700"
            >
              {t("onboarding.actionImport")}
            </button>
            <button
              onClick={() => onSwitchTab("timer")}
              className="rounded bg-gray-700 px-4 py-2 text-base text-gray-100 hover:bg-gray-600"
            >
              {t("onboarding.actionFirstSolve")}
            </button>
            <button
              onClick={() => gotoKonto("hardware")}
              className="rounded bg-gray-700 px-4 py-2 text-base text-gray-100 hover:bg-gray-600"
            >
              {t("onboarding.actionHardware")}
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t("onboarding.importTip")}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t("onboarding.dismissAria")}
          className="rounded text-2xl text-gray-500 hover:text-gray-200 leading-none -mt-1"
          title={t("onboarding.dismissTitle")}
        >
          ×
        </button>
      </div>
    </div>
  );
}

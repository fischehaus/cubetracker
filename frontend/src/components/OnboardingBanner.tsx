// OnboardingBanner: Begruessung + drei Quick-Aktionen, sichtbar wenn die
// DB leer ist (kein einziger Solve vorhanden).
//
// Bewusst klein und dismissable — wer einen leeren App-State eh kennt,
// will nicht jedesmal den Banner sehen. Nach „Ausblenden" merkt sich
// localStorage das, und der Banner bleibt weg auch wenn die DB spaeter
// erneut leer wird (z.B. nach DB-Reset).
//
// Drei klare Pfade nach drin:
//  1. csTimer-Datei laden    → Tab-Wechsel zu VERWALTUNG/Import
//  2. Ersten Solve eintragen → Tab-Wechsel zu TIMER
//  3. Hardware-Liste laden   → Tab-Wechsel zu VERWALTUNG/Hardware

import { useState } from "react";
import { useSolves } from "../lib/api";
import type { AppTab } from "./TabBar";

const STORAGE_KEY = "cubetracker.onboarding.dismissed";

interface Props {
  onSwitchTab: (tab: AppTab) => void;
}

export function OnboardingBanner({ onSwitchTab }: Props) {
  // Pruefen ob die DB leer ist — eine winzige query
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
            Willkommen bei cubetracker
          </h2>
          <p className="text-base text-gray-300 mb-4">
            Deine Datenbank ist noch leer. Drei Wege rein:
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => onSwitchTab("verwaltung")}
              className="rounded bg-purple-600 px-4 py-2 text-base text-white hover:bg-purple-700"
            >
              📥 csTimer-Datei importieren
            </button>
            <button
              onClick={() => onSwitchTab("timer")}
              className="rounded bg-gray-700 px-4 py-2 text-base text-gray-100 hover:bg-gray-600"
            >
              ⏱ Ersten Solve eintragen
            </button>
            <button
              onClick={() => onSwitchTab("verwaltung")}
              className="rounded bg-gray-700 px-4 py-2 text-base text-gray-100 hover:bg-gray-600"
            >
              🧊 Hardware-Inventar laden
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Tipp: csTimer-Import erkennt Duplikate — du kannst die selbe
            Datei mehrfach laden, ohne doppelte Eintraege zu bekommen.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Banner ausblenden"
          className="rounded text-2xl text-gray-500 hover:text-gray-200 leading-none -mt-1"
          title="Banner dauerhaft ausblenden"
        >
          ×
        </button>
      </div>
    </div>
  );
}

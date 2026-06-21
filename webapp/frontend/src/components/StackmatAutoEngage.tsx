// StackmatAutoEngage — schaltet den Timer-Modus automatisch auf "stackmat",
// sobald ein Stackmat frisch verbunden wird (W.stackmat-live-timer, 2026-06-20).
//
// User-Entscheidung (2026-06-20): bei JEDEM Verbinden neu engagen (nicht nach
// manueller Rückwahl unterdrücken). Manuell zurückwählbar im Timer-Modus-Picker.
//
// Mount in MainLayout (über der Tab-Umschaltung), damit es über Tab-Wechsel
// hinweg lebt. Null-rendering. Flanken-Erkennung disconnected/connecting →
// listening: der Store wird beim Logout via Worker-reset() geleert (status →
// "disconnected"), daher initialisiert die Ref beim Re-Login sauber auf false
// und ein späteres Verbinden feuert korrekt (kein Fehl-Engage durch Remount).

import { useEffect, useRef } from "react";
import * as stackmatStore from "../lib/stackmatStore";
import { useAppSettings } from "../lib/settings";

export function StackmatAutoEngage(): null {
  const [settings, setSettings] = useAppSettings();
  const listening = stackmatStore.useStackmatStore(
    (s) => s.status === "listening",
  );
  const prevListeningRef = useRef(listening);
  // settings + setSettings via Ref lesen (NICHT als Effect-Deps) — sonst feuert
  // der Effect bei jedem beliebigen Settings-Write neu (z.B. Schriftgröße). So
  // läuft er ausschließlich auf der listening-Flanke (QA W.stackmat-live-timer).
  const settingsRef = useRef(settings);
  const setSettingsRef = useRef(setSettings);
  settingsRef.current = settings;
  setSettingsRef.current = setSettings;

  useEffect(() => {
    // Flanke nicht-listening → listening = frischer Connect.
    if (listening && !prevListeningRef.current) {
      const cur = settingsRef.current;
      if (cur.timer_input_source !== "stackmat") {
        setSettingsRef.current({ ...cur, timer_input_source: "stackmat" });
      }
    }
    prevListeningRef.current = listening;
  }, [listening]);

  return null;
}

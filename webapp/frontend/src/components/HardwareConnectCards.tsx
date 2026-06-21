// HardwareConnectCards — die VERBINDUNGS-Karten (Stackmat + Smart-Cube) für die
// Einstellungen (W.hardware-in-einstellungen, 2026-06-20).
//
// Reine Store-Leser: sie lesen den jeweiligen Singleton-Store (gefüttert vom
// Worker in MainLayout) und reichen State + die Store-Passthroughs an die
// präsentationalen Karten. Dadurch ist die Verbindung unabhängig davon, ob die
// Einstellungen gerade offen sind (der Worker hält sie). Selektor `s => s` ist
// ref-stabil zwischen echten Änderungen → re-rendert nur bei State-Changes.

import * as stackmatStore from "../lib/stackmatStore";
import * as smartCubeStore from "../lib/smartCubeStore";
import { StackmatConnect } from "./StackmatConnect";
import { SmartCubeConnect } from "./SmartCubeConnect";

export function StackmatConnectCard() {
  const state = stackmatStore.useStackmatStore((s) => s);
  return (
    <StackmatConnect
      state={state}
      connect={stackmatStore.connect}
      disconnect={stackmatStore.disconnect}
      isSupported={stackmatStore.isSupported}
      getDiagnostics={stackmatStore.getDiagnostics}
    />
  );
}

export function SmartCubeConnectCard() {
  const state = smartCubeStore.useSmartCubeStore((s) => s);
  return (
    <SmartCubeConnect
      state={state}
      connect={smartCubeStore.connect}
      disconnect={smartCubeStore.disconnect}
      isSupported={smartCubeStore.isSupported}
    />
  );
}

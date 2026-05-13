// TouchTimerPad — Touch-Eingabe-Pad das die Space-Taste simuliert.
//
// Auf Touch-Devices erscheint unter der SpacebarTimerCard ein grosser
// Tap-Button. Pointerdown/-up dispatchen synthetische KeyboardEvents
// (code="Space") aufs window — der existierende useSpacebarTimer-Hook
// behandelt sie identisch zu echten Tastendruecken (er prueft weder
// isTrusted noch das spezifische target, nur e.code === "Space" und
// dass e.target keine INPUT/TEXTAREA ist — beim window-dispatch ist
// target = window, also nicht-typing).
//
// setPointerCapture stellt sicher, dass pointerup auch dann feuert,
// wenn der Finger vom Pad abrutscht — sonst koennte der Timer in
// "ready"/"holding" haengen bleiben.
//
// Auf Desktop (pointer: fine): rendert null. User benutzt echte
// Tastatur, der zusaetzliche Button waere nur visueller Lärm.

import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

function dispatchSpace(type: "keydown" | "keyup") {
  // bubbles=true egal weil wir auf window dispatchen, aber expliziter.
  const ev = new KeyboardEvent(type, {
    code: "Space",
    key: " ",
    bubbles: true,
  });
  window.dispatchEvent(ev);
}

export function TouchTimerPad() {
  const isTouchDevice = useIsTouchDevice();
  if (!isTouchDevice) return null;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // Pointer-Capture verhindert "lost pointerup" wenn Finger
        // ueber den Rand des Buttons rutscht waehrend "ready"/"running"
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // setPointerCapture kann in seltenen Faellen werfen — defensiv
        }
        dispatchSpace("keydown");
      }}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // s.o.
        }
        dispatchSpace("keyup");
      }}
      onPointerCancel={() => {
        // Touch unterbrochen (Browser-Geste, eingehender Anruf, Tab-Switch):
        // synthetic keyup feuern damit useSpacebarTimer nicht in
        // ready/holding stecken bleibt.
        dispatchSpace("keyup");
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="mt-4 w-full rounded-lg border-2 border-purple-500/60 bg-purple-600/20 py-8 text-lg font-semibold text-purple-100 select-none touch-none transition-colors active:bg-purple-600/50"
      aria-label="Touch-Timer-Pad: tippen und halten ersetzt die Space-Taste"
    >
      👆 Tippen &amp; halten — wie Space
    </button>
  );
}

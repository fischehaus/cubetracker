/**
 * Helpers für Touch-Devices: synthetische Space-KeyboardEvents
 * dispatchen, damit `useSpacebarTimer` Tap-Eingaben wie Tastatur-
 * Spacebar behandelt.
 *
 * Genutzt von:
 *  - `TouchTimerPad` (separater großer Tap-Button unter dem Timer)
 *  - `SpacebarTimerCard` (Timer-Display selbst ist auf Touch tappbar)
 */

export function dispatchSpace(type: "keydown" | "keyup"): void {
  // bubbles=true ist hier egal (wir dispatchen auf window), aber expliziter.
  const ev = new KeyboardEvent(type, {
    code: "Space",
    key: " ",
    bubbles: true,
  });
  window.dispatchEvent(ev);
}

// useFocusTrap — Fokus-Management für modale Dialoge (a11y, W.modal-focus-trap).
//
// Macht ein offenes Modal tastaturfest und WCAG-konform:
//  1. Beim Öffnen: zieht den Fokus in den Dialog (erstes fokussierbares
//     Element, sonst der Container) — respektiert aber ein bereits
//     fokussiertes Kind (z.B. <input autoFocus>).
//  2. Solange offen: Tab / Shift+Tab bleiben IM Dialog gefangen — am Rand
//     wird zyklisch umgebrochen, der Fokus kann nicht hinter das Overlay
//     wandern (WCAG 2.4.3).
//  3. Esc schließt den Dialog (via onEscape). Das ist PFLICHT, nicht Deko:
//     ein Fokus-Trap OHNE Tastatur-Ausweg wäre selbst eine Tastatur-Falle
//     (WCAG 2.1.2 „No Keyboard Trap").
//  4. Beim Schließen: gibt den Fokus an das öffnende Element zurück
//     (z.B. der Button / die Zeile, die das Modal geöffnet hat).
//
// Voraussetzung: das Modal wird nur gemountet, wenn es offen ist (alle
// App-Modals sind parent-gated) — so ist Mount = Öffnen, Unmount = Schließen.
// `ref` zeigt auf das innere Dialog-Element (NICHT auf das Backdrop).

import { useEffect, useRef, type RefObject } from "react";

// „Natürlich fokussierbare" Elemente + explizite tabindex>=0.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Modul-Level-Stack aller gerade aktiven Traps. Bei gestapelten Modals reagiert
// nur der oberste (zuletzt geöffnete) auf Tab/Esc — sonst würden mehrere Traps
// gleichzeitig den Fokus verarbeiten bzw. bei Esc ALLE Modals schließen.
const trapStack: symbol[] = [];

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  onEscape?: () => void,
): void {
  // „Latest ref" für onEscape: so muss der Trap-Effekt NICHT bei jedem
  // Render neu aufgesetzt werden. Täte er das (onEscape ist meist eine
  // frische Closure pro Render), liefe der initiale Auto-Fokus erneut und
  // risse den Fokus mitten in der Bedienung zurück an den Anfang.
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  // Öffner-Element EINMAL beim ERSTEN Render erfassen — da liegt der Fokus
  // noch beim auslösenden Button (vor React-Commit + evtl. <input autoFocus>
  // im Modal). Im useEffect wäre es zu spät: autoFocus hätte den Fokus dann
  // schon in den Dialog gezogen, und wir würden beim Schließen fälschlich
  // dorthin „zurückgeben" statt an den Öffner.
  const openerRef = useRef<HTMLElement | null>(null);
  if (openerRef.current === null && typeof document !== "undefined") {
    openerRef.current = document.activeElement as HTMLElement | null;
  }

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Diesen Trap als obersten auf den Stack legen (für Modal-Stacking, s.o.).
    const trapId = Symbol("focus-trap");
    trapStack.push(trapId);
    const isTopmost = (): boolean => trapStack[trapStack.length - 1] === trapId;

    // Sichtbar + fokussierbar. getClientRects() filtert display:none /
    // hidden-Subtrees zuverlässig (robuster als offsetParent, das bei
    // position:fixed null liefert).
    const getFocusable = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0);

    // (1) Fokus in den Dialog ziehen — aber nur, wenn nicht schon etwas
    // darin fokussiert ist (ein <input autoFocus> hat den Fokus evtl.
    // bereits geholt; den respektieren wir).
    if (!container.contains(document.activeElement)) {
      const initial = getFocusable();
      if (initial.length > 0) {
        initial[0].focus();
      } else {
        // Kein fokussierbares Kind → Container selbst fokussierbar machen,
        // damit Tastatur/Screenreader im Dialog landen.
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      // Nur der oberste Trap reagiert (gestapelte Modals → kein Doppel-Handling).
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        // Ohne onEscape schluckt der Trap Esc bewusst NICHT (kein
        // preventDefault) — sonst wäre ein Trap ohne Ausweg eine Falle.
        const esc = escapeRef.current;
        if (esc) {
          e.preventDefault();
          esc();
        }
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        // Nichts fokussierbar → Tab darf den Dialog trotzdem nicht verlassen.
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        // Rückwärts vom ersten Element (oder von außerhalb) → ans Ende.
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Vorwärts vom letzten Element (oder von außerhalb) → an den Anfang.
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Diesen Trap vom Stack nehmen → der darunterliegende wird wieder aktiv.
      const idx = trapStack.indexOf(trapId);
      if (idx !== -1) trapStack.splice(idx, 1);
      // (4) Fokus an den Öffner zurückgeben — nur wenn er noch im DOM ist
      // (die öffnende Zeile könnte inzwischen gelöscht worden sein).
      const opener = openerRef.current;
      if (
        opener &&
        typeof opener.focus === "function" &&
        document.contains(opener)
      ) {
        opener.focus();
      }
    };
  }, [ref]);
}

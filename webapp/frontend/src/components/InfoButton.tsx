// InfoButton — kleines ⓘ-Icon mit Erklaerungs-Popover.
//
// Verhalten:
//   - Hover (Desktop): Popover oeffnet automatisch nach kurzer Delay
//   - Klick (auch Touch): Popover toggelt
//   - Klick ausserhalb / Esc: Popover schliesst
//
// Bewusst nicht <details>/<summary> verwendet — das ist standard-HTML aber
// stylebar ungemuetlich (eigenes Disclosure-Widget passt besser zum Theme).

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Erklaerungs-Inhalt — Text oder kleine Markup-Struktur. */
  children: ReactNode;
  /** Position relativ zum Button. Default "right" — Popover oeffnet sich
   *  rechts neben dem Icon. Bei "left" links davon. */
  align?: "left" | "right";
  /** Optional: aria-Label fuer Screenreader (Default "Mehr Info"). */
  label?: string;
}

export function InfoButton({
  children,
  align = "right",
  label = "Mehr Info",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Outside-Click + Esc schliessen
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-block align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/60 text-gray-300 text-[11px] font-bold hover:bg-purple-600/40 hover:text-purple-100 transition-colors"
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          className={`absolute z-20 top-full mt-2 w-64 max-w-[80vw] rounded-lg border border-purple-500/40 bg-gray-900 px-3 py-2 text-xs leading-relaxed text-gray-200 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}

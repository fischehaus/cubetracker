// EmptyState-Primitive (W.design-system, 2026-05-30).
//
// Ersetzt das ad-hoc „nackte Card + grauer <p>"-Muster (Audit P9), das
// jede Karte selbst gebaut hat (uneinheitliches Wording/Padding, meist
// ohne Handlungsaufforderung).
//
// Gedacht für den INHALT einer Card im Leerzustand (die <Card>-Hülle
// kommt von außen). Optional mit Call-to-Action.

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyStateProps {
  /** Optionales Emoji/Icon — dezent, zentriert. */
  icon?: ReactNode;
  /** Kurze Titel-Zeile (was ist leer / was fehlt). */
  title: ReactNode;
  /** Optionaler Hilfstext darunter (wie man es füllt). */
  hint?: ReactNode;
  /** Optionale Handlungsaufforderung (z.B. ein <Button>). */
  action?: ReactNode;
  /** Größe. "md" (Default) = Vollformat-Card mit großem Icon + viel Luft.
   *  "sm" = kompakt für Mini-Kacheln (weniger py, kleineres Icon) —
   *  sonst bläht der Leerzustand kleine Dashboard-Kacheln auf
   *  (QA W.design-system 2026-05-30). */
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isSm ? "gap-1 py-3" : "gap-2 py-8",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(isSm ? "text-xl" : "text-3xl", "opacity-60")}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

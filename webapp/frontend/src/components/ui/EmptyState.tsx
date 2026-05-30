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
  /** Optionales Emoji/Icon — dezent, groß, zentriert. */
  icon?: ReactNode;
  /** Kurze Titel-Zeile (was ist leer / was fehlt). */
  title: ReactNode;
  /** Optionaler Hilfstext darunter (wie man es füllt). */
  hint?: ReactNode;
  /** Optionale Handlungsaufforderung (z.B. ein <Button>). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-8 text-center",
        className,
      )}
    >
      {icon && (
        <div className="text-3xl opacity-60" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

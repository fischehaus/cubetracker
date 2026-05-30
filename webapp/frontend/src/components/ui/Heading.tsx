// Heading-Primitive (W.design-system, 2026-05-30).
//
// Ersetzt >25 verschiedene h1/h2/h3-className-Varianten (Audit P2) durch
// ein kleines, definiertes Rang-System. Behebt nebenbei den a11y-Drift
// (Charts nutzten h3 mit Card-Titel-Stil → falsche Hierarchie).
//
// Drei Ränge:
//   <CardTitle>     h2 — Überschrift einer Card. RUHIGER als bisher:
//                   text-lg statt text-2xl. Die alten 2xl-Titel auf jeder
//                   Card waren der Haupttreiber des „lauten/unruhigen"
//                   Eindrucks (User-Befund 2026-05-30).
//   <SectionLabel>  Eyebrow-Label über einer Gruppe von Cards (Tab-
//                   Sektionen wie „HEUTE", „PERFORMANCE"). Dezent,
//                   uppercase, kleiner Tracking.
//   <SubTitle>      h3 — Unterüberschrift INNERHALB einer Card.
//
// Akzentfarbe (purple) bewusst sparsam: nur SectionLabel nutzt sie als
// dezenten Eyebrow. Card-Titel sind ruhiges gray-100.

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface HeadingProps {
  children: ReactNode;
  className?: string;
  /** Optionales id für aria-labelledby / Deep-Link-Anker. */
  id?: string;
}

/** Card-Überschrift (h2). Ruhig: text-lg, gray-100. */
export function CardTitle({ children, className, id }: HeadingProps) {
  return (
    <h2
      id={id}
      className={cn("text-lg font-semibold text-gray-100", className)}
    >
      {children}
    </h2>
  );
}

/** Eyebrow-Label über einer Card-Gruppe / Tab-Sektion. Dezent, uppercase. */
export function SectionLabel({ children, className, id }: HeadingProps) {
  return (
    <h2
      id={id}
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.15em] text-purple-300/80",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Unterüberschrift innerhalb einer Card (h3). */
export function SubTitle({ children, className, id }: HeadingProps) {
  return (
    <h3
      id={id}
      className={cn("text-sm font-semibold text-gray-200", className)}
    >
      {children}
    </h3>
  );
}

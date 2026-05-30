// Card — der zentrale Container-Primitive (W.design-system, 2026-05-30).
//
// Ersetzt das ~80× duplizierte `rounded-lg border border-gray-700
// bg-gray-900/50 p-{4,5,6}`-Muster (Audit P1). Eine Quelle für Radius/
// Border/Padding/Hintergrund.
//
// WICHTIG — Glassmorphism/Skin-Kopplung: Die Klasse `bg-gray-900/50`
// MUSS erhalten bleiben. Der Skin-/Glassmorphism-CSS-Selektor in
// index.css (`[class~="bg-gray-900/50"]`) hängt exakt an diesem Klassen-
// Wort. Würde die Card eine andere bg-Utility nutzen, würden „Deckend"-
// und „Glas"-Card-Stil bei aktivem Skin nicht mehr greifen. Darum ist
// die bg-Klasse hier hart verdrahtet, nicht konfigurierbar.
//
// Die „ruhigere" visuelle Richtung (User-Entscheidung 2026-05-30) lebt
// primär in Heading/Button/Spacing — die Card-Box bleibt bewusst
// zurückhaltend-neutral. Eine spätere zentrale Verfeinerung (z.B.
// subtilere Border) ändert dann ALLE Cards an dieser einen Stelle.

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export interface CardProps {
  children: ReactNode;
  /** Innen-Abstand. Default "md" (= p-6, der bisherige Standard). */
  padding?: keyof typeof PADDING;
  /** Farbton des Rahmens. "danger" = roter Akzent (Lösch-/Warn-Cards). */
  tone?: "default" | "danger";
  /** Zusätzliche (additive) Klassen — z.B. `space-y-4`, `mb-6`, `h-full`.
   *  NICHT zum Überschreiben von padding/tone gedacht. */
  className?: string;
  /** Optionales aria-/id-Passthrough für Sektions-Verlinkung. */
  id?: string;
}

export function Card({
  children,
  padding = "md",
  tone = "default",
  className,
  id,
}: CardProps) {
  const border =
    tone === "danger" ? "border-red-500/40" : "border-gray-700";
  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border bg-gray-900/50",
        border,
        PADDING[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

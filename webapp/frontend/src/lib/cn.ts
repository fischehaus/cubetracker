/**
 * Minimaler className-Join-Helper (W.design-system, 2026-05-30).
 *
 * Filtert falsy-Werte (false/null/undefined) raus und joint mit Space.
 * Bewusst KEIN tailwind-merge: die UI-Primitive lösen Varianten über
 * Props (padding/tone/variant) zu jeweils GENAU einer Klasse auf —
 * `className` ist nur für ADDITIVE Klassen (mb-4, w-full, …) gedacht,
 * nicht zum Überschreiben von Varianten-Klassen. Damit gibt es keine
 * Konflikt-Auflösung und der Helper kann winzig bleiben.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

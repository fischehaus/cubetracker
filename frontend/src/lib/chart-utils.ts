// Pure Funktionen fuer Chart-Utilities — clientseitige Domain-Berechnung
// fuer Recharts-Y-Achsen, sodass kleine Aenderungen sichtbar werden
// statt vom 0-Punkt verschluckt zu werden.

/**
 * Lineares Quantil (P0..P1, e.g. 0.02 = unteres 2%-Perzentil).
 * Erwartet aufsteigend sortiertes Array.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

/**
 * Berechnet eine sinnvolle Y-Domain fuer einen Trend-Chart.
 *
 * Statt von 0 zu starten (was kleine Aenderungen unsichtbar macht),
 * nehmen wir P2 - P98 mit etwas Padding. Extreme Outliers werden so
 * weggekuerzt, der Hauptverlauf wird gross sichtbar.
 *
 * @param values   Liste von Mess-Werten in ms (nulls werden ignoriert)
 * @param padding  Anteil zusaetzlicher Padding oben+unten (default 0.05 = 5%)
 * @returns [minMs, maxMs] — beide ≥ 0
 */
export function computeYDomain(
  values: (number | null | undefined)[],
  padding: number = 0.05
): [number, number] {
  const valid = values.filter(
    (v): v is number => typeof v === "number" && isFinite(v) && v >= 0
  );
  if (valid.length === 0) return [0, 1000];
  if (valid.length === 1) {
    const v = valid[0];
    return [Math.max(0, v * 0.9), v * 1.1];
  }
  const sorted = [...valid].sort((a, b) => a - b);
  const lo = percentile(sorted, 0.02);
  const hi = percentile(sorted, 0.98);
  const span = Math.max(hi - lo, 1); // mind. 1ms span, nie 0
  const pad = span * padding;
  return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
}

/**
 * Parst einen Sekunden-String aus einem Manual-Y-Achsen-Input.
 * Akzeptiert "12.34", "60", "1:23.45". Liefert ms oder null.
 *
 * Wir nutzen NICHT den csTimer-Stackmat-Parser hier, weil der bei
 * Y-Achsen-Bedienung verwirrend waere ('15' soll 15s heissen, nicht 0.15s).
 */
export function parseSecondsToMs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const min = parseInt(m, 10);
    const sec = parseFloat(s);
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0) return null;
    return Math.round((min * 60 + sec) * 1000);
  }
  const sec = parseFloat(trimmed);
  if (isNaN(sec) || sec < 0) return null;
  return Math.round(sec * 1000);
}

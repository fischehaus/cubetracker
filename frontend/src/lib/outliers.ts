// Outlier-Detection: findet verdaechtige Solve-Zeiten pro Cube-Type.
//
// Heuristik (per cube_type, mind. 10 Solves):
//   - „verdaechtig schnell" : effective_ms < median * SPEED_FACTOR
//   - „verdaechtig langsam" : effective_ms > median * SLOW_FACTOR
//
// DNFs sind kein Outlier (User hat sie schon markiert) und werden ausgeschlossen.
//
// Ziel: User sieht „in 3x3 ist 1 solve mit 0.67s sehr verdaechtig" und kann
// per klick als DNF markieren oder loeschen, statt in der ganzen Liste zu suchen.

export interface OutlierInput {
  id: number;
  time_ms: number;
  cube_type: string;
  dnf: boolean;
  plus_two: boolean;
}

export interface OutlierEntry {
  id: number;
  cube_type: string;
  effective_ms: number;
  reason: "too_fast" | "too_slow";
  /** wie weit weg vom Median, als Faktor (z.B. 0.05 = 5% des Medians, 8 = 8x Median) */
  factor: number;
}

export interface OutlierGroup {
  cube_type: string;
  median_ms: number;
  count_total: number;
  outliers: OutlierEntry[];
}

const SPEED_FACTOR = 0.3; // alles unter 30% des Medians ist verdaechtig
const SLOW_FACTOR = 5; // alles ueber 5x Median ist verdaechtig
const MIN_SOLVES_PER_CUBE = 10; // unter 10 Solves keine sinnvolle Median-Schaetzung

/**
 * Median einer Zahlenliste. Erwartet sortiert oder unsortiert.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * Effektive Zeit eines Solves (mit +2-Strafe). DNF wird hier nicht behandelt
 * — der Caller filtert DNFs vorher raus.
 */
function effectiveMs(s: OutlierInput): number {
  return s.time_ms + (s.plus_two ? 2000 : 0);
}

/**
 * Findet Outlier-Solves, gruppiert nach Cube-Type.
 *
 * Cube-Types mit < MIN_SOLVES_PER_CUBE validen (non-DNF) Solves werden
 * uebersprungen — sonst gibt es bei wenigen Solves zu viele False-Positives.
 *
 * Rueckgabe: Array von Gruppen, sortiert nach Anzahl Outliers (most-suspicious first).
 * Gruppen ohne Outliers werden weggelassen.
 */
export function findOutliers(solves: OutlierInput[]): OutlierGroup[] {
  // Gruppieren nach cube_type, DNFs raus
  const byCube = new Map<string, OutlierInput[]>();
  for (const s of solves) {
    if (s.dnf) continue;
    const arr = byCube.get(s.cube_type) ?? [];
    arr.push(s);
    byCube.set(s.cube_type, arr);
  }

  const result: OutlierGroup[] = [];
  for (const [cube_type, group] of byCube.entries()) {
    if (group.length < MIN_SOLVES_PER_CUBE) continue;
    const med = median(group.map(effectiveMs));
    if (med <= 0) continue;
    const lo = med * SPEED_FACTOR;
    const hi = med * SLOW_FACTOR;
    const outliers: OutlierEntry[] = [];
    for (const s of group) {
      const eff = effectiveMs(s);
      if (eff < lo) {
        outliers.push({
          id: s.id,
          cube_type,
          effective_ms: eff,
          reason: "too_fast",
          factor: eff / med,
        });
      } else if (eff > hi) {
        outliers.push({
          id: s.id,
          cube_type,
          effective_ms: eff,
          reason: "too_slow",
          factor: eff / med,
        });
      }
    }
    if (outliers.length > 0) {
      // Innerhalb der Gruppe: extremste zuerst (kleinster oder groesster factor)
      outliers.sort((a, b) => {
        // too_fast: kleinster factor zuerst (extremster)
        // too_slow: groesster factor zuerst
        if (a.reason !== b.reason) return a.reason === "too_fast" ? -1 : 1;
        return a.reason === "too_fast" ? a.factor - b.factor : b.factor - a.factor;
      });
      result.push({
        cube_type,
        median_ms: Math.round(med),
        count_total: group.length,
        outliers,
      });
    }
  }

  // Gruppen mit den meisten Outliers zuerst
  result.sort((a, b) => b.outliers.length - a.outliers.length);
  return result;
}

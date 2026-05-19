// Outlier-Detection: findet verdaechtige Solve-Zeiten pro Cube-Type.
//
// Heuristik (per cube_type, mind. 10 Solves):
//   - „verdaechtig schnell" : effective_ms < median * SPEED_FACTOR
//   - „verdaechtig langsam" : effective_ms > median * SLOW_FACTOR
//
// DNFs sind kein Outlier (User hat sie schon markiert) und werden ausgeschlossen.
//
// Ziel: User sieht „in 3x3 ist 1 solve mit 0.67s sehr verdaechtig" und kann
// per klick als DNF markieren oder löschen, statt in der ganzen Liste zu suchen.

export interface OutlierInput {
  id: number;
  time_ms: number;
  cube_type: string;
  dnf: boolean;
  plus_two: boolean;
  /** Phase 8.1: nur für findOutliersBySession noetig, sonst optional */
  session_id?: number | null;
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
  /** Bei findOutliers (cube-mode) gleich dem cube_type. Bei
   *  findOutliersBySession (session-mode) gleich der session-id-as-string
   *  oder "no-session". UI nutzt das für das group-Label-Lookup. */
  group_key: string;
  /** Backwards-compat: bei cube-mode der cube_type, bei session-mode leer. */
  cube_type: string;
  /** Bei session-mode gefuellt mit der session-id (oder null für „ohne Session"). */
  session_id?: number | null;
  median_ms: number;
  count_total: number;
  outliers: OutlierEntry[];
}

const SPEED_FACTOR = 0.3; // alles unter 30% des Medians ist verdaechtig
const SLOW_FACTOR = 5; // alles über 5x Median ist verdaechtig
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
 * Pure helper — gruppiert solves nach einem beliebigen key und findet
 * Outliers innerhalb jeder Gruppe. Wird von findOutliers + findOutliersBySession
 * geteilt.
 */
function findOutliersByKey(
  solves: OutlierInput[],
  keyFn: (s: OutlierInput) => string,
  buildGroup: (key: string, group: OutlierInput[]) => Pick<OutlierGroup, "group_key" | "cube_type" | "session_id">,
): OutlierGroup[] {
  const byKey = new Map<string, OutlierInput[]>();
  for (const s of solves) {
    if (s.dnf) continue;
    const k = keyFn(s);
    const arr = byKey.get(k) ?? [];
    arr.push(s);
    byKey.set(k, arr);
  }

  const result: OutlierGroup[] = [];
  for (const [k, group] of byKey.entries()) {
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
          cube_type: s.cube_type,
          effective_ms: eff,
          reason: "too_fast",
          factor: eff / med,
        });
      } else if (eff > hi) {
        outliers.push({
          id: s.id,
          cube_type: s.cube_type,
          effective_ms: eff,
          reason: "too_slow",
          factor: eff / med,
        });
      }
    }
    if (outliers.length > 0) {
      outliers.sort((a, b) => {
        if (a.reason !== b.reason) return a.reason === "too_fast" ? -1 : 1;
        return a.reason === "too_fast" ? a.factor - b.factor : b.factor - a.factor;
      });
      result.push({
        ...buildGroup(k, group),
        median_ms: Math.round(med),
        count_total: group.length,
        outliers,
      });
    }
  }

  result.sort((a, b) => b.outliers.length - a.outliers.length);
  return result;
}

/**
 * Findet Outlier-Solves, gruppiert nach Cube-Type.
 *
 * Cube-Types mit < MIN_SOLVES_PER_CUBE validen (non-DNF) Solves werden
 * übersprungen — sonst gibt es bei wenigen Solves zu viele False-Positives.
 *
 * Rueckgabe: Array von Gruppen, sortiert nach Anzahl Outliers (most-suspicious first).
 * Gruppen ohne Outliers werden weggelassen.
 */
export function findOutliers(solves: OutlierInput[]): OutlierGroup[] {
  return findOutliersByKey(
    solves,
    (s) => s.cube_type,
    (key) => ({ group_key: key, cube_type: key, session_id: undefined }),
  );
}

/**
 * Phase 8.1: Outlier-Detection gruppiert nach Session-ID.
 *
 * Use-case: User hat mehrere 3x3-Sessions (Training / Speed / OH-3x3 etc.) —
 * der „Median pro Cube" ist dann oft irrefuehrend, weil eine reine OH-Session
 * langsamer ist als das normale 3x3-Training. „Median pro Session" misst
 * Anomalien innerhalb des Trainings-Kontexts.
 *
 * Solves ohne session_id werden in eine eigene Gruppe „no-session" gepoolt.
 */
export function findOutliersBySession(solves: OutlierInput[]): OutlierGroup[] {
  return findOutliersByKey(
    solves,
    (s) => (s.session_id == null ? "no-session" : String(s.session_id)),
    (key) => ({
      group_key: key,
      cube_type: "",
      session_id: key === "no-session" ? null : parseInt(key, 10),
    }),
  );
}

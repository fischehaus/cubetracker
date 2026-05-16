// Pure Funktionen fuer rollende WCA-Averages, clientseitig.
// Spiegelt die Logik aus backend/stats/calc.py (trim 1 fuer n=5..12, etc.)
// damit die Liste ohne Zusatz-API-Call die ao5/ao12 pro Solve anzeigen kann.

/**
 * Eingabe-Punkt fuer Rolling-Average. Bewusst minimal — wir brauchen nur
 * die Felder, die fuer die WCA-Berechnung relevant sind.
 */
export interface SolvePoint {
  time_ms: number;
  dnf: boolean;
  plus_two: boolean;
}

/**
 * Effektive Zeit eines Solves (mit +2-Strafe). DNF → +Infinity, damit
 * DNFs beim Sortieren immer als „worst" gelten.
 */
export function effectiveMs(s: SolvePoint): number {
  if (s.dnf) return Number.POSITIVE_INFINITY;
  return s.time_ms + (s.plus_two ? 2000 : 0);
}

/**
 * WCA-Trim-Anzahl (pro Seite): floor(5%), aber mind. 1 ab n>=3.
 *   n<3        → 0  (kein Trim sinnvoll, average undefined)
 *   3<=n<=12   → 1
 *   n>=13      → max(1, floor(n*0.05))
 */
export function trimForN(n: number): number {
  if (n < 3) return 0;
  if (n <= 12) return 1;
  return Math.max(1, Math.floor(n * 0.05));
}

/**
 * Trimmed Mean nach WCA-Regel. Liefert null bei:
 *   - zu wenigen Solves (n<3)
 *   - mehr als `trim` DNFs (mind. eine DNF bleibt im Mittel)
 *
 * Rueckgabe: gerundete Millisekunden.
 */
export function averageOfN(solves: SolvePoint[]): number | null {
  const n = solves.length;
  if (n < 3) return null;
  const trim = trimForN(n);
  const times = solves.map(effectiveMs).sort((a, b) => a - b);
  const middle = times.slice(trim, n - trim);
  if (middle.some((t) => !isFinite(t))) return null;
  const sum = middle.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / middle.length);
}

/**
 * Berechnet fuer JEDEN Solve in `solves` den rollenden Average der letzten n.
 *
 * `solves` muss in chronologischer Reihenfolge sein (alt → neu).
 * Fuer Solve an Index i wird das Fenster [i-n+1 ... i] genommen.
 * Fenster, die ueber den Anfang hinausgehen, ergeben null.
 *
 * Rueckgabe: array gleicher Laenge wie input, jeweils Average oder null.
 */
export function rollingAverages(
  solves: SolvePoint[],
  windowSize: number
): (number | null)[] {
  const result: (number | null)[] = new Array(solves.length).fill(null);
  for (let i = 0; i < solves.length; i++) {
    if (i + 1 < windowSize) {
      result[i] = null;
      continue;
    }
    const window = solves.slice(i - windowSize + 1, i + 1);
    result[i] = averageOfN(window);
  }
  return result;
}

/**
 * Arithmetisches Mittel ohne Trim — fuer mo3 (Mean of 3) und allgemein
 * fuer Werte wo WCA keinen Trim vorschreibt.
 *
 * Liefert null bei:
 *   - weniger als n Solves
 *   - mindestens einer DNF (mo3 + DNF = DNF, ohne Ausnahme)
 */
export function meanOfN(solves: SolvePoint[]): number | null {
  if (solves.length === 0) return null;
  const times = solves.map(effectiveMs);
  if (times.some((t) => !isFinite(t))) return null; // DNF -> Mean undefined
  const sum = times.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / times.length);
}

/**
 * Wie rollingAverages, aber mit Mean (kein Trim).
 * Fuer mo3 (Mean of 3) — gibt es im WCA-Format z.B. bei Big-Cubes
 * (6x6 / 7x7) wo nur 3 Solves pro Round zaehlen.
 */
export function rollingMeans(
  solves: SolvePoint[],
  windowSize: number,
): (number | null)[] {
  const result: (number | null)[] = new Array(solves.length).fill(null);
  for (let i = 0; i < solves.length; i++) {
    if (i + 1 < windowSize) {
      result[i] = null;
      continue;
    }
    const window = solves.slice(i - windowSize + 1, i + 1);
    result[i] = meanOfN(window);
  }
  return result;
}

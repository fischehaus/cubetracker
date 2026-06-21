// Optimistic-Update-Helfer für useCreateSolve (W.timer-save-speed, 2026-06-20).
//
// Bewusst in einer eigenen, pur-en Datei (kein axios-/React-Import) → DOM-frei
// unit-testbar. Hintergrund: nach einem Solve dauerte es spürbar (mehrere
// Sekunden), bis die Zeit in der Solve-Übersicht erschien — der POST macht im
// Backend einen synchronen PB-Scan (O(n)) + Achievement-Check, und danach lädt
// das Frontend die (bis zu 50k Zeilen große) Solves-Liste neu. Lösung:
// optimistisch sofort einfügen, der echte Solve ersetzt den Temp beim Refetch.

import type { Solve, SolveCreate } from "./types";

/**
 * Baut den Temp-Solve fürs optimistische Einfügen aus dem Create-Payload.
 * `tempId` muss negativ + eindeutig sein (kollidiert nie mit echten Server-ids).
 * `effective_time_ms` spiegelt die Backend-Regel: DNF → null, +2 → +2000 ms.
 */
export function buildOptimisticSolve(
  payload: SolveCreate,
  tempId: number,
  nowIso: string,
): Solve {
  const plusTwo = payload.plus_two ?? false;
  const dnf = payload.dnf ?? false;
  return {
    id: tempId,
    time_ms: payload.time_ms,
    cube_type: payload.cube_type,
    scramble: payload.scramble ?? null,
    notes: payload.notes ?? null,
    timestamp: payload.timestamp ?? nowIso,
    plus_two: plusTwo,
    dnf,
    session_id: payload.session_id ?? null,
    hardware_id: payload.hardware_id ?? null,
    effective_time_ms: dnf ? null : payload.time_ms + (plusTwo ? 2000 : 0),
    alg_case: payload.alg_case ?? null,
    split_times_ms: payload.split_times_ms ?? null,
  };
}

/**
 * Passt eine Solves-LIST-Query zum gerade erzeugten Solve? queryKey-Form:
 * `["solves-domain", "list", { cube_type, session_id?, limit }]`. Stats-/PB-
 * Queries (queryKey[1] !== "list") werden ausgeschlossen — dort hätte ein
 * Solve-Objekt nichts zu suchen. Eine nach Session gefilterte Liste bekommt den
 * Solve nur, wenn die Session passt; die ungefilterte Cube-Liste immer.
 */
export function solveListMatches(
  queryKey: readonly unknown[],
  payload: SolveCreate,
): boolean {
  // Drill-Solves (Alg-Trainer, mit alg_case) gehören NICHT in die Timer-Tab-
  // Letzten-Solves — sonst blitzt ein Drill kurz dort auf (QA W.timer-save-speed).
  if (payload.alg_case != null) return false;
  if (queryKey[1] !== "list") return false;
  const params = queryKey[2] as
    | { cube_type?: string; session_id?: number }
    | undefined;
  if (!params || params.cube_type !== payload.cube_type) return false;
  if (
    params.session_id != null &&
    params.session_id !== (payload.session_id ?? undefined)
  ) {
    return false;
  }
  return true;
}

// Wiederverwendbare Sort-Logik für Solve-Tabellen (LastSolvesPreview +
// SolveList). Die Tabellen haben gleiche Sort-Keys: Solvenummer, Zeit, AO5,
// AO12. Sortierung beruecksichtigt +2 (effektive Zeit) und schiebt DNFs
// + null-Averages ans Ende beider Richtungen, weil sie "kein Wert" sind.

import { effectiveMs } from "./rolling";

export type SortKey = "num" | "time" | "mo3" | "ao5" | "ao12" | "ao100";
export type SortDir = "asc" | "desc";

export interface SortableSolveRow {
  solveNumber: number; // groesste Zahl = neuester Solve
  time_ms: number;
  dnf: boolean;
  plus_two: boolean;
  mo3: number | null;
  ao5: number | null;
  ao12: number | null;
  ao100: number | null;
}

function nullableValue(v: number | null, dir: SortDir): number {
  // null landet im asc + desc immer am Ende — sonst könnte ein User
  // beim Klick auf "Zeit asc" lauter "—" oben sehen, was Quatsch ist.
  if (v === null) return dir === "asc" ? Infinity : -Infinity;
  return v;
}

export function sortSolveRows<T extends SortableSolveRow>(
  rows: T[],
  key: SortKey,
  dir: SortDir,
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    let aVal: number;
    let bVal: number;
    switch (key) {
      case "num":
        aVal = a.solveNumber;
        bVal = b.solveNumber;
        break;
      case "time":
        // effektive Zeit für Sortierung — +2 zählt, DNF = +Inf (Ende)
        aVal = a.dnf
          ? dir === "asc"
            ? Infinity
            : -Infinity
          : effectiveMs({
              time_ms: a.time_ms,
              dnf: false,
              plus_two: a.plus_two,
            });
        bVal = b.dnf
          ? dir === "asc"
            ? Infinity
            : -Infinity
          : effectiveMs({
              time_ms: b.time_ms,
              dnf: false,
              plus_two: b.plus_two,
            });
        break;
      case "mo3":
        aVal = nullableValue(a.mo3, dir);
        bVal = nullableValue(b.mo3, dir);
        break;
      case "ao5":
        aVal = nullableValue(a.ao5, dir);
        bVal = nullableValue(b.ao5, dir);
        break;
      case "ao12":
        aVal = nullableValue(a.ao12, dir);
        bVal = nullableValue(b.ao12, dir);
        break;
      case "ao100":
        aVal = nullableValue(a.ao100, dir);
        bVal = nullableValue(b.ao100, dir);
        break;
    }
    const cmp = aVal - bVal;
    return dir === "asc" ? cmp : -cmp;
  });
  return copy;
}

/** UI-Helper: passendes Pfeil-Symbol für einen Spalten-Header. */
export function sortIndicator(
  thisKey: SortKey,
  activeKey: SortKey,
  dir: SortDir,
): string {
  if (thisKey !== activeKey) return "";
  return dir === "asc" ? " ▲" : " ▼";
}

/**
 * Toggle-Logik für einen Header-Klick: derselbe Key zweimal klicken
 * dreht die Richtung um, anderer Key setzt Default-Richtung (Solvenummer
 * + Zeiten initial DESC = neueste/schnellste zuerst).
 */
export function nextSortState(
  current: { key: SortKey; dir: SortDir },
  clicked: SortKey,
): { key: SortKey; dir: SortDir } {
  if (current.key !== clicked) {
    // Solvenummer initial desc (neueste oben), Zeiten initial asc (beste oben)
    const defaultDir: SortDir = clicked === "num" ? "desc" : "asc";
    return { key: clicked, dir: defaultDir };
  }
  return { key: clicked, dir: current.dir === "asc" ? "desc" : "asc" };
}

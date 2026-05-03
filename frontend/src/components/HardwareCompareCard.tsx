// HardwareCompareCard: Hardware-Performance-Vergleich innerhalb eines
// Cube-Types (Phase 5d + Sortierung).
//
// Zeigt fuer den aktuellen Cube-Filter, mit welchem Cube der User die
// besten/schlechtesten Zeiten hatte. Spalten: Hardware | PB | Schnitt |
// aktueller ao5 | Best ao5 | aktueller ao12 | Best ao12 | Solves.
// Click auf Spalten-Header -> Sortierung wechseln (asc <-> desc).
// „Ohne Hardware" (csTimer-Importe ohne Hardware-Zuordnung) als eigene Zeile.
//
// Wenn kein Cube-Filter gesetzt: leere Card mit Hinweis. Hardware-Vergleich
// ueber alle Cubes hinweg waere bedeutungslos (verschiedene Skalen).

import { useMemo, useState } from "react";
import { useStatsByHardware, type HardwareCubeStats } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

// Welche Spalte ist sortierbar — Key = Feldname im HardwareCubeStats
type SortKey =
  | "hardware_name"
  | "best_ms"
  | "mean_ms"
  | "current_ao5"
  | "best_ao5"
  | "current_ao12"
  | "best_ao12"
  | "count";

interface ColumnDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
  /** Default-Sortier-Richtung beim ersten Klick auf diese Spalte */
  defaultDir: "asc" | "desc";
}

const COLUMNS: ColumnDef[] = [
  { key: "hardware_name", label: "Hardware", align: "left", defaultDir: "asc" },
  { key: "best_ms", label: "PB", align: "right", defaultDir: "asc" },
  { key: "mean_ms", label: "Schnitt", align: "right", defaultDir: "asc" },
  { key: "current_ao5", label: "ao5", align: "right", defaultDir: "asc" },
  { key: "best_ao5", label: "Best ao5", align: "right", defaultDir: "asc" },
  { key: "current_ao12", label: "ao12", align: "right", defaultDir: "asc" },
  { key: "best_ao12", label: "Best ao12", align: "right", defaultDir: "asc" },
  { key: "count", label: "Solves", align: "right", defaultDir: "desc" },
];

/**
 * Vergleichs-Funktion fuer Sortierung. Behandelt Strings, Zahlen, null.
 * Null-Werte landen IMMER ans Ende (egal ob asc oder desc), damit
 * „keine Daten" nicht oben steht.
 */
function compareValues(
  a: HardwareCubeStats,
  b: HardwareCubeStats,
  key: SortKey,
  dir: "asc" | "desc"
): number {
  const av = a[key];
  const bv = b[key];

  // null/undefined immer hinten
  const aNull = av === null || av === undefined;
  const bNull = bv === null || bv === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp: number;
  if (typeof av === "string" && typeof bv === "string") {
    cmp = av.localeCompare(bv);
  } else {
    cmp = (av as number) - (bv as number);
  }
  return dir === "asc" ? cmp : -cmp;
}

export function HardwareCompareCard({ cubeType, sessionId }: Props) {
  const { data, isLoading, error } = useStatsByHardware(cubeType, sessionId);
  // Sort-State: default = best_ms asc (PB zuerst, wie vorher)
  const [sortKey, setSortKey] = useState<SortKey>("best_ms");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleHeaderClick(col: ColumnDef) {
    if (sortKey === col.key) {
      // gleiche Spalte → toggle direction
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      // neue Spalte → ihre Default-Richtung
      setSortKey(col.key);
      setSortDir(col.defaultDir);
    }
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.hardware].sort((a, b) =>
      compareValues(a, b, sortKey, sortDir)
    );
  }, [data, sortKey, sortDir]);

  if (!cubeType) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          Hardware-Vergleich
        </h2>
        <p className="text-base text-gray-500">
          Setze oben einen Cube-Filter, um zu sehen, mit welchem Wuerfel du
          schneller bist.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Hardware-Vergleich wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-red-300 text-base">
        Fehler: {error.message}
      </div>
    );
  }
  if (!data || data.hardware.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          Hardware-Vergleich ({cubeType})
        </h2>
        <p className="text-base text-gray-500">
          Noch keine Daten fuer diesen Cube.
        </p>
      </div>
    );
  }

  // Bester PB-Wert fuer optisches Highlight (★)
  const bestEver = data.hardware.find((h) => h.best_ms !== null)?.best_ms ?? null;
  const sortLabel = COLUMNS.find((c) => c.key === sortKey)?.label ?? "";

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-100">
          Hardware-Vergleich{" "}
          <span className="text-base text-gray-400">({cubeType})</span>
        </h2>
        <span className="text-sm text-gray-500">
          sortiert nach {sortLabel} {sortDir === "asc" ? "↑" : "↓"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-gray-700 text-sm text-gray-400">
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={`py-2 pr-3 font-medium cursor-pointer select-none hover:text-gray-200 transition ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${active ? "text-purple-300" : ""}`}
                    title="Click zum Sortieren"
                  >
                    {col.label}
                    <span className="ml-1 text-xs">
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const isPbCube =
                h.best_ms !== null && h.best_ms === bestEver;
              const isOhne = h.hardware_id === null;
              return (
                <tr
                  key={h.hardware_id ?? "none"}
                  className={`border-b border-gray-800 ${
                    isPbCube ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="py-3 pr-3">
                    <span
                      className={
                        isOhne
                          ? "text-gray-500 italic"
                          : isPbCube
                          ? "text-yellow-300 font-semibold"
                          : "text-gray-100 font-medium"
                      }
                    >
                      {isPbCube && "★ "}
                      {h.hardware_name}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono">
                    <span
                      className={
                        h.best_ms === null
                          ? "text-gray-600"
                          : isPbCube
                          ? "text-yellow-300 font-semibold"
                          : "text-gray-100"
                      }
                    >
                      {h.best_ms !== null ? formatTime(h.best_ms) : "–"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-gray-300">
                    {h.mean_ms !== null ? formatTime(h.mean_ms) : "–"}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-gray-300">
                    {h.current_ao5 !== null ? formatTime(h.current_ao5) : "–"}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-gray-300">
                    {h.best_ao5 !== null ? formatTime(h.best_ao5) : "–"}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-gray-300">
                    {h.current_ao12 !== null ? formatTime(h.current_ao12) : "–"}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-gray-300">
                    {h.best_ao12 !== null ? formatTime(h.best_ao12) : "–"}
                  </td>
                  <td className="py-3 pr-3 text-right text-sm text-gray-400">
                    {h.count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        ★ = Cube mit dem besten Single-PB. Click auf eine Spalten-Ueberschrift
        sortiert nach dieser Spalte (Click erneut = Richtung wechseln).
        „Ohne Hardware" enthaelt csTimer-Importe und Solves ohne explizite
        Hardware-Zuordnung.
      </p>
    </div>
  );
}

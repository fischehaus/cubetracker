// HardwareCompareCard: Hardware-Performance-Vergleich innerhalb eines
// Cube-Types (Phase 5d + Sortierung).
//
// Zeigt für den aktuellen Cube-Filter, mit welchem Cube der User die
// besten/schlechtesten Zeiten hatte. Spalten: Hardware | PB | Schnitt |
// aktueller ao5 | Best ao5 | aktueller ao12 | Best ao12 | Solves.
// Click auf Spalten-Header -> Sortierung wechseln (asc <-> desc).
// „Ohne Hardware" (csTimer-Importe ohne Hardware-Zuordnung) als eigene Zeile.
//
// Wenn kein Cube-Filter gesetzt: leere Card mit Hinweis. Hardware-Vergleich
// über alle Cubes hinweg wäre bedeutungslos (verschiedene Skalen).

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStatsByHardware, type HardwareCubeStats } from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { Card, CardTitle, EmptyState } from "./ui";

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
  labelKey: string;
  align: "left" | "right";
  /** Default-Sortier-Richtung beim ersten Klick auf diese Spalte */
  defaultDir: "asc" | "desc";
}

// Spalten-Definitionen: labelKey = i18n-Key, wird zur Render-Zeit aufgeloest.
const COLUMNS: ColumnDef[] = [
  { key: "hardware_name", labelKey: "charts.hwColHardware", align: "left", defaultDir: "asc" },
  { key: "best_ms", labelKey: "charts.hwColPb", align: "right", defaultDir: "asc" },
  { key: "mean_ms", labelKey: "charts.hwColMean", align: "right", defaultDir: "asc" },
  { key: "current_ao5", labelKey: "charts.hwColAo5", align: "right", defaultDir: "asc" },
  { key: "best_ao5", labelKey: "charts.hwColBestAo5", align: "right", defaultDir: "asc" },
  { key: "current_ao12", labelKey: "charts.hwColAo12", align: "right", defaultDir: "asc" },
  { key: "best_ao12", labelKey: "charts.hwColBestAo12", align: "right", defaultDir: "asc" },
  { key: "count", labelKey: "charts.hwColSolves", align: "right", defaultDir: "desc" },
];

/**
 * Vergleichs-Funktion für Sortierung. Behandelt Strings, Zahlen, null.
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
  const { t } = useTranslation();
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
      <Card>
        <CardTitle className="mb-2">{t("charts.hwTitle")}</CardTitle>
        <EmptyState title={t("charts.hwNoCubeFilter")} />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="text-base text-gray-400">
        {t("charts.hwLoading")}
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger" className="text-red-300 text-base">
        {t("charts.hwErrorPrefix", { message: error.message })}
      </Card>
    );
  }
  if (!data || data.hardware.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-2">
          {t("charts.hwTitleWithCube", { cube: cubeType })}
        </CardTitle>
        <EmptyState title={t("charts.hwEmpty")} />
      </Card>
    );
  }

  // Bester PB-Wert für optisches Highlight (★)
  const bestEver = data.hardware.find((h) => h.best_ms !== null)?.best_ms ?? null;
  const sortLabel = t(
    COLUMNS.find((c) => c.key === sortKey)?.labelKey ?? "charts.hwColPb",
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>
            {t("charts.hwTitle")}{" "}
            <span className="text-base text-gray-400">({cubeType})</span>
          </CardTitle>
          <InfoButton>
            <p className="font-medium mb-1">{t("charts.hwTitle")}</p>
            <p>{t("charts.hwInfoBody")}</p>
          </InfoButton>
        </div>
        <span className="text-sm text-gray-500">
          {t("charts.hwSortedBy", {
            label: sortLabel,
            dir: sortDir === "asc" ? "↑" : "↓",
          })}
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
                    title={t("charts.hwColSortTitle")}
                  >
                    {t(col.labelKey)}
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

      <p className="mt-3 text-xs text-gray-500">{t("charts.hwFooter")}</p>
    </Card>
  );
}

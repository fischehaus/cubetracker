// HardwareCompareCard: Hardware-Performance-Vergleich innerhalb eines
// Cube-Types (Phase 5d).
//
// Zeigt fuer den aktuellen Cube-Filter, mit welchem Cube der User die
// besten/schlechtesten Zeiten hatte. Sortiert nach Best-PB. „Ohne Hardware"
// (z.B. csTimer-Importe ohne Hardware-Zuordnung) als eigene Zeile.
//
// Wenn kein Cube-Filter gesetzt: leere Card mit Hinweis. Hardware-Vergleich
// ueber alle Cubes hinweg waere bedeutungslos (verschiedene Skalen).

import { useStatsByHardware } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  cubeType: string;
  sessionId: number | null;
}

export function HardwareCompareCard({ cubeType, sessionId }: Props) {
  const { data, isLoading, error } = useStatsByHardware(cubeType, sessionId);

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

  // Bester PB-Wert fuer optisches Highlight
  const bestEver = data.hardware.find((h) => h.best_ms !== null)?.best_ms ?? null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-100">
          Hardware-Vergleich{" "}
          <span className="text-base text-gray-400">({cubeType})</span>
        </h2>
        <span className="text-sm text-gray-500">sortiert nach PB</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
              <th className="py-2 pr-3 font-medium">Hardware</th>
              <th className="py-2 pr-3 font-medium text-right">PB</th>
              <th className="py-2 pr-3 font-medium text-right">Schnitt</th>
              <th className="py-2 pr-3 font-medium text-right">aktueller ao5</th>
              <th className="py-2 pr-3 font-medium text-right">Best ao5</th>
              <th className="py-2 pr-3 font-medium text-right">Solves</th>
            </tr>
          </thead>
          <tbody>
            {data.hardware.map((h) => {
              const isPbCube = h.best_ms !== null && h.best_ms === bestEver;
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
        ★ = Cube mit dem besten Single-PB. „Ohne Hardware" enthaelt csTimer-
        Importe und Solves ohne explizite Hardware-Zuordnung.
      </p>
    </div>
  );
}

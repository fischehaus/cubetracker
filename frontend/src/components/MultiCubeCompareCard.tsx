// MultiCubeCompareCard: Antwort auf „in welchem Wuerfel bist du gerade
// am besten?" — vergleicht aktuellen ao5 pro Cube mit dem Mittel der
// letzten 100 Solves (Tagesform), nicht mit dem Lifetime-Mittel.
//
// Lifetime-Form-Faktor wird trotzdem als Fallback gezeigt (z.B. wenn
// noch keine 20 valid Solves fuer ein Cube existieren).
//
// Form-Faktor (recent oder lifetime):
//   < 0.95 → in guter Form (gruen ▼)
//   ~ 1.00 → durchschnittlich (grau •)
//   > 1.05 → schwaechere Form (rot ▲)
//
// Optional auf eine Session einschraenkbar via Prop.

import { useStatsByCube, type CubeStats } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  sessionId: number | null;
}

function formatFormFactor(f: number | null): {
  text: string;
  color: string;
  /** Pfeil oder Symbol */
  symbol: string;
} {
  if (f === null) return { text: "n/a", color: "text-gray-500", symbol: "" };
  const pct = (f - 1) * 100;
  if (pct < -5) {
    return {
      text: `${pct.toFixed(1)}%`,
      color: "text-emerald-300",
      symbol: "▼",
    };
  }
  if (pct > 5) {
    return {
      text: `+${pct.toFixed(1)}%`,
      color: "text-red-300",
      symbol: "▲",
    };
  }
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    color: "text-gray-400",
    symbol: "•",
  };
}

function CubeRow({ cube }: { cube: CubeStats }) {
  // Tagesform bevorzugen (vs letzte 100). Fallback auf Lifetime, wenn
  // weniger als 20 valid Solves vorhanden sind.
  const useRecent = cube.form_factor_recent !== null;
  const factor = useRecent ? cube.form_factor_recent : cube.form_factor;
  const form = formatFormFactor(factor);
  const tooltip = useRecent
    ? "Aktueller ao5 vs. Mittel der letzten 100 Solves (Tagesform)"
    : "Aktueller ao5 vs. Lifetime-Schnitt — Tagesform-Vergleich braucht ≥20 valide Solves";
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-800/60 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-100 font-medium">{cube.cube_type}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          ao5 {cube.current_ao5 != null ? formatTime(cube.current_ao5) : "–"} ·{" "}
          Schnitt {cube.mean_ms != null ? formatTime(cube.mean_ms) : "–"} ·{" "}
          PB {cube.best_ms != null ? formatTime(cube.best_ms) : "–"}
        </div>
      </div>
      <div className={`text-right ${form.color} shrink-0`} title={tooltip}>
        <div className="text-sm font-mono font-semibold">
          {form.symbol} {form.text}
          {!useRecent && factor !== null && (
            <span className="ml-1 text-[9px] text-gray-500 align-top">life</span>
          )}
        </div>
        <div className="text-[10px] text-gray-500">{cube.count_valid} Solves</div>
      </div>
    </div>
  );
}

export function MultiCubeCompareCard({ sessionId }: Props) {
  const { data, isLoading, error } = useStatsByCube(sessionId);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400">
        Cube-Vergleich wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-5 text-red-300">
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!data || data.cubes.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Cube-Vergleich</h2>
        <p className="text-sm text-gray-500">
          Noch keine ausreichenden Daten (mind. 5 Solves pro Cube).
        </p>
      </div>
    );
  }

  // Cube mit bester Tagesform hervorheben (nur recent zaehlt fuer den Banner —
  // Lifetime ist zu sehr durch Lernkurve verzerrt fuer ein „heute am besten"-Statement)
  const withRecent = data.cubes.filter((c) => c.form_factor_recent !== null);
  const bestCube = withRecent.length > 0 ? withRecent[0] : null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-100">Cube-Vergleich</h2>
        <span className="text-xs text-gray-500">aktuelle Form</span>
      </div>

      {bestCube && bestCube.form_factor_recent !== null && (
        <div className="mb-3 rounded bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
          <div className="text-xs text-emerald-200/80">
            Aktuell deine beste Tagesform:
          </div>
          <div className="text-sm text-emerald-100 mt-0.5">
            <span className="font-semibold">{bestCube.cube_type}</span>
            <span className="text-emerald-300 ml-2 font-mono">
              {((bestCube.form_factor_recent - 1) * 100).toFixed(1)}% vs.
              letzte 100
            </span>
          </div>
        </div>
      )}

      <div>
        {data.cubes.map((c) => (
          <CubeRow key={c.cube_type} cube={c} />
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-500 leading-snug">
        ▼ aktuell besser · ▲ schlechter — verglichen mit dem Mittel der
        letzten 100 Solves (Tagesform). „life" = Fallback auf
        Lifetime-Schnitt bei &lt;20 Solves.
      </p>
    </div>
  );
}

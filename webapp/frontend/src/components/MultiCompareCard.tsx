// MultiCompareCard: kombinierte Vergleichs-Card fuer Dashboard (Phase 6).
//
// Toggle oben: [Cube-Vergleich] [Session-Vergleich]
//   - cube  → /stats/by-cube,    sortiert nach Tagesform
//   - session → /stats/by-session, sortiert nach Tagesform
//
// Drilldown: Klick auf eine Cube-Zeile → expandiert Inline-Block mit
//   /stats/by-hardware fuer diesen Cube. Zeigt mit welchem cube-modell
//   der user die besten zeiten hatte.
// Klick auf eine Session-Zeile → analoger drilldown mit den top-cubes
//   in dieser session (wir nutzen by-cube?session_id=X dafuer).

import { useState } from "react";
import {
  useStatsByCube,
  useStatsByHardware,
  useStatsBySession,
} from "../lib/api";
import { formatTime } from "../lib/format";

type CompareMode = "cube" | "session";

interface Props {
  /** Wenn gesetzt: alle queries werden auf diese session beschraenkt */
  sessionId: number | null;
}

export function MultiCompareCard({ sessionId }: Props) {
  const [mode, setMode] = useState<CompareMode>("cube");
  // Welcher Eintrag ist aktuell expanded? Null = keiner.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Wenn der User den Mode wechselt, schliessen wir den Drilldown
  // (sonst expandierte Daten passen nicht zum neuen Mode)
  function changeMode(m: CompareMode) {
    setMode(m);
    setExpandedKey(null);
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-100">Vergleich</h2>
        <div className="flex rounded border border-gray-700 overflow-hidden">
          <button
            onClick={() => changeMode("cube")}
            className={`text-sm px-4 py-2 ${
              mode === "cube"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            Cube-Vergleich
          </button>
          <button
            onClick={() => changeMode("session")}
            className={`text-sm px-4 py-2 ${
              mode === "session"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            Session-Vergleich
          </button>
        </div>
      </div>

      {mode === "cube" ? (
        <CubeCompareBody
          sessionId={sessionId}
          expandedKey={expandedKey}
          onToggleExpand={(k) =>
            setExpandedKey((cur) => (cur === k ? null : k))
          }
        />
      ) : (
        <SessionCompareBody
          expandedKey={expandedKey}
          onToggleExpand={(k) =>
            setExpandedKey((cur) => (cur === k ? null : k))
          }
        />
      )}

      <p className="mt-4 text-xs text-gray-500 leading-snug">
        Click auf eine Zeile → Drilldown. ▼ = aktuell besser als
        Mittel der letzten 100 Solves, ▲ = schlechter.
      </p>
    </div>
  );
}

// ============================================================
// Cube-Compare-Body (analog zum alten MultiCubeCompareCard)
// ============================================================

function CubeCompareBody({
  sessionId,
  expandedKey,
  onToggleExpand,
}: {
  sessionId: number | null;
  expandedKey: string | null;
  onToggleExpand: (key: string) => void;
}) {
  const { data, isLoading, error } = useStatsByCube(sessionId);

  if (isLoading) return <BodyMessage text="Cube-Vergleich wird geladen …" />;
  if (error) return <BodyError text={error.message} />;
  if (!data || data.cubes.length === 0)
    return <BodyMessage text="Noch keine ausreichenden Daten (mind. 5 Solves pro Cube)." />;

  const withRecent = data.cubes.filter((c) => c.form_factor_recent !== null);
  const bestCube = withRecent.length > 0 ? withRecent[0] : null;

  return (
    <>
      {bestCube && bestCube.form_factor_recent !== null && (
        <BestBanner
          label="Aktuell deine beste Tagesform:"
          name={bestCube.cube_type}
          pctVsRecent={bestCube.form_factor_recent}
        />
      )}
      <div>
        {data.cubes.map((c) => {
          const key = `cube:${c.cube_type}`;
          const isExpanded = expandedKey === key;
          return (
            <div key={c.cube_type}>
              <CompareRow
                title={c.cube_type}
                subtitle={`ao5 ${fmt(c.current_ao5)} · Schnitt ${fmt(c.mean_ms)} · PB ${fmt(c.best_ms)}`}
                rightTop={formatFactorText(
                  c.form_factor_recent ?? c.form_factor,
                  c.form_factor_recent === null
                )}
                rightBottom={`${c.count_valid} Solves`}
                expanded={isExpanded}
                onClick={() => onToggleExpand(key)}
              />
              {isExpanded && (
                <CubeHardwareDrilldown
                  cubeType={c.cube_type}
                  sessionId={sessionId}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ============================================================
// Session-Compare-Body
// ============================================================

function SessionCompareBody({
  expandedKey,
  onToggleExpand,
}: {
  expandedKey: string | null;
  onToggleExpand: (key: string) => void;
}) {
  const { data, isLoading, error } = useStatsBySession(undefined);

  if (isLoading) return <BodyMessage text="Session-Vergleich wird geladen …" />;
  if (error) return <BodyError text={error.message} />;
  if (!data || data.sessions.length === 0)
    return (
      <BodyMessage text="Noch keine Sessions mit ausreichend Solves (mind. 5)." />
    );

  const withRecent = data.sessions.filter((s) => s.form_factor_recent !== null);
  const bestSession = withRecent.length > 0 ? withRecent[0] : null;

  return (
    <>
      {bestSession && bestSession.form_factor_recent !== null && (
        <BestBanner
          label="Aktuell deine beste Session-Form:"
          name={bestSession.session_name}
          pctVsRecent={bestSession.form_factor_recent}
        />
      )}
      <div>
        {data.sessions.map((s) => {
          const key = `session:${s.session_id}`;
          const isExpanded = expandedKey === key;
          return (
            <div key={s.session_id}>
              <CompareRow
                title={s.session_name}
                subtitle={`ao5 ${fmt(s.current_ao5)} · Schnitt ${fmt(s.mean_ms)} · PB ${fmt(s.best_ms)}`}
                rightTop={formatFactorText(
                  s.form_factor_recent ?? s.form_factor,
                  s.form_factor_recent === null
                )}
                rightBottom={`${s.count_valid} Solves`}
                expanded={isExpanded}
                onClick={() => onToggleExpand(key)}
              />
              {isExpanded && <SessionCubeDrilldown sessionId={s.session_id} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ============================================================
// Drilldowns
// ============================================================

function CubeHardwareDrilldown({
  cubeType,
  sessionId,
}: {
  cubeType: string;
  sessionId: number | null;
}) {
  const { data, isLoading } = useStatsByHardware(cubeType, sessionId);
  if (isLoading || !data) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        Hardware-Vergleich wird geladen …
      </div>
    );
  }
  if (data.hardware.length === 0) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        Keine Hardware-Daten fuer {cubeType}.
      </div>
    );
  }
  const bestEver =
    data.hardware.find((h) => h.best_ms !== null)?.best_ms ?? null;
  return (
    <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded">
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
        Hardware-Vergleich ({cubeType})
      </div>
      <table className="w-full text-sm">
        <tbody>
          {data.hardware.map((h) => {
            const isPb = h.best_ms !== null && h.best_ms === bestEver;
            return (
              <tr
                key={h.hardware_id ?? "none"}
                className="border-b border-gray-800 last:border-0"
              >
                <td className="py-1.5">
                  <span
                    className={
                      h.hardware_id === null
                        ? "text-gray-500 italic"
                        : isPb
                        ? "text-yellow-300 font-semibold"
                        : "text-gray-200"
                    }
                  >
                    {isPb && "★ "}
                    {h.hardware_name}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono text-gray-300">
                  PB {fmt(h.best_ms)}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-400">
                  ⌀ {fmt(h.mean_ms)}
                </td>
                <td className="py-1.5 text-right text-xs text-gray-500">
                  {h.count}×
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SessionCubeDrilldown({ sessionId }: { sessionId: number }) {
  const { data, isLoading } = useStatsByCube(sessionId);
  if (isLoading || !data) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        Cubes dieser Session werden geladen …
      </div>
    );
  }
  if (data.cubes.length === 0) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        Keine Cube-Daten in dieser Session.
      </div>
    );
  }
  return (
    <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded">
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
        Cubes in dieser Session
      </div>
      <table className="w-full text-sm">
        <tbody>
          {data.cubes.map((c) => (
            <tr
              key={c.cube_type}
              className="border-b border-gray-800 last:border-0"
            >
              <td className="py-1.5 text-gray-200 font-medium">{c.cube_type}</td>
              <td className="py-1.5 text-right font-mono text-gray-300">
                PB {fmt(c.best_ms)}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-400">
                ⌀ {fmt(c.mean_ms)}
              </td>
              <td className="py-1.5 text-right text-xs text-gray-500">
                {c.count_valid}×
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function fmt(ms: number | null): string {
  return ms !== null ? formatTime(ms) : "–";
}

function formatFactorText(
  factor: number | null,
  isLifetime: boolean
): { text: string; color: string; symbol: string; suffix: string } {
  if (factor === null)
    return { text: "n/a", color: "text-gray-500", symbol: "", suffix: "" };
  const pct = (factor - 1) * 100;
  const suffix = isLifetime ? "life" : "";
  if (Math.abs(pct) < 1)
    return {
      text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
      color: "text-gray-500",
      symbol: "•",
      suffix,
    };
  if (pct < 0)
    return {
      text: `${pct.toFixed(1)}%`,
      color: "text-emerald-400",
      symbol: "▼",
      suffix,
    };
  return {
    text: `+${pct.toFixed(1)}%`,
    color: "text-red-400",
    symbol: "▲",
    suffix,
  };
}

interface CompareRowProps {
  title: string;
  subtitle: string;
  rightTop: ReturnType<typeof formatFactorText>;
  rightBottom: string;
  expanded: boolean;
  onClick: () => void;
}
function CompareRow({
  title,
  subtitle,
  rightTop,
  rightBottom,
  expanded,
  onClick,
}: CompareRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 border-b border-gray-800/60 last:border-0 cursor-pointer hover:bg-gray-800/30 transition rounded px-2 -mx-2 ${
        expanded ? "bg-gray-800/40" : ""
      }`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="text-base text-gray-100 font-medium">
          {expanded ? "▾ " : "▸ "}
          {title}
        </div>
        <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
      </div>
      <div className={`text-right ${rightTop.color} shrink-0`}>
        <div className="text-base font-mono font-semibold">
          {rightTop.symbol} {rightTop.text}
          {rightTop.suffix && (
            <span className="ml-1 text-[10px] text-gray-500 align-top">
              {rightTop.suffix}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">{rightBottom}</div>
      </div>
    </div>
  );
}

function BestBanner({
  label,
  name,
  pctVsRecent,
}: {
  label: string;
  name: string;
  pctVsRecent: number;
}) {
  return (
    <div className="mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
      <div className="text-sm text-emerald-200/80">{label}</div>
      <div className="text-lg text-emerald-100 mt-1">
        <span className="font-semibold">{name}</span>
        <span className="text-emerald-300 ml-3 font-mono">
          {((pctVsRecent - 1) * 100).toFixed(1)}% vs. letzte 100
        </span>
      </div>
    </div>
  );
}

function BodyMessage({ text }: { text: string }) {
  return <p className="text-base text-gray-500">{text}</p>;
}
function BodyError({ text }: { text: string }) {
  return (
    <p className="rounded bg-red-500/10 border border-red-500/30 p-3 text-base text-red-300">
      Fehler: {text}
    </p>
  );
}

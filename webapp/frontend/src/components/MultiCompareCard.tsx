// MultiCompareCard: kombinierte Vergleichs-Card für Dashboard (Phase 6).
//
// Toggle oben: [Cube-Vergleich] [Session-Vergleich]
//   - cube  → /stats/by-cube,    sortiert nach Tagesform
//   - session → /stats/by-session, sortiert nach Tagesform
//
// Drilldown: Klick auf eine Cube-Zeile → expandiert Inline-Block mit
//   /stats/by-hardware für diesen Cube. Zeigt mit welchem cube-modell
//   der user die besten zeiten hatte.
// Klick auf eine Session-Zeile → analoger drilldown mit den top-cubes
//   in dieser session (wir nutzen by-cube?session_id=X dafür).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useStatsByCube,
  useStatsByHardware,
  useStatsBySession,
} from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";

type CompareMode = "cube" | "session";

interface Props {
  /** Wenn gesetzt: alle queries werden auf diese session beschraenkt */
  sessionId: number | null;
}

export function MultiCompareCard({ sessionId }: Props) {
  const { t } = useTranslation();
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
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("multiCompare.title")}
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("multiCompare.title")}</p>
            <p>{t("multiCompare.infoBody")}</p>
          </InfoButton>
        </div>
        <div className="flex rounded border border-gray-700 overflow-hidden">
          <button
            onClick={() => changeMode("cube")}
            className={`text-sm px-4 py-2 ${
              mode === "cube"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            {t("multiCompare.modeCube")}
          </button>
          <button
            onClick={() => changeMode("session")}
            className={`text-sm px-4 py-2 ${
              mode === "session"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            {t("multiCompare.modeSession")}
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
        {t("multiCompare.footerHint")}
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
  const { t } = useTranslation();
  const { data, isLoading, error } = useStatsByCube(sessionId);

  if (isLoading) return <BodyMessage text={t("multiCompare.loadingCube")} />;
  if (error) return <BodyError text={error.message} />;
  if (!data || data.cubes.length === 0)
    return <BodyMessage text={t("multiCompare.emptyCube")} />;

  const withRecent = data.cubes.filter((c) => c.form_factor_recent !== null);
  const bestCube = withRecent.length > 0 ? withRecent[0] : null;

  return (
    <>
      {bestCube && bestCube.form_factor_recent !== null && (
        <BestBanner
          label={t("multiCompare.bestTodayCube")}
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
                subtitle={t("multiCompare.subtitle", {
                  ao5: fmt(c.current_ao5),
                  mean: fmt(c.mean_ms),
                  pb: fmt(c.best_ms),
                })}
                rightTop={formatFactorText(
                  c.form_factor_recent ?? c.form_factor,
                  c.form_factor_recent === null,
                  t
                )}
                rightBottom={t("multiCompare.rowSolves", {
                  count: c.count_valid,
                })}
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
  const { t } = useTranslation();
  const { data, isLoading, error } = useStatsBySession(undefined);

  if (isLoading) return <BodyMessage text={t("multiCompare.loadingSession")} />;
  if (error) return <BodyError text={error.message} />;
  if (!data || data.sessions.length === 0)
    return <BodyMessage text={t("multiCompare.emptySession")} />;

  const withRecent = data.sessions.filter((s) => s.form_factor_recent !== null);
  const bestSession = withRecent.length > 0 ? withRecent[0] : null;

  return (
    <>
      {bestSession && bestSession.form_factor_recent !== null && (
        <BestBanner
          label={t("multiCompare.bestTodaySession")}
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
                subtitle={t("multiCompare.subtitle", {
                  ao5: fmt(s.current_ao5),
                  mean: fmt(s.mean_ms),
                  pb: fmt(s.best_ms),
                })}
                rightTop={formatFactorText(
                  s.form_factor_recent ?? s.form_factor,
                  s.form_factor_recent === null,
                  t
                )}
                rightBottom={t("multiCompare.rowSolves", {
                  count: s.count_valid,
                })}
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
  const { t } = useTranslation();
  const { data, isLoading } = useStatsByHardware(cubeType, sessionId);
  if (isLoading || !data) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        {t("multiCompare.loadingHardware")}
      </div>
    );
  }
  if (data.hardware.length === 0) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        {t("multiCompare.emptyHardware", { cube: cubeType })}
      </div>
    );
  }
  const bestEver =
    data.hardware.find((h) => h.best_ms !== null)?.best_ms ?? null;
  return (
    <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded">
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
        {t("multiCompare.drilldownHardware", { cube: cubeType })}
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
                  {t("multiCompare.rowPb", { time: fmt(h.best_ms) })}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-400">
                  {t("multiCompare.rowMean", { time: fmt(h.mean_ms) })}
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
  const { t } = useTranslation();
  const { data, isLoading } = useStatsByCube(sessionId);
  if (isLoading || !data) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        {t("multiCompare.loadingSessionCubes")}
      </div>
    );
  }
  if (data.cubes.length === 0) {
    return (
      <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded text-sm text-gray-500">
        {t("multiCompare.emptySessionCubes")}
      </div>
    );
  }
  return (
    <div className="ml-4 mt-1 mb-3 p-3 bg-gray-900/40 rounded">
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
        {t("multiCompare.drilldownSessionCubes")}
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
                {t("multiCompare.rowPb", { time: fmt(c.best_ms) })}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-400">
                {t("multiCompare.rowMean", { time: fmt(c.mean_ms) })}
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
  isLifetime: boolean,
  t: (key: string) => string,
): { text: string; color: string; symbol: string; suffix: string } {
  if (factor === null)
    return {
      text: t("multiCompare.factorNa"),
      color: "text-gray-500",
      symbol: "",
      suffix: "",
    };
  const pct = (factor - 1) * 100;
  const suffix = isLifetime ? t("multiCompare.factorLifeSuffix") : "";
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
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
      <div className="text-sm text-emerald-200/80">{label}</div>
      <div className="text-lg text-emerald-100 mt-1">
        <span className="font-semibold">{name}</span>
        <span className="text-emerald-300 ml-3 font-mono">
          {((pctVsRecent - 1) * 100).toFixed(1)}
          {t("multiCompare.vsLast100")}
        </span>
      </div>
    </div>
  );
}

function BodyMessage({ text }: { text: string }) {
  return <p className="text-base text-gray-500">{text}</p>;
}
function BodyError({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <p className="rounded bg-red-500/10 border border-red-500/30 p-3 text-base text-red-300">
      {t("multiCompare.errorPrefix", { text })}
    </p>
  );
}

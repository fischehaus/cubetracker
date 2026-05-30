// Stats-Card: zeigt Avg5/12/100, Best, Worst, Mean für die
// aktuell gefilterte Solve-Menge (cube_type + session_id).

import { useTranslation } from "react-i18next";
import { useStats } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { Card, CardTitle, EmptyState } from "./ui";

interface Props {
  cubeType?: string;
  sessionId: number | null;
}

interface StatRow {
  label: string;
  value: number | null;
  highlight?: boolean;
  /** Phase 8.4: optionaler ISO-Timestamp wann der Best-Avg erreicht wurde. */
  achievedAt?: string | null;
}

function Stat({ label, value, highlight, achievedAt }: StatRow) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex justify-between items-baseline border-b border-gray-800/60 py-2 ${
        highlight ? "border-purple-500/40" : ""
      }`}
    >
      <span className="text-base text-gray-400">
        {label}
        {achievedAt && value !== null && (
          <span className="ml-2 text-xs text-gray-500">
            {t("stats.achievedOn", {
              date: formatDate(achievedAt).split(" ")[0],
            })}
          </span>
        )}
      </span>
      <span
        className={`font-mono text-base ${
          value === null ? "text-gray-600" : "text-gray-100"
        } ${highlight ? "text-purple-300" : ""}`}
      >
        {value === null ? "–" : formatTime(value)}
      </span>
    </div>
  );
}

export function StatsCard({ cubeType, sessionId }: Props) {
  const { t } = useTranslation();
  const params: { cube_type?: string; session_id?: number } = {};
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;

  const { data, isLoading, error } = useStats(params);

  if (isLoading) {
    return (
      <Card>
        <p className="text-gray-400">{t("stats.loading")}</p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card tone="danger">
        <p className="text-red-300">
          {t("stats.errorPrefix", { message: error.message })}
        </p>
      </Card>
    );
  }
  if (!data || data.count === 0) {
    return (
      <Card>
        <CardTitle className="mb-2">{t("stats.title")}</CardTitle>
        <EmptyState icon="📊" title={t("stats.noSolves")} />
      </Card>
    );
  }

  const filterLabel =
    cubeType && sessionId !== null
      ? t("stats.filterCubeSession", { cube: cubeType })
      : cubeType
      ? cubeType
      : sessionId !== null
      ? t("stats.filterSession")
      : t("stats.filterAllSolves");

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>{t("stats.title")}</CardTitle>
          <InfoButton>
            <p className="font-medium mb-1">{t("stats.title")}</p>
            <p>{t("stats.infoText")}</p>
          </InfoButton>
        </div>
        <span className="text-sm text-gray-500">{filterLabel}</span>
      </div>

      {/* Counter — groß + bauchig */}
      <div className="grid grid-cols-3 gap-3 mb-5 text-center">
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">{data.count}</div>
          <div className="text-sm text-gray-500 mt-1">
            {t("stats.countSolves")}
          </div>
        </div>
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">
            {data.count_valid}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t("stats.countValid")}
          </div>
        </div>
        <div className="rounded bg-gray-800/50 py-3">
          <div className="text-3xl font-semibold text-gray-100">
            {data.count_dnf}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t("stats.countDnf")}
          </div>
        </div>
      </div>

      {/* Singles */}
      <div className="mb-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          {t("stats.sectionSingles")}
        </h3>
        <Stat label={t("stats.bestPb")} value={data.best_ms} highlight />
        <Stat label={t("stats.worst")} value={data.worst_ms} />
        <Stat label={t("stats.mean")} value={data.mean_ms} />
      </div>

      {/* Aktuelle Averages */}
      <div className="mb-5">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          {t("stats.sectionCurrentAverages")}
        </h3>
        <Stat label={t("stats.ao5Current")} value={data.current_ao5} />
        <Stat label={t("stats.ao12Current")} value={data.current_ao12} />
        <Stat label={t("stats.ao100Current")} value={data.current_ao100} />
      </div>

      {/* Beste Averages */}
      <div>
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          {t("stats.sectionBestAverages")}
        </h3>
        <Stat
          label={t("stats.bestAo5")}
          value={data.best_ao5}
          achievedAt={data.best_ao5_at}
          highlight
        />
        <Stat
          label={t("stats.bestAo12")}
          value={data.best_ao12}
          achievedAt={data.best_ao12_at}
          highlight
        />
        <Stat
          label={t("stats.bestAo100")}
          value={data.best_ao100}
          achievedAt={data.best_ao100_at}
          highlight
        />
      </div>
    </Card>
  );
}

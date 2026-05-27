// RecentRecordsCard (W.recent-pbs) — kompakte Liste der letzten ~5 PB-
// Ereignisse im Dashboard. Liest /stats/recent-pbs (ueber alle Cube-Types
// des Users). Pro Event: Kind-Badge + Cube + Zeit + Δ-Verbesserung + Alter.
//
// Klick auf einen Eintrag wechselt zum Analyse-Tab mit gesetztem Cube-Filter
// (zeigt dort den PB-Verlauf-Chart). Optionaler Handler vom Parent.

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  useRecentPbs,
  type RecentPbEvent,
  type RecentPbKind,
} from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";

interface Props {
  /** Klick auf einen Eintrag fuehrt zum Analyse-Tab mit gesetztem Cube-Filter. */
  onClickCube?: (cubeType: string) => void;
}

export function RecentRecordsCard({ onClickCube }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useRecentPbs(5);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-sm text-gray-400">
        {t("recentPbs.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-sm text-red-300">
        {t("recentPbs.errorPrefix", { message: error.message })}
      </div>
    );
  }
  if (!data || data.events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-xl font-semibold text-gray-100 mb-2 flex items-center gap-2">
          {t("recentPbs.title")}
        </h3>
        <p className="text-sm text-gray-400">{t("recentPbs.emptyText")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-semibold text-gray-100">
          {t("recentPbs.title")}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("recentPbs.infoTitle")}</p>
          <p>{t("recentPbs.infoBody")}</p>
        </InfoButton>
      </div>
      <ul className="space-y-2">
        {data.events.map((e) => (
          <RecentPbRow
            key={`${e.kind}-${e.cube_type}-${e.solve_id}`}
            event={e}
            onClick={onClickCube}
          />
        ))}
      </ul>
    </div>
  );
}

function RecentPbRow({
  event,
  onClick,
}: {
  event: RecentPbEvent;
  onClick?: (cubeType: string) => void;
}) {
  const { t } = useTranslation();
  // QA-Fix W.recent-pbs-qa: Backend liefert ISO mit `+00:00`-Suffix, aber
  // defensiv ein `Z` ergaenzen falls jemand mal naive ISO-Strings produziert
  // (Browser interpretiert die sonst als lokale Zeit -> Offset-Drift).
  const atIso = event.at
    ? /[Z+]|[-]\d{2}:?\d{2}$/.test(event.at)
      ? event.at
      : event.at + "Z"
    : null;
  const daysAgo = atIso
    ? Math.floor((Date.now() - new Date(atIso).getTime()) / 86_400_000)
    : null;
  const ageLabel =
    daysAgo === null
      ? t("recentPbs.ageMissing")
      : daysAgo <= 0
        ? t("recentPbs.ageToday")
        : daysAgo === 1
          ? t("recentPbs.ageYesterday")
          : t("recentPbs.ageDaysAgo", { days: daysAgo });
  const deltaLabel =
    event.delta_ms_vs_prev !== null && event.delta_ms_vs_prev > 0
      ? `−${formatTime(event.delta_ms_vs_prev)}`
      : null;

  const clickable = !!onClick;

  // QA-Fix W.recent-pbs-qa: Keyboard-Accessibility — tabIndex + Enter/Space
  // damit Tab-Navigation den Eintrag aktivieren kann.
  const handleKey = clickable
    ? (e: React.KeyboardEvent<HTMLLIElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick!(event.cube_type);
        }
      }
    : undefined;

  return (
    <li
      onClick={clickable ? () => onClick!(event.cube_type) : undefined}
      onKeyDown={handleKey}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`flex items-center justify-between gap-3 rounded border border-gray-700/60 bg-gray-800/40 px-3 py-2 ${
        clickable
          ? "cursor-pointer hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          : ""
      }`}
      title={clickable ? t("recentPbs.clickHint") : undefined}
    >
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <KindBadge kind={event.kind} />
        <span className="text-sm text-gray-400">{event.cube_type}</span>
        <span className="font-mono text-base text-gray-100">
          {formatTime(event.ms)}
        </span>
        {deltaLabel && (
          <span
            className="text-xs text-emerald-300 font-medium"
            title={t("recentPbs.deltaTitle")}
          >
            {deltaLabel}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {ageLabel}
      </span>
    </li>
  );
}

function KindBadge({ kind }: { kind: RecentPbKind }) {
  const { t } = useTranslation();
  if (kind === "single") {
    return (
      <span
        className="text-yellow-300 font-bold text-sm flex-shrink-0"
        title={t("recentPbs.kindSingleTitle")}
      >
        {t("recentPbs.kindSingleBadge")}
      </span>
    );
  }
  if (kind === "ao5") {
    return (
      <span
        className="text-cyan-300 font-medium text-sm flex-shrink-0"
        title={t("recentPbs.kindAo5Title")}
      >
        {t("recentPbs.kindAo5Badge")}
      </span>
    );
  }
  return (
    <span
      className="text-emerald-300 font-medium text-sm flex-shrink-0"
      title={t("recentPbs.kindAo12Title")}
    >
      {t("recentPbs.kindAo12Badge")}
    </span>
  );
}

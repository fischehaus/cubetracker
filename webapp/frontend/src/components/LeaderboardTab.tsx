// LeaderboardTab (Phase W.10) — Vergleichs-Bestenliste mit Freunden.
//
// Aufbau:
//   - Cube-Type-Picker (oben)
//   - Tabelle: Display-Name, Best-Single, Best-AO5, Best-AO12, Current-AO5,
//     Solves 30d, Last Active
//   - Self ist optisch hervorgehoben + immer oben
//   - Freunde ohne Solves für den Cube zeigen "—" + landen unten
//
// Empty-State: wenn keine Friends accepted -> Hinweis-Card mit Link zum
// Friends-Tab.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { COMMON_CUBE_TYPES, formatTime, getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";
import {
  useFriendsList,
  useLeaderboard,
  useLeaderboardCubeTypes,
  type LeaderboardEntry,
} from "../lib/api";

// Default-Reihe falls weder User noch Friends bisher Solves haben —
// QA-Fix M3: sonst wäre der Picker komplett unsichtbar und ein hartcodiertes
// "3x3" würde geladen ohne Auswahlmoeglichkeit. Wir nutzen die gleichen
// COMMON_CUBE_TYPES wie im BigTimerInput-Selector.
const FALLBACK_CUBES = COMMON_CUBE_TYPES;

function fmt(ms: number | null): string {
  return ms === null ? "—" : formatTime(ms);
}

function fmtRelative(
  iso: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 1000 / 86400);
    if (days === 0) return t("leaderboard.relativeToday");
    if (days === 1) return t("leaderboard.relativeYesterday");
    if (days < 7) return t("leaderboard.relativeDays", { n: days });
    if (days < 30)
      return t("leaderboard.relativeWeeks", { n: Math.floor(days / 7) });
    if (days < 365)
      return t("leaderboard.relativeMonths", { n: Math.floor(days / 30) });
    return t("leaderboard.relativeYears", { n: Math.floor(days / 365) });
  } catch {
    return iso;
  }
}

export function LeaderboardTab() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: friendsData } = useFriendsList(isAuthenticated);
  // QA-Fix L6: friendsCount nur dann betrachten wenn die Liste schon geladen
  // ist — sonst blitzt der "Noch keine Freunde"-Hinweis 1 Frame auf
  // bevor die echte Liste da ist.
  const friendsLoaded = friendsData !== undefined;
  const friendsCount = friendsData?.friends.length ?? 0;

  const { data: cubeTypesData } = useLeaderboardCubeTypes(isAuthenticated);
  const [cubeType, setCubeType] = useState<string | null>(null);

  // Effektive Picker-Liste: wenn Backend Cube-Types zurueckliefert die nutzen,
  // sonst FALLBACK_CUBES — damit der Picker IMMER da ist und sinnvolle Auswahl
  // bietet, auch wenn ich + Friends noch keine Solves haben (QA-Fix M3).
  const pickerCubes = useMemo(() => {
    const backend = cubeTypesData?.cube_types ?? [];
    if (backend.length > 0) return backend;
    return FALLBACK_CUBES;
  }, [cubeTypesData]);

  // Beim ersten Render: erstem Cube-Type aus Picker-Liste setzen
  useEffect(() => {
    if (!cubeType && pickerCubes.length > 0) {
      setCubeType(pickerCubes[0]);
    }
  }, [pickerCubes, cubeType]);

  const { data, isLoading, error } = useLeaderboard(cubeType);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-4 max-w-5xl">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("leaderboard.title")}{" "}
            <span className="text-sm text-gray-500">
              {t("leaderboard.countSummary", { count: friendsCount })}
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("leaderboard.title")}</p>
            <p>{t("leaderboard.infoBody")}</p>
          </InfoButton>
        </div>
        <label className="flex items-baseline gap-2 text-sm text-gray-400">
          {t("leaderboard.cubeTypeLabel")}
          <select
            value={cubeType ?? ""}
            onChange={(e) => setCubeType(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            {pickerCubes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </header>

      {friendsLoaded && friendsCount === 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-100">
          <p className="font-medium">{t("leaderboard.noFriendsTitle")}</p>
          <p className="mt-1 text-blue-200/80">
            {t("leaderboard.noFriendsBodyPrefix")}{" "}
            <strong>{t("leaderboard.noFriendsBodyTab")}</strong>
            {t("leaderboard.noFriendsBodySuffix")}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {t("leaderboard.errorPrefix")}
          {error instanceof Error ? error.message : t("leaderboard.errorUnknown")}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
          <p className="text-gray-400">{t("leaderboard.loading")}</p>
        </div>
      )}

      {data && (
        <LeaderboardTable rows={data.rows} cubeType={data.cube_type} />
      )}

      <p className="text-xs text-gray-500">{t("leaderboard.footer")}</p>
    </div>
  );
}

// ============================================================
// Tabelle
// ============================================================

function LeaderboardTable({
  rows,
  cubeType,
}: {
  rows: LeaderboardEntry[];
  cubeType: string;
}) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-center text-sm text-gray-400">
        {t("leaderboard.tableEmpty", { cube: cubeType })}
      </div>
    );
  }

  return (
    // Mobile-First: p-2 statt p-4 (mehr Platz). KEIN min-w — auf Phone
    // sind durch `hidden md:table-cell` nur 4 Spalten sichtbar, die
    // passen via w-full in jeden Screen. overflow-x-auto bleibt als
    // Fallback (z.B. extrem langer Display-Name).
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-2 sm:p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {/* Mobile-First: auf <md nur Rang/User/Best Single/Best AO5 —
              die weniger wichtigen Spalten ab md sichtbar. */}
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-700">
            <th className="py-2 pr-3">{t("leaderboard.colRang")}</th>
            <th className="py-2 pr-3">{t("leaderboard.colUser")}</th>
            <th className="py-2 pr-3">{t("leaderboard.colBestSingle")}</th>
            <th className="py-2 pr-3">{t("leaderboard.colBestAo5")}</th>
            <th className="py-2 pr-3 hidden md:table-cell">
              {t("leaderboard.colBestAo12")}
            </th>
            <th className="py-2 pr-3 hidden md:table-cell">
              {t("leaderboard.colCurrentAo5")}
            </th>
            <th className="py-2 pr-3 hidden md:table-cell">
              {t("leaderboard.colSolves30d")}
            </th>
            <th className="py-2 pr-3 hidden md:table-cell">
              {t("leaderboard.colLastActive")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <LeaderboardRow key={r.user_id} row={r} rank={idx + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardRow({
  row,
  rank,
}: {
  row: LeaderboardEntry;
  rank: number;
}) {
  const { t, i18n } = useTranslation();
  const numberLocale = getIntlLocale(i18n.resolvedLanguage);
  // Self optisch hervorheben
  const rowClass = row.is_me
    ? "border-b border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
    : "border-b border-gray-800 hover:bg-gray-800/30";
  const nameClass = row.is_me ? "font-semibold text-purple-200" : "text-gray-200";

  // Top-3-Medaillen — nur Best-Single-Rang, nur wenn jemand wirklich Zeit hat
  // (rank ist nach Sortierung incl. Self; für Show: 🥇🥈🥉 nur für Friends-
  // Tier, Self bekommt eigenen Marker)
  let rankBadge: string;
  if (row.is_me) {
    rankBadge = "👤";
  } else if (row.best_ms === null) {
    rankBadge = "—";
  } else if (rank === 2) {
    // 2 weil self oben ist, also "1." der Friends = rank 2 in Tabelle
    rankBadge = "🥇";
  } else if (rank === 3) {
    rankBadge = "🥈";
  } else if (rank === 4) {
    rankBadge = "🥉";
  } else {
    rankBadge = `${rank - 1}.`;
  }

  return (
    <tr className={rowClass}>
      <td className="py-2 pr-3 text-center">{rankBadge}</td>
      <td className={`py-2 pr-3 ${nameClass}`}>
        <span className="block max-w-[160px] truncate" title={row.display_name}>
          {row.display_name}
          {row.is_me && (
            <span className="ml-2 text-[10px] uppercase text-purple-400">
              {t("leaderboard.selfBadge")}
            </span>
          )}
        </span>
      </td>
      <td className="py-2 pr-3 font-mono">{fmt(row.best_ms)}</td>
      <td className="py-2 pr-3 font-mono text-gray-300">{fmt(row.best_ao5)}</td>
      <td className="py-2 pr-3 font-mono text-gray-300 hidden md:table-cell">
        {fmt(row.best_ao12)}
      </td>
      <td className="py-2 pr-3 font-mono text-gray-400 hidden md:table-cell">
        {fmt(row.current_ao5)}
      </td>
      <td className="py-2 pr-3 text-gray-400 hidden md:table-cell">
        {row.solve_count_30d.toLocaleString(numberLocale)}
        <span className="text-xs text-gray-600">
          {" / "}
          {row.solve_count_total.toLocaleString(numberLocale)}
        </span>
      </td>
      <td
        className="py-2 pr-3 text-gray-500 hidden md:table-cell"
        title={row.last_solve_at ?? ""}
      >
        {fmtRelative(row.last_solve_at, t)}
      </td>
    </tr>
  );
}

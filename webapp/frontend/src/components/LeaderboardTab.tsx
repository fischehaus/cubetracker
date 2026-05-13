// LeaderboardTab (Phase W.10) — Vergleichs-Bestenliste mit Freunden.
//
// Aufbau:
//   - Cube-Type-Picker (oben)
//   - Tabelle: Display-Name, Best-Single, Best-AO5, Best-AO12, Current-AO5,
//     Solves 30d, Last Active
//   - Self ist optisch hervorgehoben + immer oben
//   - Freunde ohne Solves fuer den Cube zeigen "—" + landen unten
//
// Empty-State: wenn keine Friends accepted -> Hinweis-Card mit Link zum
// Friends-Tab.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { COMMON_CUBE_TYPES, formatTime } from "../lib/format";
import {
  useFriendsList,
  useLeaderboard,
  useLeaderboardCubeTypes,
  type LeaderboardEntry,
} from "../lib/api";

// Default-Reihe falls weder User noch Friends bisher Solves haben —
// QA-Fix M3: sonst waere der Picker komplett unsichtbar und ein hartcodiertes
// "3x3" wuerde geladen ohne Auswahlmoeglichkeit. Wir nutzen die gleichen
// COMMON_CUBE_TYPES wie im BigTimerInput-Selector.
const FALLBACK_CUBES = COMMON_CUBE_TYPES;

function fmt(ms: number | null): string {
  return ms === null ? "—" : formatTime(ms);
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 1000 / 86400);
    if (days === 0) return "heute";
    if (days === 1) return "gestern";
    if (days < 7) return `vor ${days}d`;
    if (days < 30) return `vor ${Math.floor(days / 7)}w`;
    if (days < 365) return `vor ${Math.floor(days / 30)}mo`;
    return `vor ${Math.floor(days / 365)}y`;
  } catch {
    return iso;
  }
}

export function LeaderboardTab() {
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
        <h2 className="text-2xl font-semibold text-gray-100">
          Bestenliste{" "}
          <span className="text-sm text-gray-500">
            (du + deine {friendsCount} Freunde)
          </span>
        </h2>
        <label className="flex items-baseline gap-2 text-sm text-gray-400">
          Cube-Type
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
          <p className="font-medium">Noch keine Freunde gefunden.</p>
          <p className="mt-1 text-blue-200/80">
            Geh in den Tab <strong>🤝 Freunde</strong>, such jemanden per
            Display-Name oder Email und schick eine Anfrage. Sobald die
            angenommen ist, taucht der hier auf.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Fehler:{" "}
          {error instanceof Error ? error.message : "Unbekannt"}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
          <p className="text-gray-400">Lade Bestenliste …</p>
        </div>
      )}

      {data && (
        <LeaderboardTable rows={data.rows} cubeType={data.cube_type} />
      )}

      <p className="text-xs text-gray-500">
        Best-Times werden mit WCA-Konvention berechnet: +2 zaehlt als
        Zeit+2.0s, DNF zaehlt als „unendlich" / wird beim Average getrimmt.
        AO5 = trimmed mean of 5 Solves (best+worst raus, Mittel von 3).
      </p>
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
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-center text-sm text-gray-400">
        Niemand hat bisher {cubeType}-Solves. Sei der Erste!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-700">
            <th className="py-2 pr-3">Rang</th>
            <th className="py-2 pr-3">User</th>
            <th className="py-2 pr-3">Best Single</th>
            <th className="py-2 pr-3">Best AO5</th>
            <th className="py-2 pr-3">Best AO12</th>
            <th className="py-2 pr-3">Akt. AO5</th>
            <th className="py-2 pr-3">Solves (30d)</th>
            <th className="py-2 pr-3">Zuletzt</th>
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
  // Self optisch hervorheben
  const rowClass = row.is_me
    ? "border-b border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
    : "border-b border-gray-800 hover:bg-gray-800/30";
  const nameClass = row.is_me ? "font-semibold text-purple-200" : "text-gray-200";

  // Top-3-Medaillen — nur Best-Single-Rang, nur wenn jemand wirklich Zeit hat
  // (rank ist nach Sortierung incl. Self; fuer Show: 🥇🥈🥉 nur fuer Friends-
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
        {row.display_name}
        {row.is_me && (
          <span className="ml-2 text-[10px] uppercase text-purple-400">
            du
          </span>
        )}
      </td>
      <td className="py-2 pr-3 font-mono">{fmt(row.best_ms)}</td>
      <td className="py-2 pr-3 font-mono text-gray-300">{fmt(row.best_ao5)}</td>
      <td className="py-2 pr-3 font-mono text-gray-300">{fmt(row.best_ao12)}</td>
      <td className="py-2 pr-3 font-mono text-gray-400">
        {fmt(row.current_ao5)}
      </td>
      <td className="py-2 pr-3 text-gray-400">
        {row.solve_count_30d.toLocaleString("de-DE")}
        <span className="text-xs text-gray-600">
          {" / "}
          {row.solve_count_total.toLocaleString("de-DE")}
        </span>
      </td>
      <td className="py-2 pr-3 text-gray-500" title={row.last_solve_at ?? ""}>
        {fmtRelative(row.last_solve_at)}
      </td>
    </tr>
  );
}

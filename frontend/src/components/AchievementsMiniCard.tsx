// AchievementsMiniCard: kompakte Dashboard-Variante (A.3).
//
// Zeigt:
//  - Anzahl freigeschalteter / total
//  - die 3 zuletzt freigeschalteten Erfolge (icon + name)
//  - Link „Alle Erfolge ansehen" → wechselt zum Trainer-Tab
//
// Bewusst klein gehalten — fuer das Dashboard-Top-Row.

import { useMemo } from "react";
import { useAchievements } from "../lib/api";
import type { AppTab } from "./TabBar";

interface Props {
  onSwitchTab: (tab: AppTab) => void;
}

export function AchievementsMiniCard({ onSwitchTab }: Props) {
  const { data, isLoading } = useAchievements();

  const summary = useMemo(() => {
    if (!data) return null;
    const unlocked = data.filter((a) => a.unlocked_at !== null);
    // sortiert nach unlocked_at desc, top 3
    const recent = [...unlocked]
      .sort((a, b) =>
        (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? "")
      )
      .slice(0, 3);
    return {
      unlocked: unlocked.length,
      total: data.length,
      recent,
    };
  }, [data]);

  if (isLoading || !summary) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-base text-gray-500">
        Erfolge werden geladen …
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-200">Erfolge</h3>
        <span className="text-sm text-gray-500">
          {summary.unlocked} / {summary.total}
        </span>
      </div>

      {summary.recent.length === 0 ? (
        <p className="text-sm text-gray-500">
          Noch keine Erfolge freigeschaltet. Trainiere weiter!
        </p>
      ) : (
        <ul className="space-y-1.5">
          {summary.recent.map((a) => (
            <li key={a.code} className="flex items-center gap-2 text-sm">
              <span className="text-base shrink-0">{a.icon}</span>
              <span className="text-yellow-100 truncate">{a.name}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onSwitchTab("trainer")}
        className="mt-3 text-sm text-purple-400 hover:text-purple-300"
      >
        Alle Erfolge ansehen →
      </button>
    </div>
  );
}

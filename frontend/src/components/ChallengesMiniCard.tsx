// ChallengesMiniCard: Dashboard-Variante (Phase 7b).
//
// Zeigt heutige Challenges sehr kompakt — Icon + progress-Label
// + Mini-Bar je Eintrag. Klick fuehrt zum Trainer-Tab (Sub „Heute").

import { useMemo } from "react";
import { useChallengesToday } from "../lib/api";
import {
  CHALLENGE_ICONS,
  progressLabel,
  progressPercent,
} from "../lib/challenges";
import type { AppTab } from "./TabBar";

interface Props {
  onSwitchTab: (tab: AppTab) => void;
}

export function ChallengesMiniCard({ onSwitchTab }: Props) {
  const { data, isLoading } = useChallengesToday();

  const visible = useMemo(
    () => data?.challenges.filter((c) => !c.dismissed) ?? [],
    [data]
  );

  const completedCount = useMemo(
    () => visible.filter((c) => c.completed_at !== null).length,
    [visible]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-base text-gray-500">
        Challenges werden geladen …
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-200">
          Tages-Challenges
        </h3>
        <span className="text-sm text-gray-500">
          {completedCount} / {visible.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">
          Noch keine Challenges fuer heute.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const isDone = c.completed_at !== null;
            const pct = progressPercent(c);
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="text-base shrink-0" aria-hidden="true">
                  {CHALLENGE_ICONS[c.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        isDone ? "bg-emerald-400" : "bg-purple-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`text-xs font-mono shrink-0 ${
                    isDone ? "text-emerald-300" : "text-gray-400"
                  }`}
                >
                  {progressLabel(c)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => onSwitchTab("trainer")}
        className="mt-3 text-sm text-purple-400 hover:text-purple-300"
      >
        Alle Challenges ansehen →
      </button>
    </div>
  );
}

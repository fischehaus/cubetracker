// AchievementsCard: Grid aller Achievements, gegraut wenn locked,
// hervorgehoben wenn unlocked. Gruppiert nach category.
//
// „Recheck"-Button triggert manuelles Re-Evaluieren (z.B. nach
// Bestandsdaten-Import oder wenn Definitionen sich geändert haben).

import { useMemo } from "react";
import { useAchievements, useRecheckAchievements } from "../lib/api";
import { formatDate } from "../lib/format";
import { InfoButton } from "./InfoButton";
import type { AchievementItem } from "../lib/types";

const CATEGORY_LABELS: Record<AchievementItem["category"], string> = {
  volume: "Volumen",
  speed: "Geschwindigkeit (3x3)",
  variety: "Vielseitigkeit",
  hardware: "Hardware",
  consistency: "Konsistenz & Streaks",
};

const CATEGORY_ORDER: AchievementItem["category"][] = [
  "volume",
  "speed",
  "variety",
  "hardware",
  "consistency",
];

export function AchievementsCard() {
  const { data, isLoading, error } = useAchievements();
  const recheck = useRecheckAchievements();

  const grouped = useMemo(() => {
    if (!data) return new Map<string, AchievementItem[]>();
    const m = new Map<AchievementItem["category"], AchievementItem[]>();
    for (const a of data) {
      const arr = m.get(a.category) ?? [];
      arr.push(a);
      m.set(a.category, arr);
    }
    return m;
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Erfolge werden geladen …
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
  if (!data) return null;

  const unlockedCount = data.filter((a) => a.unlocked_at !== null).length;
  const totalCount = data.length;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            Erfolge{" "}
            <span className="text-base text-gray-400">
              ({unlockedCount} von {totalCount} freigeschaltet)
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Erfolge / Achievements</p>
            <p>
              30+ Personal-Trainer-Ziele in Kategorien (Volume, Speed,
              Konsistenz, Streaks etc.). Werden automatisch geprueft nach
              jedem Solve. Verschlossene Erfolge zeigen Hint-Text — gibt
              dir nächstes Trainings-Ziel ohne zu spoilern. „Recheck"
              prueft nochmal alles durch (Backup nach großen Imports).
            </p>
          </InfoButton>
        </div>
        <button
          onClick={() => recheck.mutate()}
          disabled={recheck.isPending}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
          title="Manuell neu pruefen — z.B. nach Daten-Import"
        >
          {recheck.isPending ? "Pruefe …" : "🔄 Neu pruefen"}
        </button>
      </div>

      {recheck.data && recheck.data.newly_unlocked_count > 0 && (
        <div className="mb-4 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {recheck.data.newly_unlocked_count} neue Erfolge freigeschaltet 🎉
        </div>
      )}

      <div className="space-y-5">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const items = grouped.get(cat) ?? [];
          const unlocked = items.filter((a) => a.unlocked_at !== null).length;
          return (
            <div key={cat}>
              <h3 className="text-base font-semibold text-gray-300 mb-2">
                {CATEGORY_LABELS[cat]}{" "}
                <span className="text-sm text-gray-500 font-normal">
                  ({unlocked}/{items.length})
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a) => (
                  <AchievementTile key={a.code} item={a} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Erfolge sind monotonic: einmal freigeschaltet bleiben sie erhalten,
        auch wenn die Voraussetzung später nicht mehr erfüllt ist
        (z.B. nach Solve-Löschen).
      </p>
    </div>
  );
}

function AchievementTile({ item }: { item: AchievementItem }) {
  const isUnlocked = item.unlocked_at !== null;
  return (
    <div
      className={`rounded border p-3 transition ${
        isUnlocked
          ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-gray-700 bg-gray-900/40 opacity-60"
      }`}
      title={isUnlocked ? `Freigeschaltet: ${formatDate(item.unlocked_at!)}` : "Noch nicht freigeschaltet"}
    >
      <div className="flex items-start gap-2">
        <span
          className={`text-2xl shrink-0 ${
            isUnlocked ? "" : "grayscale opacity-50"
          }`}
        >
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`text-base font-semibold ${
              isUnlocked ? "text-yellow-100" : "text-gray-300"
            }`}
          >
            {item.name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
          {isUnlocked && (
            <div className="text-[10px] text-yellow-300/70 mt-1">
              ★ {formatDate(item.unlocked_at!).split(" ")[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// DailyChallengesPanel: Voll-Ansicht der heutigen Daily Challenges (Phase 7b).
//
// - Header mit Datum + "Neu generieren"-Button
// - Grid der nicht-dismissten Challenges (ChallengeCard)
// - Hint, wenn alle dismissed/erfüllt

import { useMemo } from "react";
import {
  useChallengesToday,
  useDismissChallenge,
  useRegenerateChallenges,
} from "../lib/api";
import { ChallengeCard } from "./ChallengeCard";
import { InfoButton } from "./InfoButton";

export function DailyChallengesPanel() {
  const { data, isLoading, error } = useChallengesToday();
  const regenerate = useRegenerateChallenges();
  const dismiss = useDismissChallenge();

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
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-base text-gray-400">
        Tages-Challenges werden geladen …
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

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            Tages-Challenges{" "}
            <span className="text-base text-gray-400">
              ({completedCount} / {visible.length} erfüllt)
            </span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Tages-Challenges</p>
            <p>
              Drei kleine tägliche Aufgaben. Werden um Mitternacht UTC
              neu generiert. Schwierigkeitsgrade variieren (z.B. „mache
              X Solves heute", „erreiche AO5 unter Y", „kein DNF in 10
              Solves"). Dismiss-Funktion für Challenges die du heute
              nicht angehen willst. Refresh-Button generiert neu (z.B.
              wenn du was unmoegliches bekommen hast).
            </p>
          </InfoButton>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
          title="Verwirft heutige Challenges und generiert frisch"
        >
          {regenerate.isPending ? "Generiere …" : "🔄 Neu generieren"}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-base text-gray-400">
          Keine aktiven Challenges für heute. Klicke „Neu generieren" um
          welche zu erstellen.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Challenges werden täglich neu generiert (basierend auf deinen Stats)
        und ihr Fortschritt zählt monoton hoch — auch wenn ein Solve später
        gelöscht wird, bleibt die Erfuellung erhalten.
      </p>
    </div>
  );
}

// ChallengeCompletionToaster (Phase 7b): globaler Layer der auf
// onChallengeCompleted hoert (kommt aus axios-response-interceptor)
// und Toasts unten rechts anzeigt — strukturell identisch zum
// AchievementToaster, nur in gruener Farbgebung und mit Challenge-Lookup.

import { useEffect, useState } from "react";
import { onChallengeCompleted, useChallengesToday } from "../lib/api";
import {
  CHALLENGE_ICONS,
  CHALLENGE_LABELS,
  describeChallenge,
} from "../lib/challenges";

interface Toast {
  id: number;
  challengeId: number;
  icon: string;
  label: string;
  text: string;
}

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 5;

export function ChallengeCompletionToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [extraCount, setExtraCount] = useState(0);
  // Wir brauchen die Definitionen, um beim toast den text + icon zu zeigen.
  // Cache via useChallengesToday (queryKey shared mit Trainer/Mini — kein extra-call).
  const { data } = useChallengesToday();

  useEffect(() => {
    const unsub = onChallengeCompleted((ids) => {
      if (!data) return;
      const newToasts: Toast[] = [];
      for (const cid of ids) {
        const c = data.challenges.find((x) => x.id === cid);
        if (!c) continue;
        newToasts.push({
          id: Date.now() + Math.random(),
          challengeId: cid,
          icon: CHALLENGE_ICONS[c.kind],
          label: CHALLENGE_LABELS[c.kind],
          text: describeChallenge(c),
        });
      }
      if (newToasts.length === 0) return;

      setToasts((prev) => {
        const combined = [...prev, ...newToasts];
        if (combined.length > MAX_VISIBLE) {
          setExtraCount((c) => c + (combined.length - MAX_VISIBLE));
          return combined.slice(combined.length - MAX_VISIBLE);
        }
        return combined;
      });

      newToasts.forEach((t) => {
        window.setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS);
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function dismissAll() {
    setToasts([]);
    setExtraCount(0);
  }

  if (toasts.length === 0 && extraCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 backdrop-blur p-4 shadow-lg flex items-start gap-3"
        >
          <span className="text-2xl shrink-0">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-emerald-200/80 uppercase tracking-wide">
              🎯 Challenge erfüllt — {t.label}
            </div>
            <div className="text-sm text-emerald-100 mt-0.5">{t.text}</div>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-xl text-emerald-300/60 hover:text-emerald-200 leading-none -mt-1"
            aria-label="Toast schliessen"
          >
            ×
          </button>
        </div>
      ))}
      {extraCount > 0 && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center gap-2">
          <span>+ {extraCount} weitere Challenges erfüllt!</span>
          <button
            onClick={dismissAll}
            className="ml-auto text-xs underline hover:text-emerald-100"
          >
            alle schliessen
          </button>
        </div>
      )}
    </div>
  );
}

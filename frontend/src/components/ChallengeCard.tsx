// ChallengeCard: einzelne Daily Challenge.
//
// Zeigt:
//  - Icon + Label (kind)
//  - Aufgaben-Text (describeChallenge)
//  - Progress-Bar + "X/Y"
//  - Dismiss-Button (×)
//
// Erfuellte Challenges werden farblich abgehoben (gruen).

import {
  CHALLENGE_ICONS,
  CHALLENGE_LABELS,
  describeChallenge,
  progressLabel,
  progressPercent,
} from "../lib/challenges";
import type { ChallengeItem } from "../lib/types";

interface Props {
  challenge: ChallengeItem;
  onDismiss?: (id: number) => void;
  /** kompakte Variante fuer Dashboard-Mini-Card */
  compact?: boolean;
}

export function ChallengeCard({ challenge, onDismiss, compact = false }: Props) {
  const isDone = challenge.completed_at !== null;
  const pct = progressPercent(challenge);
  const icon = CHALLENGE_ICONS[challenge.kind];
  const label = CHALLENGE_LABELS[challenge.kind];

  const padding = compact ? "p-3" : "p-4";
  const titleSize = compact ? "text-sm" : "text-base";

  return (
    <div
      className={`rounded-lg border ${padding} transition ${
        isDone
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-gray-700 bg-gray-900/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs uppercase tracking-wide ${
                isDone ? "text-emerald-300" : "text-gray-500"
              }`}
            >
              {label}
            </span>
            {isDone && (
              <span className="text-xs text-emerald-400" title="erfuellt">
                ✓
              </span>
            )}
          </div>
          <div
            className={`${titleSize} ${
              isDone ? "text-emerald-100" : "text-gray-200"
            } leading-snug`}
          >
            {describeChallenge(challenge)}
          </div>

          {/* Progress-Bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isDone ? "bg-emerald-400" : "bg-purple-500"
                }`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={challenge.progress}
                aria-valuemin={0}
                aria-valuemax={challenge.target_value}
              />
            </div>
            <span
              className={`text-xs font-mono shrink-0 ${
                isDone ? "text-emerald-300" : "text-gray-400"
              }`}
            >
              {progressLabel(challenge)}
            </span>
          </div>
        </div>

        {onDismiss && !isDone && (
          <button
            onClick={() => onDismiss(challenge.id)}
            className="text-lg text-gray-500 hover:text-gray-300 leading-none -mt-1"
            aria-label="Challenge verwerfen"
            title="Challenge verwerfen"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

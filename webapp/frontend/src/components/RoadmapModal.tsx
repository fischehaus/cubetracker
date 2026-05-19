// RoadmapModal (Phase W.roadmap-frontend, 2026-05-17).
//
// Zeigt die Roadmap aus lib/roadmap-data.ts an. Vorwaerts-Sicht analog
// zu PatchNotesModal (Rueckwaerts-Sicht). Triggerbar aus Footer-Link +
// UserMenu.

import {
  ROADMAP_INTRO,
  ROADMAP_PHASES,
  type PhaseStatus,
  type RoadmapPhase,
} from "../lib/roadmap-data";

interface Props {
  onClose: () => void;
}

export function RoadmapModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2 gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-100">
              🗺 Roadmap
            </h2>
            <p className="mt-1 text-sm text-gray-400">{ROADMAP_INTRO}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label="Schliessen"
          >
            ×
          </button>
        </div>

        <p className="mt-4 mb-5 text-xs text-gray-500">
          Hast du Wünsche oder fehlende Punkte? Sag's uns via Footer-Link
          „Feedback" oder direkt auf GitHub.
        </p>

        <ol className="space-y-5">
          {ROADMAP_PHASES.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function PhaseCard({ phase }: { phase: RoadmapPhase }) {
  const colors = STATUS_COLORS[phase.status];
  return (
    <li
      className={`rounded-lg border ${colors.border} bg-gray-900/50 p-4 space-y-3`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${colors.badge}`}
          >
            {phase.id}
          </span>
          <h3 className="text-lg font-semibold text-gray-100">
            {phase.title}
          </h3>
        </div>
        <span className="text-xs text-gray-500">{phase.timeframe}</span>
      </div>

      <p className="text-sm text-gray-400">{phase.summary}</p>

      <ul className="space-y-1.5 text-sm">
        {phase.items.map((item, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 ${
              item.done ? "text-gray-500 line-through decoration-gray-700" : "text-gray-200"
            }`}
          >
            <span className="mt-0.5">
              {item.done ? "✓" : "•"}
            </span>
            <span className="flex-1">
              {item.title}
              {item.effort && (
                <span className="ml-2 text-xs text-gray-500 italic">
                  ({item.effort})
                </span>
              )}
              {item.note && (
                <span className="block text-xs text-gray-500 mt-0.5">
                  {item.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

const STATUS_COLORS: Record<
  PhaseStatus,
  { border: string; badge: string }
> = {
  active: {
    border: "border-purple-500/40",
    badge: "bg-purple-600 text-white",
  },
  planned: {
    border: "border-amber-500/30",
    badge: "bg-amber-600/40 text-amber-100",
  },
  future: {
    border: "border-gray-700",
    badge: "bg-gray-700 text-gray-300",
  },
  ongoing: {
    border: "border-blue-500/30",
    badge: "bg-blue-600/40 text-blue-100",
  },
};

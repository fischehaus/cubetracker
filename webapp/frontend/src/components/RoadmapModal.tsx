// RoadmapModal (Phase W.roadmap-frontend, 2026-05-17).
//
// Zeigt die Roadmap aus lib/roadmap-data.ts an. Vorwaerts-Sicht analog
// zu PatchNotesModal (Rueckwaerts-Sicht). Triggerbar aus Footer-Link +
// UserMenu.
//
// W.roadmap-intern: items mit `internal=true` werden für Non-Admins
// rausgefiltert (Dev-Schuld / Bundle-Split / Test-Coverage etc.).
// Admins sehen alles inkl. amber „intern"-Badge.

import { useTranslation } from "react-i18next";
import {
  ROADMAP_INTRO,
  ROADMAP_PHASES,
  type PhaseStatus,
  type RoadmapPhase,
  type RoadmapItem,
} from "../lib/roadmap-data";

interface Props {
  onClose: () => void;
  /** Wenn true: zeigt auch internal-Items + amber „intern"-Badge. */
  isAdmin?: boolean;
}

export function RoadmapModal({ onClose, isAdmin = false }: Props) {
  const { t, i18n } = useTranslation();
  // Roadmap-Daten (Phase-Titel, Item-Titel, Notes) sind in lib/roadmap-data.ts
  // hartkodiert deutsch. Bei nicht-deutscher UI-Sprache zeigen wir oben einen
  // Hinweis-Banner — Modal bleibt nutzbar (Trust-Signal: aktive Entwicklung),
  // volle EN-Übersetzung kommt post-Meppel-Demo.
  const showGermanOnlyNotice = i18n.resolvedLanguage !== "de";
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
              {t("roadmap.title")}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{ROADMAP_INTRO}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("roadmap.closeAria")}
          >
            ×
          </button>
        </div>

        <p className="mt-4 mb-5 text-xs text-gray-500">
          {t("roadmap.feedbackHintPrefix")}{" "}
          <strong>„{t("roadmap.feedbackHintLink")}"</strong>{" "}
          {t("roadmap.feedbackHintSuffix")}
        </p>

        {showGermanOnlyNotice && (
          <div className="mb-5 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {t("roadmap.germanOnlyNotice")}
          </div>
        )}

        <ol className="space-y-5">
          {ROADMAP_PHASES.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} isAdmin={isAdmin} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  isAdmin,
}: {
  phase: RoadmapPhase;
  isAdmin: boolean;
}) {
  const colors = STATUS_COLORS[phase.status];
  const visibleItems = isAdmin
    ? phase.items
    : phase.items.filter((it) => !it.internal);
  // Phasen mit ausschliesslich internen Items komplett ausblenden — sonst
  // sähen User eine leere Sektion. Mit aktuellem Datenstand betrifft das
  // nichts, aber zukunftssicher.
  if (visibleItems.length === 0) return null;
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
        {visibleItems.map((item, i) => (
          <ItemRow key={i} item={item} />
        ))}
      </ul>
    </li>
  );
}

function ItemRow({ item }: { item: RoadmapItem }) {
  const { t } = useTranslation();
  return (
    <li
      className={`flex items-start gap-2 ${
        item.done ? "text-gray-500 line-through decoration-gray-700" : "text-gray-200"
      }`}
    >
      <span className="mt-0.5">
        {item.done ? "✓" : "•"}
      </span>
      <span className="flex-1">
        {item.title}
        {item.internal && (
          <span
            className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-500/40 no-underline"
            title={t("roadmap.internalBadgeTitle")}
          >
            {t("roadmap.internalBadge")}
          </span>
        )}
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
  done: {
    border: "border-emerald-500/30",
    badge: "bg-emerald-600/50 text-emerald-100",
  },
};

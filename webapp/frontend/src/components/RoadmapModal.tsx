// RoadmapModal (Phase W.roadmap-modal-api, 2026-05-28).
//
// Vollständig API-gestützt: Items kommen aus dem Backend (useRoadmap),
// Phase-Meta (Titel/Summary/Timeframe/Farben) bleibt clientseitig
// als Konstante in lib/roadmap-phases.ts.
//
// Render-Logik:
// - i18n.resolvedLanguage entscheidet ob title_de/title_en + note_de/
//   note_en gerendert wird.
// - status="done"-Items bekommen ✓ + Strike-Through (analog der
//   früheren item.done-Logik).
// - internal=True-Items kommen nur für Admins zurück (Backend-Filter)
//   und werden mit einem amber „intern"-Badge gezeigt.
// - Phasen ohne sichtbare Items werden NICHT gerendert.
//
// Trigger: Footer-Link + UserMenu (unverändert).

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRoadmap, type RoadmapItem } from "../lib/api";
import {
  PHASE_STATUS_COLORS,
  ROADMAP_PHASES_META,
  type RoadmapPhaseMeta,
} from "../lib/roadmap-phases";

interface Props {
  onClose: () => void;
}

export function RoadmapModal({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useRoadmap();

  // Items nach phase_id gruppieren — pro Phase sortiert nach sort_order
  // (kommt schon sortiert vom Backend, aber defensive nochmal hier).
  const itemsByPhase = useMemo(() => {
    const out: Record<string, RoadmapItem[]> = {};
    for (const item of data?.items ?? []) {
      if (!out[item.phase_id]) out[item.phase_id] = [];
      out[item.phase_id].push(item);
    }
    for (const phaseId of Object.keys(out)) {
      out[phaseId].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return out;
  }, [data?.items]);

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
            <p className="mt-1 text-sm text-gray-400">{t("roadmap.intro")}</p>
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

        {isLoading && (
          <p className="text-sm text-gray-400">{t("roadmap.loading")}</p>
        )}
        {error && (
          <p className="text-sm text-amber-300">{t("roadmap.errorGeneric")}</p>
        )}

        {data && (
          <ol className="space-y-5">
            {ROADMAP_PHASES_META.map((phase) => {
              const items = itemsByPhase[phase.id] ?? [];
              if (items.length === 0) return null;
              return (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  items={items}
                  lang={i18n.resolvedLanguage ?? "de"}
                />
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  items,
  lang,
}: {
  phase: RoadmapPhaseMeta;
  items: RoadmapItem[];
  lang: string;
}) {
  const { t } = useTranslation();
  const colors = PHASE_STATUS_COLORS[phase.status];
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
            {t(phase.titleKey)}
          </h3>
        </div>
        <span className="text-xs text-gray-500">{t(phase.timeframeKey)}</span>
      </div>

      <p className="text-sm text-gray-400">{t(phase.summaryKey)}</p>

      <ul className="space-y-1.5 text-sm">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} lang={lang} />
        ))}
      </ul>
    </li>
  );
}

function ItemRow({ item, lang }: { item: RoadmapItem; lang: string }) {
  const { t } = useTranslation();
  const isDone = item.status === "done";
  const title = lang.startsWith("en") ? item.title_en : item.title_de;
  const note = lang.startsWith("en") ? item.note_en : item.note_de;
  return (
    <li
      className={`flex items-start gap-2 ${
        isDone
          ? "text-gray-500 line-through decoration-gray-700"
          : "text-gray-200"
      }`}
    >
      <span className="mt-0.5">{isDone ? "✓" : "•"}</span>
      <span className="flex-1">
        {title}
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
        {note && (
          <span className="block text-xs text-gray-500 mt-0.5">{note}</span>
        )}
      </span>
    </li>
  );
}

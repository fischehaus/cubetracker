// LazyCharts (W.recharts-split, 2026-05-29).
//
// Recharts (~80kb gz) wurde bisher statisch ins Initial-Bundle gezogen —
// auch für User die nie den Analyse-/Dashboard-Tab öffnen. Hier werden die
// 4 Recharts-nutzenden Komponenten via React.lazy() dynamisch importiert +
// in Suspense gewrappt. Recharts landet damit in eigenen Chunks, die erst
// laden wenn ein Chart wirklich rendert.
//
// Die Usage-Sites (App.tsx) bleiben unverändert — sie importieren nur diese
// Wrapper statt der Original-Komponenten. Gleiche Export-Namen + gleiche
// Props (alle 4: { cubeType, sessionId }), daher transparent.

import { lazy, Suspense, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "./ErrorBoundary";

const ActivityChartLazy = lazy(() =>
  import("./ActivityChart").then((m) => ({ default: m.ActivityChart })),
);
const TrendsChartLazy = lazy(() =>
  import("./TrendsChart").then((m) => ({ default: m.TrendsChart })),
);
const HistogramChartLazy = lazy(() =>
  import("./HistogramChart").then((m) => ({ default: m.HistogramChart })),
);
const PbProgressionCardLazy = lazy(() =>
  import("./PbProgressionCard").then((m) => ({ default: m.PbProgressionCard })),
);

/** Platzhalter während der Chart-Chunk lädt — min-height gegen Layout-Jump. */
function ChartFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gray-700 bg-gray-900/50 text-sm text-gray-500">
      {t("common.loading")}
    </div>
  );
}

// ErrorBoundary compact um jede Suspense (W.ops-hardening): schlägt der
// Chunk-Load fehl (typisch: Tab war über einen Deploy hinweg offen, alte
// Chunks existieren nicht mehr), fällt nur die Chart-Karte mit Reload-
// Hinweis aus — nicht die ganze Seite.
export function ActivityChart(props: ComponentProps<typeof ActivityChartLazy>) {
  return (
    <ErrorBoundary compact>
      <Suspense fallback={<ChartFallback />}>
        <ActivityChartLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function TrendsChart(props: ComponentProps<typeof TrendsChartLazy>) {
  return (
    <ErrorBoundary compact>
      <Suspense fallback={<ChartFallback />}>
        <TrendsChartLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function HistogramChart(
  props: ComponentProps<typeof HistogramChartLazy>,
) {
  return (
    <ErrorBoundary compact>
      <Suspense fallback={<ChartFallback />}>
        <HistogramChartLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function PbProgressionCard(
  props: ComponentProps<typeof PbProgressionCardLazy>,
) {
  return (
    <ErrorBoundary compact>
      <Suspense fallback={<ChartFallback />}>
        <PbProgressionCardLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

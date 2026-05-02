// ActivityCard: ein einzelner Aktivitaets-Slice (heute ODER diese Woche)
// als eigenstaendige Card. Im DASHBOARD-Tab als Top-Row in 3 Spalten:
// [Heute] [Diese Woche] [Reminders].
//
// Im Vergleich zur alten TodayWeekCard:
// - groessere Zahlen (text-4xl statt text-2xl)
// - Headline pro Card (klares „Heute" / „Diese Woche")
// - mehr Padding, weniger gequetscht

import { useTemporalStats } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  sessionId: number | null;
  slice: "today" | "week";
}

const SLICE_LABELS: Record<Props["slice"], string> = {
  today: "Heute",
  week: "Diese Woche",
};

export function ActivityCard({ sessionId, slice }: Props) {
  const { data, isLoading, error } = useTemporalStats(sessionId);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 text-gray-400 text-sm">
        Lade {SLICE_LABELS[slice]} …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-5 text-red-300 text-sm">
        Fehler: {error.message}
      </div>
    );
  }
  if (!data) return null;

  const s = data[slice];

  // Cube-Breakdown: top 3 nach count, Rest als „+N weitere"
  const cubeEntries = Object.entries(s.count_per_cube).sort(
    (a, b) => b[1] - a[1]
  );
  const top = cubeEntries.slice(0, 3);
  const restCount = cubeEntries.length - top.length;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        {SLICE_LABELS[slice]}
      </h3>
      <div className="text-4xl font-bold text-gray-100 leading-none mb-1">
        {s.count}
        <span className="text-base font-normal text-gray-500 ml-2">
          {s.count === 1 ? "Solve" : "Solves"}
        </span>
      </div>

      {s.count > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-gray-500">Schnitt</div>
              <div className="font-mono text-gray-200">
                {s.mean_ms != null ? formatTime(s.mean_ms) : "–"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">ao5</div>
              <div className="font-mono text-gray-200">
                {s.current_ao5 != null ? formatTime(s.current_ao5) : "–"}
              </div>
            </div>
          </div>
          {top.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {top.map(([cube, n]) => (
                <span
                  key={cube}
                  className="rounded bg-gray-800 px-2 py-0.5 text-gray-300"
                >
                  {cube} <span className="text-gray-500">{n}</span>
                </span>
              ))}
              {restCount > 0 && (
                <span className="text-gray-500 self-center">
                  +{restCount} weitere
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500">noch nichts gemacht</p>
      )}
    </div>
  );
}

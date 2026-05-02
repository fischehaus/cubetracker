// TodayWeekCard: kompakter Aktivitaets-Ueberblick „heute" + „diese Woche".
// Zeigt Anzahl Solves + grobes Mittel + welche Cubes du angefasst hast.
//
// Steht im Header-Bereich, weil die Antwort auf „wie viel hab ich heute
// gemacht?" eine der haeufigsten Fragen beim oeffnen sein wird.

import { useTemporalStats, type TemporalSlice } from "../lib/api";
import { formatTime } from "../lib/format";

interface Props {
  sessionId: number | null;
}

function Slice({ label, slice }: { label: string; slice: TemporalSlice }) {
  // Cube-Breakdown: top 3 nach count + ggf. „+N weitere"
  const cubeEntries = Object.entries(slice.count_per_cube).sort(
    (a, b) => b[1] - a[1]
  );
  const top = cubeEntries.slice(0, 3);
  const restCount = cubeEntries.length - top.length;

  return (
    <div className="flex-1 rounded bg-gray-800/40 px-3 py-2 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500">
          {label}
        </div>
        <div className="text-2xl font-semibold text-gray-100 leading-none">
          {slice.count}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-gray-400">
        {slice.count === 0 ? (
          <span className="text-gray-600">noch nichts</span>
        ) : (
          <>
            <span>
              Schnitt {slice.mean_ms != null ? formatTime(slice.mean_ms) : "–"}
            </span>
            {slice.current_ao5 != null && (
              <span className="ml-2">
                ao5 {formatTime(slice.current_ao5)}
              </span>
            )}
          </>
        )}
      </div>
      {top.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
          {top.map(([cube, n]) => (
            <span
              key={cube}
              className="rounded bg-gray-700/60 px-1.5 py-0.5 text-gray-300"
            >
              {cube} <span className="text-gray-500">{n}</span>
            </span>
          ))}
          {restCount > 0 && (
            <span className="text-gray-500">+{restCount}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function TodayWeekCard({ sessionId }: Props) {
  const { data, isLoading, error } = useTemporalStats(sessionId);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-gray-400 text-sm">
        Aktivitaet wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-300 text-sm">
        Fehler: {error.message}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex gap-3">
        <Slice label="Heute" slice={data.today} />
        <Slice label="Diese Woche" slice={data.week} />
      </div>
    </div>
  );
}

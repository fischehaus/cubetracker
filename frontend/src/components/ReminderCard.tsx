// ReminderCard: Trainings-Erinnerung — listet Cubes, die du laenger als
// REMINDER_DAYS Tage nicht mehr angefasst hast.
//
// Wird nur gerendert, wenn tatsaechlich vernachlaessigte Cubes existieren.
// Sortiert nach laengster Pause zuerst — der vergessenste oben.

import { useStatsByCube, type CubeStats } from "../lib/api";

const REMINDER_DAYS = 7;

interface Props {
  sessionId: number | null;
}

function formatDays(days: number): string {
  if (days < 14) return `${days} Tage`;
  if (days < 60) return `${Math.round(days / 7)} Wochen`;
  if (days < 365) return `${Math.round(days / 30)} Monate`;
  return `${Math.round(days / 365)} Jahre`;
}

export function ReminderCard({ sessionId }: Props) {
  const { data, isLoading } = useStatsByCube(sessionId);

  if (isLoading || !data) return null;

  const neglected = data.cubes
    .filter((c): c is CubeStats & { days_since_last: number } =>
      c.days_since_last !== null && c.days_since_last >= REMINDER_DAYS
    )
    .sort((a, b) => b.days_since_last - a.days_since_last);

  if (neglected.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-blue-200">
          Lange nicht mehr trainiert
        </h2>
        <span className="text-[10px] text-blue-300/70">
          {neglected.length} {neglected.length === 1 ? "Cube" : "Cubes"}
        </span>
      </div>
      <ul className="space-y-1">
        {neglected.map((c) => (
          <li
            key={c.cube_type}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="text-gray-200">{c.cube_type}</span>
            <span className="text-blue-300/80 font-mono">
              {formatDays(c.days_since_last)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

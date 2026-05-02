// ReminderCard: Trainings-Erinnerung — listet Cubes, die du laenger als
// REMINDER_DAYS Tage nicht mehr angefasst hast. Sortiert: vergessenste oben.
//
// Hat zwei Render-Modi:
//   - emptyMode='hide'   : rendert null wenn keine Reminders (Aside-Use)
//   - emptyMode='visible': rendert leere Card mit „alles frisch"-Hinweis
//                          (Dashboard-Top-Row, damit Layout stabil bleibt)

import { useStatsByCube, type CubeStats } from "../lib/api";

const REMINDER_DAYS = 7;
const MAX_VISIBLE = 6; // bei vielen Reminder-Cubes nicht ueberlaufen lassen

interface Props {
  sessionId: number | null;
  emptyMode?: "hide" | "visible";
}

function formatDays(days: number): string {
  if (days < 14) return `${days} Tage`;
  if (days < 60) return `${Math.round(days / 7)} Wochen`;
  if (days < 365) return `${Math.round(days / 30)} Monate`;
  return `${Math.round(days / 365)} Jahre`;
}

export function ReminderCard({ sessionId, emptyMode = "hide" }: Props) {
  const { data, isLoading } = useStatsByCube(sessionId);

  if (isLoading || !data) return null;

  const neglected = data.cubes
    .filter(
      (c): c is CubeStats & { days_since_last: number } =>
        c.days_since_last !== null && c.days_since_last >= REMINDER_DAYS
    )
    .sort((a, b) => b.days_since_last - a.days_since_last);

  if (neglected.length === 0) {
    if (emptyMode === "hide") return null;
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Reminders
        </h3>
        <div className="text-sm text-gray-400">
          Alle Cubes innerhalb der letzten {REMINDER_DAYS} Tage trainiert. ✅
        </div>
      </div>
    );
  }

  const visible = neglected.slice(0, MAX_VISIBLE);
  const hidden = neglected.length - visible.length;

  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wide text-blue-200">
          Reminders
        </h3>
        <span className="text-[10px] text-blue-300/70">
          {neglected.length} {neglected.length === 1 ? "Cube" : "Cubes"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((c) => (
          <li
            key={c.cube_type}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-gray-100">{c.cube_type}</span>
            <span className="text-blue-300/80 font-mono">
              {formatDays(c.days_since_last)}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <div className="mt-2 text-[11px] text-blue-300/60">
          + {hidden} weitere
        </div>
      )}
    </div>
  );
}

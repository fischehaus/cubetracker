// DashboardFilterBar: optionaler Filter für den DASHBOARD-Tab.
//
// Default ist „alle Solves, alle Sessions" — Dashboard ist die
// Uebersichts-Sicht und sollte ohne Filter sinnvoll sein. Der Filter
// kann aber auf eine Session eingeschraenkt werden, z.B. „nur Daten
// dieser Trainings-Session". Cube-Filter ist hier bewusst NICHT,
// weil das Dashboard cube-übergreifend vergleichen soll.

import { useSessions } from "../lib/api";

interface Props {
  sessionId: number | null;
  onSessionIdChange: (id: number | null) => void;
}

export function DashboardFilterBar({ sessionId, onSessionIdChange }: Props) {
  const { data: sessions } = useSessions();

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 flex items-center gap-3 flex-wrap">
      <span className="text-base font-semibold text-gray-300">Filter</span>

      <label className="flex items-center gap-2 text-base">
        <span className="text-gray-400">Session</span>
        <select
          value={sessionId === null ? "__all__" : String(sessionId)}
          onChange={(e) =>
            onSessionIdChange(
              e.target.value === "__all__" ? null : parseInt(e.target.value, 10)
            )
          }
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="__all__">Alle Sessions</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {sessionId !== null && (
        <button
          onClick={() => onSessionIdChange(null)}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-600"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}

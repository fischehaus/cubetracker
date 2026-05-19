// Dropdown zum Auswählen der aktiven Session.
// Wert wird vom Parent verwaltet (controlled component).

import { useSessions } from "../lib/api";

interface Props {
  value: number | null; // null = "alle Sessions"
  onChange: (sessionId: number | null) => void;
}

export function SessionSwitcher({ value, onChange }: Props) {
  const { data: sessions, isLoading } = useSessions();

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">Sessions werden geladen …</div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return null; // keine Sessions → Switcher ausblenden
  }

  return (
    <label className="block">
      <span className="text-base text-gray-300">Session</span>
      <select
        value={value ?? "__all__"}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "__all__" ? null : parseInt(v, 10));
        }}
        className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
      >
        <option value="__all__">Alle Sessions ({sessions.length})</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.scramble_type ? ` [${s.scramble_type}]` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

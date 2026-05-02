// Form zum Eintragen eines neuen Solves.
//
// Eingaben:
// - Zeit (frei: "12.34" oder "1:23.45")
// - Cube-Type (Dropdown mit Standard-Liste, plus Custom-Eingabe-Option)
// - Optional: Scramble, Notes, +2-Toggle, DNF-Toggle

import { useState } from "react";
import { useCreateSolve } from "../lib/api";
import { COMMON_CUBE_TYPES, parseTimeInput } from "../lib/format";

export function SolveForm() {
  const [timeStr, setTimeStr] = useState("");
  const [cubeType, setCubeType] = useState<string>("3x3");
  const [customCube, setCustomCube] = useState("");
  const [scramble, setScramble] = useState("");
  const [notes, setNotes] = useState("");
  const [plusTwo, setPlusTwo] = useState(false);
  const [dnf, setDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateSolve();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const time_ms = parseTimeInput(timeStr);
    if (time_ms === null) {
      setError('Ungueltige Zeit. Format: "12.34", "1:23.45" oder Ziffern "1234".');
      return;
    }

    const finalCube = cubeType === "__custom__" ? customCube.trim() : cubeType;
    if (!finalCube) {
      setError("Cube-Type fehlt.");
      return;
    }

    create.mutate(
      {
        time_ms,
        cube_type: finalCube,
        scramble: scramble.trim() || null,
        notes: notes.trim() || null,
        plus_two: plusTwo,
        dnf,
      },
      {
        onSuccess: () => {
          setTimeStr("");
          setScramble("");
          setNotes("");
          setPlusTwo(false);
          setDnf(false);
        },
        onError: (err) => {
          setError(`Fehler beim Speichern: ${err.message}`);
        },
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 space-y-4"
    >
      <h2 className="text-xl font-semibold text-gray-100">Neuer Solve</h2>

      {/* Zeit + Cube-Type nebeneinander */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-300">Zeit</span>
          <input
            type="text"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            placeholder='"12.34", "1:23.45" oder "1234"'
            className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-purple-500 focus:outline-none"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-300">Cube-Type</span>
          <select
            value={cubeType}
            onChange={(e) => setCubeType(e.target.value)}
            className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            {COMMON_CUBE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom__">Anderer …</option>
          </select>
          {cubeType === "__custom__" && (
            <input
              type="text"
              value={customCube}
              onChange={(e) => setCustomCube(e.target.value)}
              placeholder="z.B. FMC"
              className="mt-2 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          )}
        </label>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={plusTwo}
            onChange={(e) => setPlusTwo(e.target.checked)}
            className="accent-purple-500"
          />
          +2 Strafe
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={dnf}
            onChange={(e) => setDnf(e.target.checked)}
            className="accent-purple-500"
          />
          DNF
        </label>
      </div>

      {/* Optional: Scramble + Notes */}
      <details className="text-sm text-gray-400">
        <summary className="cursor-pointer hover:text-gray-200">
          Optional: Scramble + Notizen
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm text-gray-300">Scramble</span>
            <input
              type="text"
              value={scramble}
              onChange={(e) => setScramble(e.target.value)}
              placeholder="R U R' U' …"
              className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-purple-500 focus:outline-none font-mono text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Notizen</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          </label>
        </div>
      </details>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="w-full rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {create.isPending ? "Speichere …" : "Solve speichern"}
      </button>
    </form>
  );
}

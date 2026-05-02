// BigTimerInput: das Solving-Eingabefeld fuer den TIMER-Tab.
// Riesige zentrale Eingabe (text-7xl), Auto-Focus, Enter speichert,
// danach Auto-Re-Focus fuer den naechsten Solve. csTimer-Stackmat-
// Format akzeptiert (1234 = 12.34s) wie auch klassisch (12.34, 1:23.45).
//
// Cube-Type ist hier ein controlled prop — der TimerTab managed den
// Cube-State, damit User waehrend einer Trainings-Session denselben
// Cube behaelt.

import { useEffect, useRef, useState } from "react";
import { useCreateSolve } from "../lib/api";
import { COMMON_CUBE_TYPES, parseTimeInput } from "../lib/format";

interface Props {
  cubeType: string;
  onCubeTypeChange: (s: string) => void;
}

export function BigTimerInput({ cubeType, onCubeTypeChange }: Props) {
  const [timeStr, setTimeStr] = useState("");
  const [plusTwo, setPlusTwo] = useState(false);
  const [dnf, setDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useCreateSolve();

  // Auto-Focus beim Mounten — User landet im TIMER-Tab und kann sofort tippen.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function save() {
    setError(null);
    if (dnf) {
      // DNF erlaubt leere Zeit oder beliebige Zeit (wird ignoriert in Stats)
      const time_ms = timeStr.trim() ? parseTimeInput(timeStr) : 0;
      if (time_ms === null) {
        setError("Zeit ungueltig (oder Feld leer lassen fuer DNF)");
        return;
      }
      doCreate(time_ms);
      return;
    }
    const time_ms = parseTimeInput(timeStr);
    if (time_ms === null) {
      setError('Ungueltige Zeit. Format: "12.34", "1:23.45" oder "1234"');
      return;
    }
    doCreate(time_ms);
  }

  function doCreate(time_ms: number) {
    create.mutate(
      {
        time_ms,
        cube_type: cubeType,
        plus_two: plusTwo,
        dnf,
      },
      {
        onSuccess: () => {
          setTimeStr("");
          setPlusTwo(false);
          setDnf(false);
          // Re-focus, damit der naechste Solve direkt eingetippt werden kann.
          requestAnimationFrame(() => inputRef.current?.focus());
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      }
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-8">
      {/* Cube-Type prominent oben */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="text-base text-gray-400">Cube-Type</span>
        <select
          value={cubeType}
          onChange={(e) => onCubeTypeChange(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-4 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          {COMMON_CUBE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Riesiges Eingabefeld — Hauptbuehne */}
      <div className="my-6">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={timeStr}
          onChange={(e) => {
            setTimeStr(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          placeholder="0.00"
          aria-label="Solve-Zeit"
          className="w-full text-center font-mono bg-transparent border-0 border-b-4 border-gray-700 focus:border-purple-500 focus:outline-none text-gray-100 py-4"
          style={{ fontSize: "5rem", lineHeight: 1 }}
        />
        <p className="mt-3 text-center text-sm text-gray-500">
          „1234" = 12.34s · „15102" = 1:51.02 · oder klassisch „12.34" / „1:23.45"
        </p>
      </div>

      {/* Toggles + Save */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800/50 px-4 py-2 text-base text-gray-200 cursor-pointer hover:bg-gray-800">
          <input
            type="checkbox"
            checked={plusTwo}
            onChange={(e) => setPlusTwo(e.target.checked)}
            className="accent-purple-500 w-4 h-4"
            disabled={dnf}
          />
          +2 Strafe
        </label>
        <label className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800/50 px-4 py-2 text-base text-gray-200 cursor-pointer hover:bg-gray-800">
          <input
            type="checkbox"
            checked={dnf}
            onChange={(e) => {
              setDnf(e.target.checked);
              if (e.target.checked) setPlusTwo(false);
            }}
            className="accent-purple-500 w-4 h-4"
          />
          DNF
        </label>
        <button
          onClick={save}
          disabled={create.isPending}
          className="rounded bg-purple-600 px-6 py-3 text-base font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {create.isPending ? "Speichere …" : "Speichern (Enter)"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
          {error}
        </div>
      )}
    </div>
  );
}

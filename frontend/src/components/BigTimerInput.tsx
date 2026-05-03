// BigTimerInput: das Solving-Eingabefeld fuer den TIMER-Tab.
//
// Drei Selektoren oben (Phase 5b/F17):
//   1. Cube-Type — User-Wahl. Bei Wechsel: auto-suggest Session.
//   2. Session  — Default = jene mit den meisten Solves dieses Cubes
//                 (aus /sessions/suggest). Manuell ueberschreibbar.
//                 „+ Neue Session" oeffnet Inline-Form.
//   3. Hardware — Liste gefiltert auf primary_cube_type == cubeType,
//                 nur aktive. Optional „— ohne Hardware —".
//
// Riesige zentrale Eingabe (text-7xl), Auto-Focus, Enter speichert,
// Auto-Re-Focus fuer den naechsten Solve.

import { useEffect, useRef, useState } from "react";
import {
  useCreateSession,
  useCreateSolve,
  useHardware,
  useSessions,
  useSuggestHardware,
  useSuggestSession,
} from "../lib/api";
import { COMMON_CUBE_TYPES, parseTimeInput } from "../lib/format";
import { useAppSettings } from "../lib/settings";
import { SpacebarTimerCard } from "./SpacebarTimerCard";
import type { TimerPenalty } from "../hooks/useSpacebarTimer";

interface Props {
  cubeType: string;
  onCubeTypeChange: (s: string) => void;
  /** Aktuell gewaehlte Session — controlled vom TimerTab, damit
   *  LastSolvesPreview parallel auf dieselbe Session filtert. */
  sessionId: number | null;
  onSessionIdChange: (id: number | null) => void;
  /**
   * Phase 8a: aktueller Scramble-String — wird beim Save mit dem
   * Solve persistiert. null/empty wenn keiner verfuegbar (kein crash).
   */
  scramble: string | null;
  /**
   * Phase 8a: Callback nach erfolgreichem Save — Parent triggert
   * neuen Scramble (Auto-Next).
   */
  onSolveSaved?: () => void;
}

export function BigTimerInput({
  cubeType,
  onCubeTypeChange,
  sessionId,
  onSessionIdChange,
  scramble,
  onSolveSaved,
}: Props) {
  const [timeStr, setTimeStr] = useState("");
  const [plusTwo, setPlusTwo] = useState(false);
  const [dnf, setDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase 8.2: Spacebar-Timer-Modus
  const [settings] = useAppSettings();
  // Reset-Counter fuer SpacebarTimerCard nach erfolgreichem Save
  const [spacebarResetSeed, setSpacebarResetSeed] = useState(0);

  // „User hat in diesem Cube manuell gewaehlt" → wenn ja, kein Auto-Suggest-
  // Override mehr. Reset bei Cube-Wechsel, sodass der naechste Cube wieder
  // seinen eigenen Suggest bekommt.
  const [userPickedSession, setUserPickedSession] = useState(false);
  const [userPickedHardware, setUserPickedHardware] = useState(false);

  // Inline „neue Session anlegen"
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  // Hardware-State
  const [hardwareId, setHardwareId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const create = useCreateSolve();
  const createSession = useCreateSession();
  const { data: sessions } = useSessions();
  const { data: hardware } = useHardware({ cube_type: cubeType, active_only: true });
  const { data: sessionSuggestion } = useSuggestSession(cubeType);
  const { data: hardwareSuggestion } = useSuggestHardware(cubeType);

  // Auto-Focus beim Mounten
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Bei Cube-Wechsel: User-Pick-Flags reset
  useEffect(() => {
    setUserPickedSession(false);
    setUserPickedHardware(false);
  }, [cubeType]);

  // Session-Suggest anwenden, wenn User nicht manuell gewaehlt hat
  useEffect(() => {
    if (sessionSuggestion && !userPickedSession) {
      onSessionIdChange(sessionSuggestion.session_id);
    }
  }, [sessionSuggestion, userPickedSession, onSessionIdChange]);

  // Hardware-Suggest anwenden, wenn User nicht manuell gewaehlt hat
  useEffect(() => {
    if (hardwareSuggestion && !userPickedHardware) {
      setHardwareId(hardwareSuggestion.hardware_id);
    }
  }, [hardwareSuggestion, userPickedHardware]);

  function save() {
    setError(null);
    if (dnf) {
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
        session_id: sessionId,
        hardware_id: hardwareId,
        scramble: scramble && scramble.trim() !== "" ? scramble : null,
      },
      {
        onSuccess: () => {
          setTimeStr("");
          setPlusTwo(false);
          setDnf(false);
          requestAnimationFrame(() => inputRef.current?.focus());
          // Phase 8a: Auto-Next-Scramble triggern
          onSolveSaved?.();
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      }
    );
  }

  // Phase 8.2: Spacebar-Timer-Save-Pfad. Mappt Penalty zu plus_two/dnf.
  function saveFromSpacebar(
    finalMs: number,
    penalty: TimerPenalty,
    splitTimesMs: number[] | null,
  ) {
    setError(null);
    create.mutate(
      {
        time_ms: finalMs,
        cube_type: cubeType,
        plus_two: penalty === "+2",
        dnf: penalty === "DNF",
        session_id: sessionId,
        hardware_id: hardwareId,
        scramble: scramble && scramble.trim() !== "" ? scramble : null,
        split_times_ms:
          splitTimesMs && splitTimesMs.length > 0 ? JSON.stringify(splitTimesMs) : null,
      },
      {
        onSuccess: () => {
          // Auto-Reset des SpacebarTimer + neuer Scramble
          setSpacebarResetSeed((s) => s + 1);
          onSolveSaved?.();
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      },
    );
  }

  function handleSessionChange(value: string) {
    if (value === "__new__") {
      setShowNewSessionForm(true);
      return;
    }
    setUserPickedSession(true);
    onSessionIdChange(value === "__none__" ? null : parseInt(value, 10));
  }

  function createNewSession() {
    const name = newSessionName.trim();
    if (!name) return;
    createSession.mutate(
      { name },
      {
        onSuccess: (s) => {
          onSessionIdChange(s.id);
          setUserPickedSession(true);
          setNewSessionName("");
          setShowNewSessionForm(false);
        },
      }
    );
  }

  // Hilfs-Variablen fuer UI-Hints
  const suggestedSessionLabel =
    sessionSuggestion && sessionSuggestion.session_id !== null
      ? sessions?.find((s) => s.id === sessionSuggestion.session_id)?.name ?? null
      : null;
  const suggestedHardwareLabel =
    hardwareSuggestion && hardwareSuggestion.hardware_id !== null
      ? hardware?.find((h) => h.id === hardwareSuggestion.hardware_id)?.name ?? null
      : null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-8">
      {/* Drei Selektoren oben in einer Zeile */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cube-Type */}
        <label className="flex flex-col text-sm text-gray-400">
          Cube-Type
          <select
            value={cubeType}
            onChange={(e) => onCubeTypeChange(e.target.value)}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            {COMMON_CUBE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Session */}
        <label className="flex flex-col text-sm text-gray-400">
          <span className="flex items-center justify-between">
            Session
            {sessionSuggestion?.session_id !== null && !userPickedSession && (
              <span
                className="text-[10px] text-emerald-400"
                title={`Vorgeschlagen: meiste Solves fuer ${cubeType}`}
              >
                ★ auto
              </span>
            )}
          </span>
          <select
            value={sessionId === null ? "__none__" : String(sessionId)}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="__none__">— ohne Session —</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new__">+ Neue Session anlegen …</option>
          </select>
          {suggestedSessionLabel && !userPickedSession && (
            <span className="mt-1 text-[11px] text-emerald-400/80 truncate">
              → „{suggestedSessionLabel}" ({sessionSuggestion?.count} {cubeType}-Solves)
            </span>
          )}
        </label>

        {/* Hardware */}
        <label className="flex flex-col text-sm text-gray-400">
          <span className="flex items-center justify-between">
            Hardware
            {hardwareSuggestion?.hardware_id !== null && !userPickedHardware && (
              <span
                className="text-[10px] text-emerald-400"
                title={
                  hardwareSuggestion?.reason === "most_used"
                    ? `Vorgeschlagen: am haeufigsten fuer ${cubeType} verwendet`
                    : `Vorgeschlagen: erste aktive ${cubeType}-Hardware`
                }
              >
                ★ auto
              </span>
            )}
          </span>
          <select
            value={hardwareId === null ? "__none__" : String(hardwareId)}
            onChange={(e) => {
              const v = e.target.value;
              setUserPickedHardware(true);
              setHardwareId(v === "__none__" ? null : parseInt(v, 10));
            }}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="__none__">— ohne Hardware —</option>
            {hardware?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          {hardware && hardware.length === 0 && (
            <span className="mt-1 text-[11px] text-gray-500">
              Kein {cubeType}-Cube im Inventar
            </span>
          )}
          {suggestedHardwareLabel && !userPickedHardware && (
            <span className="mt-1 text-[11px] text-emerald-400/80 truncate">
              → „{suggestedHardwareLabel}"
              {hardwareSuggestion?.reason === "most_used" &&
                ` (${hardwareSuggestion.count}×)`}
            </span>
          )}
        </label>
      </div>

      {/* Inline-Form fuer neue Session */}
      {showNewSessionForm && (
        <div className="mb-4 rounded border border-purple-500/40 bg-purple-500/5 p-3 flex gap-2 items-end flex-wrap">
          <label className="flex flex-col text-sm text-gray-300 flex-1 min-w-[12rem]">
            Name der neuen Session
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createNewSession();
                if (e.key === "Escape") {
                  setShowNewSessionForm(false);
                  setNewSessionName("");
                }
              }}
              autoFocus
              placeholder={`z.B. „${cubeType} Training"`}
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          </label>
          <button
            onClick={createNewSession}
            disabled={createSession.isPending || !newSessionName.trim()}
            className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Anlegen + auswaehlen
          </button>
          <button
            onClick={() => {
              setShowNewSessionForm(false);
              setNewSessionName("");
            }}
            className="text-base rounded bg-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-600"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Phase 8.2: wenn Spacebar-Timer aktiv → SpacebarTimerCard,
          sonst klassisches Text-Eingabefeld. */}
      {settings.spacebar_enabled ? (
        <div className="my-6">
          <SpacebarTimerCard
            enabled={true}
            settings={settings}
            phaseNames={settings.phase_names}
            onSave={saveFromSpacebar}
            resetSeed={spacebarResetSeed}
          />
          <p className="mt-3 text-center text-sm text-gray-500">
            Spacebar-Modus: aenderbar in Verwaltung → Einstellungen
          </p>
        </div>
      ) : (
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
      )}

      {/* Toggles + Save — nur im Text-Mode (Spacebar regelt +2/DNF
          automatisch ueber Inspection-Penalty + auto-save). */}
      {!settings.spacebar_enabled && (
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
      )}

      {error && (
        <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
          {error}
        </div>
      )}
    </div>
  );
}

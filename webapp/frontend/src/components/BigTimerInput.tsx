// BigTimerInput: das Solving-Eingabefeld für den TIMER-Tab.
//
// Mit dem Mobile-Layout-Refactor (Welle 2, 2026-05-16) auf das eigentliche
// Timer-Display reduziert: zeigt SpacebarTimerCard oder das klassische
// Text-Eingabefeld (je nach settings.spacebar_enabled) + Toggles/Save.
//
// Die Selektoren (Cube/Session/Hardware) + der Timer-Modus-Picker leben
// jetzt in TimerControlsCard — der TimerTab rendert die beiden Karten
// separat und kann sie unterschiedlich anordnen (Mobile: Controls UNTER
// dem TouchPad, damit Scramble + Timer ohne Scrollen sichtbar bleiben).
//
// hardwareId wird als Prop hereingereicht (Lifting nach TimerTab, damit
// die Selektoren in TimerControlsCard live mit dem Save synchron sind).

import { useEffect, useRef, useState } from "react";
import { useCreateSolve, useDeleteSolve, useUpdateSolve } from "../lib/api";
import type { Solve } from "../lib/types";
import { parseTimeInput } from "../lib/format";
import { TIMER_FONT_SCALE, useAppSettings } from "../lib/settings";
import { SpacebarTimerCard } from "./SpacebarTimerCard";
import type { TimerPenalty } from "../hooks/useSpacebarTimer";

interface Props {
  cubeType: string;
  /** Aktuell gewählte Session — controlled vom TimerTab. */
  sessionId: number | null;
  /** Aktuell gewählte Hardware — controlled vom TimerTab (Lifting
   *  für Welle 2, damit der Selektor unter dem TouchPad leben kann). */
  hardwareId: number | null;
  /**
   * Aktueller Scramble-String — wird beim Save mit dem Solve persistiert.
   * null/empty wenn keiner verfügbar (kein crash).
   */
  scramble: string | null;
  /**
   * Callback nach erfolgreichem Save — Parent triggert neuen Scramble
   * (Auto-Next).
   */
  onSolveSaved?: () => void;
}

export function BigTimerInput({
  cubeType,
  sessionId,
  hardwareId,
  scramble,
  onSolveSaved,
}: Props) {
  const [timeStr, setTimeStr] = useState("");
  const [plusTwo, setPlusTwo] = useState(false);
  const [dnf, setDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings] = useAppSettings();
  // Reset-Counter für SpacebarTimerCard nach erfolgreichem Save
  const [spacebarResetSeed, setSpacebarResetSeed] = useState(0);
  const spacebarMode = settings.spacebar_enabled;

  const inputRef = useRef<HTMLInputElement>(null);

  const create = useCreateSolve();
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  // Phase W.penalty-quick (2026-05-17): nach jedem Save halten wir den
  // gespeicherten Solve kurz fest, damit der User direkt unter dem Timer
  // die Penalty per Knopfdruck korrigieren kann (+2 / DNF / Löschen).
  // Wird beim nächsten Solve-Start (Spacebar-Press oder Text-Input
  // gefokussiert) wieder geleert.
  const [lastSavedSolve, setLastSavedSolve] = useState<Solve | null>(null);
  // QA-Fix M#8 (2026-05-17): zwei-Klick-Confirm für Löschen statt
  // window.confirm() — Browser-Native-Dialog ist auf Mobile unzuverlaessig
  // (Back-Button schliesst Dialog, kann durch PWA-Wrapper geschluckt werden).
  // Pattern: erster Klick → Button-Label wechselt zu „Wirklich löschen?",
  // zweiter Klick innerhalb 5s loescht. Auto-Reset nach 5s ohne Aktion.
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Auto-Focus beim Mounten (nur Text-Mode)
  useEffect(() => {
    if (!spacebarMode) {
      inputRef.current?.focus();
    }
  }, [spacebarMode]);

  // Quick-Penalty-Buttons verstecken wenn Cube wechselt — sonst zeigt
  // der „Letzte Solve war 3x3"-Block weiter während der User schon
  // auf 4x4 umgestellt hat (verwirrend + falscher Context).
  useEffect(() => {
    setLastSavedSolve(null);
    setDeleteConfirm(false);
  }, [cubeType, sessionId]);

  // QA-Fix M#8: Delete-Confirm nach 5s ohne 2. Klick wieder zuruecksetzen,
  // sonst bleibt der Button gefuehlt „bewaffnet" liegen.
  useEffect(() => {
    if (!deleteConfirm) return;
    const t = setTimeout(() => setDeleteConfirm(false), 5000);
    return () => clearTimeout(t);
  }, [deleteConfirm]);

  // Confirm beim Wechsel auf einen neuen Solve oder beim Ausblenden
  // wieder zuruecknehmen.
  useEffect(() => {
    setDeleteConfirm(false);
  }, [lastSavedSolve?.id]);

  function save() {
    setError(null);
    if (dnf) {
      const time_ms = timeStr.trim() ? parseTimeInput(timeStr) : 0;
      if (time_ms === null) {
        setError("Zeit ungueltig (oder Feld leer lassen für DNF)");
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
        onSuccess: (savedSolve) => {
          setTimeStr("");
          setPlusTwo(false);
          setDnf(false);
          setLastSavedSolve(savedSolve);
          requestAnimationFrame(() => inputRef.current?.focus());
          onSolveSaved?.();
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      },
    );
  }

  // Spacebar-Timer-Save-Pfad. Mappt Penalty zu plus_two/dnf.
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
          splitTimesMs && splitTimesMs.length > 0
            ? JSON.stringify(splitTimesMs)
            : null,
      },
      {
        onSuccess: (savedSolve) => {
          // Auto-Reset des SpacebarTimer + neuer Scramble
          setSpacebarResetSeed((s) => s + 1);
          setLastSavedSolve(savedSolve);
          onSolveSaved?.();
        },
        onError: (e) => setError(`Fehler: ${e.message}`),
      },
    );
  }

  // Quick-Penalty-Actions (Phase W.penalty-quick, 2026-05-17): wirken
  // auf den zuletzt gespeicherten Solve. PATCH /solves/:id für Toggles,
  // DELETE bei Löschen. State lokal updaten + dann komplette
  // Cache-Invalidate aus useUpdateSolve/useDeleteSolve.
  function toggleLastPlusTwo() {
    if (!lastSavedSolve) return;
    const nextPlusTwo = !lastSavedSolve.plus_two;
    update.mutate(
      {
        id: lastSavedSolve.id,
        payload: { plus_two: nextPlusTwo, dnf: false },
      },
      {
        onSuccess: (updated) => setLastSavedSolve(updated),
      },
    );
  }
  function toggleLastDnf() {
    if (!lastSavedSolve) return;
    const nextDnf = !lastSavedSolve.dnf;
    update.mutate(
      {
        id: lastSavedSolve.id,
        payload: { dnf: nextDnf, plus_two: false },
      },
      {
        onSuccess: (updated) => setLastSavedSolve(updated),
      },
    );
  }
  function deleteLast() {
    if (!lastSavedSolve) return;
    // Zwei-Klick-Pattern statt window.confirm(): erster Klick „bewaffnet",
    // zweiter Klick loescht. Verhindert Fehlbedienung auf Mobile ohne
    // Browser-Dialog-Abhaengigkeit (siehe QA M#8).
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    del.mutate(lastSavedSolve.id, {
      onSuccess: () => {
        setLastSavedSolve(null);
        setDeleteConfirm(false);
      },
    });
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      {spacebarMode ? (
        <SpacebarTimerCard
          enabled={true}
          settings={settings}
          phaseNames={settings.phase_names}
          onSave={saveFromSpacebar}
          resetSeed={spacebarResetSeed}
        />
      ) : (
        <div>
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
            style={{
              fontSize: TIMER_FONT_SCALE[settings.timer_font_size].timer,
              lineHeight: 1,
            }}
          />
          <p className="mt-3 text-center text-sm text-gray-500">
            „1234" = 12.34s · „15102" = 1:51.02 · oder klassisch „12.34" / „1:23.45"
          </p>
        </div>
      )}

      {/* Toggles + Save — nur im Text-Mode (Spacebar regelt +2/DNF
          automatisch über Inspection-Penalty + auto-save). */}
      {!spacebarMode && (
        <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
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

      {/* Penalty-Quick-Buttons (Phase W.penalty-quick, 2026-05-17):
          erscheinen direkt nach dem Save unter dem Timer. Korrigieren
          die Penalty oder löschen den Solve ohne den Weg über die
          Letzte-Solves-Sidebar. Verschwinden wenn lastSavedSolve null
          ist (= neuer Solve gestartet, anderer Cube gewählt, manueller
          ↺-Klick). */}
      {lastSavedSolve && (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-sm">
          {/* QA-Fix H#2: cube_type ins Label, damit User auch über
              Cube-Wechsel hinweg weiss, welcher Solve gerade bearbeitet wird. */}
          <span className="text-gray-500">
            Letzter Solve ({lastSavedSolve.cube_type}):
          </span>
          <button
            type="button"
            onClick={toggleLastPlusTwo}
            disabled={update.isPending || lastSavedSolve.dnf}
            className={`rounded px-3 py-1.5 transition-colors ${
              lastSavedSolve.plus_two
                ? "bg-amber-600/40 text-amber-100 hover:bg-amber-600/60"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={
              lastSavedSolve.plus_two
                ? "+2 entfernen"
                : lastSavedSolve.dnf
                ? "Nicht möglich auf DNF-Solve (zuerst DNF entfernen)"
                : "+2 Strafe markieren"
            }
          >
            {lastSavedSolve.plus_two ? "✓ +2" : "+2"}
          </button>
          <button
            type="button"
            onClick={toggleLastDnf}
            disabled={update.isPending}
            className={`rounded px-3 py-1.5 transition-colors ${
              lastSavedSolve.dnf
                ? "bg-red-600/40 text-red-100 hover:bg-red-600/60"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={
              lastSavedSolve.dnf
                ? "DNF entfernen"
                : lastSavedSolve.plus_two
                ? "Als DNF markieren — vorhandenes +2 wird automatisch entfernt (WCA: nicht kombinierbar)"
                : "Als DNF markieren"
            }
          >
            {lastSavedSolve.dnf ? "✓ DNF" : "DNF"}
          </button>
          <button
            type="button"
            onClick={deleteLast}
            disabled={del.isPending}
            className={`rounded px-3 py-1.5 transition-colors ${
              deleteConfirm
                ? "bg-red-700 text-red-100 hover:bg-red-600 animate-pulse"
                : "bg-gray-800 text-gray-400 hover:bg-red-900/40 hover:text-red-200"
            } disabled:opacity-40`}
            title={
              deleteConfirm
                ? "Erneut klicken zum endgueltigen Löschen"
                : "Letzten Solve löschen"
            }
          >
            {deleteConfirm ? "Wirklich löschen?" : "🗑 Löschen"}
          </button>
          <button
            type="button"
            onClick={() => setLastSavedSolve(null)}
            className="rounded px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300"
            title="Quick-Buttons ausblenden"
          >
            ↺
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

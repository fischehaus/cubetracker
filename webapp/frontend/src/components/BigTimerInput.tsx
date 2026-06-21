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
import { useTranslation } from "react-i18next";
import { useCreateSolve, useDeleteSolve, useUpdateSolve } from "../lib/api";
import type { Solve } from "../lib/types";
import { parseTimeInput } from "../lib/format";
import {
  TIMER_FONT_SCALE,
  useAppSettings,
  shouldSaveFromStackmat,
  shouldSaveFromSmartCube,
} from "../lib/settings";
import { SpacebarTimerCard } from "./SpacebarTimerCard";
import { StackmatBigDisplay } from "./StackmatBigDisplay";
import type { TimerPenalty, TimerState } from "../hooks/useSpacebarTimer";
import { Button, Card } from "./ui";

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
  /**
   * W.timer-zen-mode: wenn true (nur in Spacebar-Modus wirksam), rendert der
   * Timer als Vollbild-Zen-Overlay (nur Scramble + große Zeit). `onExitZen`
   * schließt es. Steuerung liegt im TimerTab.
   */
  zen?: boolean;
  onExitZen?: () => void;
  /**
   * W.stackmat-live-timer: öffnet die Einstellungen — für den „in Einstellungen
   * verbinden"-Hinweis im Stackmat-Modus, wenn (noch) nichts verbunden ist.
   */
  onOpenSettings?: () => void;
}

export function BigTimerInput({
  cubeType,
  sessionId,
  hardwareId,
  scramble,
  onSolveSaved,
  zen = false,
  onExitZen,
  onOpenSettings,
}: Props) {
  const { t } = useTranslation();
  const [timeStr, setTimeStr] = useState("");
  const [plusTwo, setPlusTwo] = useState(false);
  const [dnf, setDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings] = useAppSettings();
  // W.timer-keep-last-time (2026-05-31): Reset-Counter für SpacebarTimerCard.
  // Wird NICHT mehr nach dem Save gebumpt (die letzte Zeit bleibt stehen).
  // Bump nur noch beim Löschen eines Solves + bei Cube/Session-Wechsel.
  // +2/DNF lassen die Zeit bewusst stehen (User-Wunsch); den nächsten
  // Solve-Start resettet die Anzeige direkt im Hook (restartFromStopped).
  const [spacebarResetSeed, setSpacebarResetSeed] = useState(0);
  // Aktueller Timer-State (vom SpacebarTimerCard via onStateChange nach oben
  // gemeldet). Steuert (a) das Ausblenden des Zen-Exit-× während eines
  // laufenden Solves und (b) das Verstecken der Quick-Penalty-Leiste, sobald
  // der nächste Solve startet (W.timer-keep-last-time).
  const [spacebarState, setSpacebarState] = useState<TimerState>("idle");
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
  // window.confirm() — Browser-Native-Dialog ist auf Mobile unzuverlässig
  // (Back-Button schliesst Dialog, kann durch PWA-Wrapper geschluckt werden).
  // Pattern: erster Klick → Button-Label wechselt zu „Wirklich löschen?",
  // zweiter Klick innerhalb 5s löscht. Auto-Reset nach 5s ohne Aktion.
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
    // W.timer-keep-last-time: Cube/Session-Wechsel → auch die stehengebliebene
    // letzte Zeit verwerfen (sie gehörte zum alten Cube / der alten Session).
    setSpacebarResetSeed((s) => s + 1);
  }, [cubeType, sessionId]);

  // QA-Fix M#8: Delete-Confirm nach 5s ohne 2. Klick wieder zurücksetzen,
  // sonst bleibt der Button gefühlt „bewaffnet" liegen.
  useEffect(() => {
    if (!deleteConfirm) return;
    const t = setTimeout(() => setDeleteConfirm(false), 5000);
    return () => clearTimeout(t);
  }, [deleteConfirm]);

  // W.gan-cube-auto-time + W.stackmat: Auto-Save für Hardware-Solves.
  // useSmartCube/useStackmatTimer feuern `cubetracker:smart-cube-solve` /
  // `cubetracker:stackmat-solve` (je mit { time_ms }) bei Solve-Ende; wir
  // speichern direkt (analog Spacebar-Mode ohne expliziten Save-Klick).
  //
  // QA (2026-06-20): die Listener werden EINMAL registriert (deps []), NICHT
  // bei jedem Render neu — onSolveSaved/create/scramble ändern sich ständig,
  // sonst riss der Listener pro Render kurz ab (theoretisches verlorenes Event).
  // Die jeweils aktuelle Save-Logik hängt an saveFromEventRef (jeden Render
  // frisch gesetzt); die stabilen Listener lesen sie zum Event-Zeitpunkt.
  const saveFromEventRef = useRef<
    (timeMs: number, source: "stackmat" | "smartcube") => void
  >(() => {});
  saveFromEventRef.current = (timeMs, source) => {
    // Gating (W.timer-autosave-gating): genau EINE Quelle je Modus — im
    // Stackmat-Modus speichert nur der Stackmat, sonst nur der Smart-Cube
    // (kein Doppel-/Geister-Save).
    if (
      source === "stackmat" &&
      !shouldSaveFromStackmat(settings.timer_input_source)
    ) {
      return;
    }
    if (
      source === "smartcube" &&
      !shouldSaveFromSmartCube(settings.timer_input_source)
    ) {
      return;
    }
    // Hardware liefert keine Penalty-Info (Cube „solved" / Stackmat-Stop) →
    // weder +2 noch DNF; nachträglich über die Quick-Penalty-Leiste korrigierbar.
    create.mutate(
      {
        time_ms: timeMs,
        cube_type: cubeType,
        plus_two: false,
        dnf: false,
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
          onSolveSaved?.();
        },
        onError: (err) =>
          setError(t("timer.errorPrefix", { message: err.message })),
      },
    );
  };

  useEffect(() => {
    function onSmartCubeSolve(e: Event) {
      const detail = (e as CustomEvent<{ time_ms: number }>).detail;
      if (!detail || typeof detail.time_ms !== "number") return;
      saveFromEventRef.current(detail.time_ms, "smartcube");
    }
    function onStackmatSolve(e: Event) {
      const detail = (e as CustomEvent<{ time_ms: number }>).detail;
      if (!detail || typeof detail.time_ms !== "number") return;
      saveFromEventRef.current(detail.time_ms, "stackmat");
    }
    window.addEventListener("cubetracker:smart-cube-solve", onSmartCubeSolve);
    window.addEventListener("cubetracker:stackmat-solve", onStackmatSolve);
    return () => {
      window.removeEventListener(
        "cubetracker:smart-cube-solve",
        onSmartCubeSolve,
      );
      window.removeEventListener("cubetracker:stackmat-solve", onStackmatSolve);
    };
  }, []);

  // Confirm beim Wechsel auf einen neuen Solve oder beim Ausblenden
  // wieder zurücknehmen.
  useEffect(() => {
    setDeleteConfirm(false);
  }, [lastSavedSolve?.id]);

  // W.timer-keep-last-time (2026-05-31): sobald ein neuer Solve startet
  // (Inspection / Hold-ready / Running), die Quick-Penalty-Leiste des
  // vorherigen Solves ausblenden — die letzte Zeit stand bis hierhin still,
  // jetzt übernimmt der neue Solve die Anzeige.
  useEffect(() => {
    if (
      spacebarState === "inspection" ||
      spacebarState === "ready" ||
      spacebarState === "running"
    ) {
      setLastSavedSolve(null);
      setDeleteConfirm(false);
    }
  }, [spacebarState]);

  function save() {
    setError(null);
    if (dnf) {
      const time_ms = timeStr.trim() ? parseTimeInput(timeStr) : 0;
      if (time_ms === null) {
        setError(t("timer.errorInvalidTime"));
        return;
      }
      doCreate(time_ms);
      return;
    }
    const time_ms = parseTimeInput(timeStr);
    if (time_ms === null) {
      setError(t("timer.errorInvalidFormat"));
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
        onError: (e) => setError(t("timer.errorPrefix", { message: e.message })),
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
          // W.timer-keep-last-time: KEIN Auto-Reset mehr — die gestoppte Zeit
          // bleibt sichtbar, bis der User reagiert (+2/DNF/Löschen) oder den
          // nächsten Solve startet. Nur Quick-Penalty-Leiste setzen + neuen
          // Scramble holen.
          setLastSavedSolve(savedSolve);
          onSolveSaved?.();
        },
        onError: (e) => setError(t("timer.errorPrefix", { message: e.message })),
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
        // W.timer-keep-last-time: +2 lässt die Zeit stehen — nur Löschen /
        // nächster Solve resetten auf 0.00 (User-Wunsch).
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
        // W.timer-keep-last-time: DNF lässt die Zeit stehen — nur Löschen /
        // nächster Solve resetten auf 0.00 (User-Wunsch).
        onSuccess: (updated) => setLastSavedSolve(updated),
      },
    );
  }
  function deleteLast() {
    if (!lastSavedSolve) return;
    // Zwei-Klick-Pattern statt window.confirm(): erster Klick „bewaffnet",
    // zweiter Klick löscht. Verhindert Fehlbedienung auf Mobile ohne
    // Browser-Dialog-Abhängigkeit (siehe QA M#8).
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    del.mutate(lastSavedSolve.id, {
      onSuccess: () => {
        setLastSavedSolve(null);
        setDeleteConfirm(false);
        // W.timer-keep-last-time: gelöscht → Timer auf 0.00.
        setSpacebarResetSeed((s) => s + 1);
      },
    });
  }

  // W.timer-keep-last-time (2026-05-31): die Quick-Penalty-Leiste (+2 / DNF /
  // Löschen / ausblenden) als wiederverwendbares Fragment — wird sowohl im
  // normalen Timer-Card als auch im Zen-Vollbild gerendert (User-Wunsch: die
  // Wahlmöglichkeiten müssen auch im Zen-Modus nach dem Solve erscheinen).
  // Wirkt auf den zuletzt gespeicherten Solve (PATCH/DELETE); danach setzt der
  // jeweilige Handler den Timer per spacebarResetSeed auf 0.00.
  const quickButtons = lastSavedSolve ? (
    <>
      {/* QA-Fix H#2: cube_type ins Label, damit User auch über Cube-Wechsel
          hinweg weiss, welcher Solve gerade bearbeitet wird. */}
      <span className="text-gray-500">
        {t("timer.lastSolve", { cube: lastSavedSolve.cube_type })}
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
            ? t("timer.plusTwoRemove")
            : lastSavedSolve.dnf
            ? t("timer.plusTwoNotPossibleOnDnf")
            : t("timer.plusTwoMark")
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
            ? t("timer.dnfRemove")
            : lastSavedSolve.plus_two
            ? t("timer.dnfMarkRemovesPlusTwo")
            : t("timer.dnfMark")
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
          deleteConfirm ? t("timer.deleteSecondClick") : t("timer.deleteLast")
        }
      >
        {deleteConfirm ? t("timer.deleteConfirm") : t("timer.deleteIcon")}
      </button>
      <button
        type="button"
        onClick={() => setLastSavedSolve(null)}
        className="rounded px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300"
        title={t("timer.hideQuickButtons")}
      >
        ↺
      </button>
    </>
  ) : null;

  // W.stackmat-live-timer (2026-06-20): im Stackmat-Modus ersetzt das Live-
  // Display den Spacebar-/Text-Timer. Höher priorisiert als der Spacebar-Zweig.
  // Der Auto-Save läuft über den (gateten) Stackmat-Listener oben; die
  // Quick-Penalty-Leiste erscheint nach dem Save wie gewohnt.
  if (settings.timer_input_source === "stackmat") {
    // W.stackmat-zen (2026-06-20): Vollbild-Zen auch für den Stackmat — Scramble
    // oben, große Live-Zeit mittig, Quick-Leiste unten. Der Stackmat treibt die
    // Zeit (kein keydown), darum ist das Exit-× immer verfügbar.
    if (zen && onExitZen) {
      return (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gray-950"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <button
            type="button"
            onClick={onExitZen}
            aria-label={t("timerTab.zenExit")}
            className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-3xl leading-none text-gray-500 hover:bg-gray-800/60 hover:text-gray-200"
          >
            ×
          </button>
          <div className="px-4 pt-16 text-center">
            <div
              className="mx-auto max-w-3xl break-words font-mono text-gray-300"
              style={{
                fontSize: TIMER_FONT_SCALE[settings.timer_font_size].scramble,
              }}
            >
              {scramble && scramble.trim() !== "" ? scramble : "—"}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            <StackmatBigDisplay onOpenSettings={onOpenSettings} />
          </div>
          {quickButtons && (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-6 text-sm">
              {quickButtons}
            </div>
          )}
        </div>
      );
    }
    return (
      <Card>
        <StackmatBigDisplay onOpenSettings={onOpenSettings} />
        {quickButtons && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            {quickButtons}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
            {error}
          </div>
        )}
      </Card>
    );
  }

  // W.timer-zen-mode (2026-05-31): Vollbild-Zen-Modus — nur Scramble + große
  // Zeit, Tap (Mobile) / Space (Desktop) tracket, sonst nichts. Reuse der
  // SELBEN SpacebarTimerCard-Instanz (KEIN zweiter useSpacebarTimer → kein
  // Doppel-Listener / Doppel-Save). Nur im Spacebar-Modus sinnvoll.
  // INVARIANTE: Zen-Overlay und normales Card sind mutual exclusive (early
  // return) — es darf IMMER nur EINE SpacebarTimerCard gleichzeitig gemountet
  // sein, sonst doppelte keydown-Listener + Doppel-Save.
  if (spacebarMode && zen && onExitZen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-gray-950"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Exit-× nur wenn kein Solve läuft — verhindert versehentliches
            Verwerfen einer laufenden Zeit (QA). */}
        {(spacebarState === "idle" ||
          spacebarState === "stopped" ||
          spacebarState === "holding") && (
          <button
            type="button"
            onClick={onExitZen}
            aria-label={t("timerTab.zenExit")}
            className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-3xl leading-none text-gray-500 hover:bg-gray-800/60 hover:text-gray-200"
          >
            ×
          </button>
        )}
        {/* Scramble oben */}
        <div className="px-4 pt-16 text-center">
          <div
            className="mx-auto max-w-3xl break-words font-mono text-gray-300"
            style={{
              fontSize: TIMER_FONT_SCALE[settings.timer_font_size].scramble,
            }}
          >
            {scramble && scramble.trim() !== "" ? scramble : "—"}
          </div>
        </div>
        {/* Große Zeit — tap/space tracket. SpacebarTimerCard füllt im bare-
            Modus die Fläche (großes Tap-Target). min-h-0 → bei niedrigem
            Viewport schrumpft die Zeit-Fläche, statt die Quick-Leiste darunter
            zu überlagern (QA). */}
        <div className="flex min-h-0 flex-1 items-stretch px-4 pb-4">
          <SpacebarTimerCard
            enabled={true}
            settings={settings}
            phaseNames={settings.phase_names}
            onSave={saveFromSpacebar}
            resetSeed={spacebarResetSeed}
            bare
            onStateChange={setSpacebarState}
            restartFromStopped
          />
        </div>
        {/* W.timer-keep-last-time: Quick-Penalty-Leiste auch im Zen-Modus
            (User-Wunsch) — erscheint nach dem Solve unter der großen Zeit.
            Außerhalb des tappbaren Timer-Bereichs → kein Tap-Konflikt. */}
        {quickButtons && (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-6 text-sm">
            {quickButtons}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      {spacebarMode ? (
        <SpacebarTimerCard
          enabled={true}
          settings={settings}
          phaseNames={settings.phase_names}
          onSave={saveFromSpacebar}
          resetSeed={spacebarResetSeed}
          onStateChange={setSpacebarState}
          restartFromStopped
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
            aria-label={t("timer.ariaTime")}
            className="w-full text-center font-mono bg-transparent border-0 border-b-4 border-gray-700 focus:border-purple-500 focus:outline-none text-gray-100 py-4"
            style={{
              fontSize: TIMER_FONT_SCALE[settings.timer_font_size].timer,
              lineHeight: 1,
            }}
          />
          <p className="mt-3 text-center text-sm text-gray-500">
            {t("timer.formatHint")}
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
            {t("timer.plusTwoLabel")}
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
            {t("timer.dnfLabel")}
          </label>
          <Button
            variant="primary"
            size="lg"
            onClick={save}
            disabled={create.isPending}
          >
            {create.isPending ? t("timer.saving") : t("timer.save")}
          </Button>
        </div>
      )}

      {/* Penalty-Quick-Buttons (Phase W.penalty-quick, 2026-05-17;
          W.timer-keep-last-time 2026-05-31): erscheinen direkt nach dem Save
          unter dem Timer. Korrigieren die Penalty oder löschen den Solve ohne
          den Weg über die Letzte-Solves-Sidebar. Identisches Fragment wie im
          Zen-Overlay (siehe quickButtons). */}
      {quickButtons && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          {quickButtons}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
          {error}
        </div>
      )}
    </Card>
  );
}

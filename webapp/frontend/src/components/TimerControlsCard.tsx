// TimerControlsCard — Selektoren + Timer-Modus-Picker.
//
// Früher Teil von BigTimerInput. Mit dem Mobile-Layout-Refactor (Welle 2,
// 2026-05-16) ausgelagert, damit der Block auf Phone UNTER den TouchTimerPad
// rutscht — sodass „Tippen & halten" und das Timer-Display direkt unter dem
// Scramble sichtbar sind. Die Eingabefelder (Cube/Session/Hardware/Modus)
// braucht der User nur selten während des Solvens — sie dürfen scrollen.
//
// State-Verteilung:
//   - cubeType / sessionId / hardwareId  → controlled vom TimerTab (Parent),
//     damit alle Karten (LastSolves, Scramble, BigTimerInput) konsistent
//     auf dieselben Werte zugreifen.
//   - userPickedSession / userPickedHardware → lokal, Reset bei
//     cubeType-Wechsel (jeder Cube bekommt seinen Suggest).
//   - Feste Auswahl je Cube-Typ (W.fixed-session-hardware, Roadmap #49):
//     aus settings.fixed_selection_by_cube, schlägt den Suggest; eine
//     Hand-Auswahl im Timer bleibt vorübergehend und kann per Link als
//     feste Auswahl gemerkt werden. Logik: lib/timer-selection.ts.
//   - showNewSessionForm / newSessionName → lokal (Inline-Anlegen).

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCreateSession,
  useHardware,
  useSessions,
  useSuggestHardware,
  useSuggestSession,
} from "../lib/api";
import { COMMON_CUBE_TYPES } from "../lib/format";
import { useAppSettings } from "../lib/settings";
import {
  getFixedSelection,
  resolveSelection,
  withSelection,
  type SelectionPart,
} from "../lib/timer-selection";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { InfoButton } from "./InfoButton";
import { Button, Card } from "./ui";

interface Props {
  cubeType: string;
  onCubeTypeChange: (s: string) => void;
  sessionId: number | null;
  onSessionIdChange: (id: number | null) => void;
  hardwareId: number | null;
  onHardwareIdChange: (id: number | null) => void;
}

export function TimerControlsCard({
  cubeType,
  onCubeTypeChange,
  sessionId,
  onSessionIdChange,
  hardwareId,
  onHardwareIdChange,
}: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useAppSettings();
  const isTouchDevice = useIsTouchDevice();
  const spacebarMode = settings.spacebar_enabled;
  // W.stackmat-live-timer: Stackmat-Modus (orthogonal zu spacebar_enabled —
  // beim Rückwechsel bleibt die Tastatur-Vorliebe erhalten).
  const stackmatMode = settings.timer_input_source === "stackmat";

  // „User hat in diesem Cube manuell gewählt" → wenn ja, kein Auto-Suggest-
  // Override mehr. Reset bei Cube-Wechsel, sodass der nächste Cube wieder
  // seinen eigenen Suggest bekommt.
  const [userPickedSession, setUserPickedSession] = useState(false);
  const [userPickedHardware, setUserPickedHardware] = useState(false);

  // Inline „neue Session anlegen"
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  const createSession = useCreateSession();
  const { data: sessions } = useSessions();
  const { data: hardware } = useHardware({
    cube_type: cubeType,
    active_only: true,
  });
  const { data: sessionSuggestion } = useSuggestSession(cubeType);
  const { data: hardwareSuggestion } = useSuggestHardware(cubeType);

  // Feste Auswahl je Cube-Typ (Roadmap #49). `…FixedId` ist undefined, wenn
  // nicht fest (Auto oder feste ID gelöscht → Suggest greift, Hinweis unten).
  const fixed = getFixedSelection(settings, cubeType);
  const sessionRes = resolveSelection(
    fixed.session_mode,
    fixed.session_id,
    sessions?.map((s) => s.id),
  );
  const hardwareRes = resolveSelection(
    fixed.hardware_mode,
    fixed.hardware_id,
    hardware?.map((h) => h.id),
  );
  const sessionFixedId =
    sessionRes.kind === "fixed" ? sessionRes.id : undefined;
  const hardwareFixedId =
    hardwareRes.kind === "fixed" ? hardwareRes.id : undefined;
  const sessionFixed = sessionFixedId !== undefined;
  const hardwareFixed = hardwareFixedId !== undefined;

  // Bei Cube-Wechsel: User-Pick-Flags reset
  useEffect(() => {
    setUserPickedSession(false);
    setUserPickedHardware(false);
  }, [cubeType]);

  // Feste Auswahl anwenden (schlägt den Suggest), solange nicht von Hand
  // im Timer umgestellt. Die aktuelle ID ist bewusst Dependency: App.tsx
  // setzt die Hardware bei Cube-Wechsel NACH diesem (Kind-)Effekt auf null
  // (Schutz gegen cube-fremde Hardware) — ohne erneutes Anwenden ginge die
  // feste Auswahl dort verloren (QA-Befund W.fixed-session-hardware).
  // Kein Loop: nach dem Setzen ist id === fixedId, der Effekt tut nichts.
  useEffect(() => {
    if (
      sessionFixedId !== undefined &&
      !userPickedSession &&
      sessionId !== sessionFixedId
    ) {
      onSessionIdChange(sessionFixedId);
    }
  }, [sessionFixedId, userPickedSession, onSessionIdChange, sessionId]);

  useEffect(() => {
    if (
      hardwareFixedId !== undefined &&
      !userPickedHardware &&
      hardwareId !== hardwareFixedId
    ) {
      onHardwareIdChange(hardwareFixedId);
    }
  }, [hardwareFixedId, userPickedHardware, onHardwareIdChange, hardwareId]);

  // Session-Suggest anwenden, wenn weder fest noch manuell gewählt.
  // Race-Condition-Gate (vorher in BigTimerInput) — bei schnellem
  // Cube-Wechsel kann die alte Suggestion-Response noch ankommen während
  // cubeType schon ein anderer ist. cube_type-Match verhindert dass die
  // stale Antwort den neuen Cube überschreibt.
  useEffect(() => {
    if (
      !sessionFixed &&
      sessionSuggestion &&
      sessionSuggestion.cube_type === cubeType &&
      !userPickedSession
    ) {
      onSessionIdChange(sessionSuggestion.session_id);
    }
  }, [
    sessionFixed,
    sessionSuggestion,
    userPickedSession,
    onSessionIdChange,
    cubeType,
  ]);

  // Hardware-Suggest anwenden, wenn weder fest noch manuell gewählt.
  useEffect(() => {
    if (
      !hardwareFixed &&
      hardwareSuggestion &&
      hardwareSuggestion.cube_type === cubeType &&
      !userPickedHardware
    ) {
      onHardwareIdChange(hardwareSuggestion.hardware_id);
    }
  }, [
    hardwareFixed,
    hardwareSuggestion,
    userPickedHardware,
    cubeType,
    onHardwareIdChange,
  ]);

  /** Aktuelle Hand-Auswahl als feste Voreinstellung für diesen Cube merken. */
  function rememberAsFixed(part: SelectionPart, id: number | null) {
    setSettings(withSelection(settings, cubeType, part, "fixed", id));
    if (part === "session") setUserPickedSession(false);
    else setUserPickedHardware(false);
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
      },
    );
  }

  // Hilfs-Variablen für UI-Hints
  const suggestedSessionLabel =
    sessionSuggestion && sessionSuggestion.session_id !== null
      ? (sessions?.find((s) => s.id === sessionSuggestion.session_id)?.name ??
        null)
      : null;
  const suggestedHardwareLabel =
    hardwareSuggestion && hardwareSuggestion.hardware_id !== null
      ? (hardware?.find((h) => h.id === hardwareSuggestion.hardware_id)?.name ??
        null)
      : null;

  return (
    <Card padding="md">
      {/* Drei Selektoren — auf Phone untereinander, ab md drei Spalten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cube-Type */}
        <label className="flex flex-col text-sm text-gray-400">
          {t("timerControls.cubeType")}
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
            {t("timerControls.session")}
            {sessionFixed && !userPickedSession && (
              <span
                className="text-[10px] text-sky-400"
                title={t("timerControls.fixedTitle", { cube: cubeType })}
              >
                {t("timerControls.fixedBadge")}
              </span>
            )}
            {!sessionFixed &&
              sessionSuggestion?.session_id !== null &&
              !userPickedSession && (
                <span
                  className="text-[10px] text-emerald-400"
                  title={t("timerControls.sessionAutoTitle", {
                    cube: cubeType,
                  })}
                >
                  {t("timerControls.autoBadge")}
                </span>
              )}
          </span>
          <select
            value={sessionId === null ? "__none__" : String(sessionId)}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="__none__">{t("timerControls.sessionNone")}</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new__">{t("timerControls.sessionNew")}</option>
          </select>
          {!sessionFixed && suggestedSessionLabel && !userPickedSession && (
            <span className="mt-1 text-[11px] text-emerald-400/80 truncate">
              {t("timerControls.sessionSuggestion", {
                name: suggestedSessionLabel,
                count: sessionSuggestion?.count ?? 0,
                cube: cubeType,
              })}
            </span>
          )}
          {sessionRes.kind === "fixed-missing" && (
            <span className="mt-1 text-[11px] text-amber-400/90">
              {t("timerControls.fixedMissing")}
            </span>
          )}
          {userPickedSession && sessionFixedId !== sessionId && (
            <button
              type="button"
              onClick={() => rememberAsFixed("session", sessionId)}
              className="mt-1 self-start text-[11px] text-sky-400 hover:text-sky-300 underline"
            >
              {t("timerControls.rememberFixed", { cube: cubeType })}
            </button>
          )}
        </label>

        {/* Hardware */}
        <label className="flex flex-col text-sm text-gray-400">
          <span className="flex items-center justify-between">
            {t("timerControls.hardware")}
            {hardwareFixed && !userPickedHardware && (
              <span
                className="text-[10px] text-sky-400"
                title={t("timerControls.fixedTitle", { cube: cubeType })}
              >
                {t("timerControls.fixedBadge")}
              </span>
            )}
            {!hardwareFixed &&
              hardwareSuggestion?.hardware_id !== null &&
              !userPickedHardware && (
                <span
                  className="text-[10px] text-emerald-400"
                  title={
                    hardwareSuggestion?.reason === "most_used"
                      ? t("timerControls.hwAutoTitleMostUsed", {
                          cube: cubeType,
                        })
                      : t("timerControls.hwAutoTitleFirstActive", {
                          cube: cubeType,
                        })
                  }
                >
                  {t("timerControls.autoBadge")}
                </span>
              )}
          </span>
          <select
            value={hardwareId === null ? "__none__" : String(hardwareId)}
            onChange={(e) => {
              const v = e.target.value;
              setUserPickedHardware(true);
              onHardwareIdChange(v === "__none__" ? null : parseInt(v, 10));
            }}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-lg text-gray-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="__none__">{t("timerControls.hwNone")}</option>
            {hardware?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          {hardware && hardware.length === 0 && (
            <span className="mt-1 text-[11px] text-gray-500">
              {t("timerControls.hwNoneForCube", { cube: cubeType })}
            </span>
          )}
          {hardwareRes.kind === "fixed-missing" && (
            <span className="mt-1 text-[11px] text-amber-400/90">
              {t("timerControls.fixedMissing")}
            </span>
          )}
          {userPickedHardware && hardwareFixedId !== hardwareId && (
            <button
              type="button"
              onClick={() => rememberAsFixed("hardware", hardwareId)}
              className="mt-1 self-start text-[11px] text-sky-400 hover:text-sky-300 underline"
            >
              {t("timerControls.rememberFixed", { cube: cubeType })}
            </button>
          )}
          {!hardwareFixed && suggestedHardwareLabel && !userPickedHardware && (
            <span className="mt-1 text-[11px] text-emerald-400/80 truncate">
              {hardwareSuggestion?.reason === "most_used"
                ? t("timerControls.hwSuggestionMostUsed", {
                    name: suggestedHardwareLabel,
                    count: hardwareSuggestion.count,
                  })
                : t("timerControls.hwSuggestionOther", {
                    name: suggestedHardwareLabel,
                  })}
            </span>
          )}
        </label>
      </div>

      {/* Inline-Form für neue Session */}
      {showNewSessionForm && (
        <div className="mt-4 rounded border border-purple-500/40 bg-purple-500/5 p-3 flex gap-2 items-end flex-wrap">
          <label className="flex flex-col text-sm text-gray-300 flex-1 min-w-[12rem]">
            {t("timerControls.newSessionName")}
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
              placeholder={t("timerControls.newSessionPlaceholder", {
                cube: cubeType,
              })}
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          </label>
          <Button
            variant="primary"
            onClick={createNewSession}
            disabled={createSession.isPending || !newSessionName.trim()}
          >
            {t("timerControls.newSessionCreate")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowNewSessionForm(false);
              setNewSessionName("");
            }}
          >
            {t("timerControls.newSessionCancel")}
          </Button>
        </div>
      )}

      {/* Timer-Modus-Picker — früher nur in Verwaltung → Einstellungen
          versteckt, war nicht discoverable. Jetzt direkt im Timer-Tab.
          3 Modi: Text-Eingabe / Spacebar-WCA / Spacebar-Pragmatisch.
          Auf Touch-Devices ist Text-Mode nicht sinnvoll (Soft-Keyboard) —
          wir disablen den Button mit Hint. */}
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-300">
            {t("timerControls.timerMode")}
          </span>
          <InfoButton align="left">
            <p className="font-medium mb-1">
              {t("timerControls.modeInfoTitle")}
            </p>
            <p className="mb-2">
              <strong>{t("timerControls.modeInfoTextLabel")}</strong>{" "}
              {t("timerControls.modeInfoTextBody")}
            </p>
            <p className="mb-2">
              <strong>{t("timerControls.modeInfoWcaLabel")}</strong>{" "}
              {t("timerControls.modeInfoWcaBody")}
            </p>
            <p className="mb-2">
              <strong>{t("timerControls.modeInfoPragmaticLabel")}</strong>{" "}
              {t("timerControls.modeInfoPragmaticBody")}
            </p>
            <p>
              <strong>{t("timerControls.modeInfoStackmatLabel")}</strong>{" "}
              {t("timerControls.modeInfoStackmatBody")}
            </p>
          </InfoButton>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* Die drei Tastatur-Modi setzen zusätzlich timer_input_source auf
              "keyboard" (verlassen den Stackmat-Modus); active erst wenn NICHT
              Stackmat-Modus, damit im Stackmat-Modus nur dessen Knopf leuchtet. */}
          <ModeButton
            active={!stackmatMode && !spacebarMode}
            onClick={() =>
              setSettings({
                ...settings,
                spacebar_enabled: false,
                timer_input_source: "keyboard",
              })
            }
          >
            {t("timerControls.modeText")}
          </ModeButton>
          <ModeButton
            active={
              !stackmatMode &&
              spacebarMode &&
              settings.inspection_mode === "wca"
            }
            onClick={() =>
              setSettings({
                ...settings,
                spacebar_enabled: true,
                inspection_mode: "wca",
                timer_input_source: "keyboard",
              })
            }
          >
            {t("timerControls.modeWca")}
          </ModeButton>
          <ModeButton
            active={
              !stackmatMode &&
              spacebarMode &&
              settings.inspection_mode === "pragmatic"
            }
            onClick={() =>
              setSettings({
                ...settings,
                spacebar_enabled: true,
                inspection_mode: "pragmatic",
                timer_input_source: "keyboard",
              })
            }
          >
            {t("timerControls.modePragmatic")}
          </ModeButton>
          {/* W.stackmat-live-timer: setzt den Stackmat als Eingabequelle. Beim
              Verbinden schaltet StackmatAutoEngage ihn ohnehin automatisch. */}
          <ModeButton
            active={stackmatMode}
            onClick={() =>
              setSettings({ ...settings, timer_input_source: "stackmat" })
            }
          >
            {t("timerControls.modeStackmat")}
          </ModeButton>
        </div>
        {!spacebarMode && !stackmatMode && (
          <p className="mt-2 text-xs text-gray-500">
            {t("timerControls.tipPrefix")}{" "}
            {isTouchDevice
              ? t("timerControls.tipTouch")
              : t("timerControls.tipDesktop")}
          </p>
        )}
      </div>

      {/* W.gan-cube-auto-time-v2 (2026-05-28): SmartCubeConnect lebt
          jetzt in TimerTab direkt (App.tsx), nicht mehr hier — damit
          er auch im Fokus-Modus sichtbar ist (TimerControlsCard wird
          dort versteckt). */}
    </Card>
  );
}

// ============================================================
// Helper: Mode-Picker-Button (kleine Toggle-Buttons mit active-State)
// ============================================================
function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-purple-600 text-white shadow-sm"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

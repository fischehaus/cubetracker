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
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { InfoButton } from "./InfoButton";

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
  const { data: hardware } = useHardware({ cube_type: cubeType, active_only: true });
  const { data: sessionSuggestion } = useSuggestSession(cubeType);
  const { data: hardwareSuggestion } = useSuggestHardware(cubeType);

  // Bei Cube-Wechsel: User-Pick-Flags reset
  useEffect(() => {
    setUserPickedSession(false);
    setUserPickedHardware(false);
  }, [cubeType]);

  // Session-Suggest anwenden, wenn User nicht manuell gewählt hat.
  // Race-Condition-Gate (vorher in BigTimerInput) — bei schnellem
  // Cube-Wechsel kann die alte Suggestion-Response noch ankommen während
  // cubeType schon ein anderer ist. cube_type-Match verhindert dass die
  // stale Antwort den neuen Cube überschreibt.
  useEffect(() => {
    if (
      sessionSuggestion &&
      sessionSuggestion.cube_type === cubeType &&
      !userPickedSession
    ) {
      onSessionIdChange(sessionSuggestion.session_id);
    }
  }, [sessionSuggestion, userPickedSession, onSessionIdChange, cubeType]);

  // Hardware-Suggest anwenden, wenn User nicht manuell gewählt hat.
  useEffect(() => {
    if (
      hardwareSuggestion &&
      hardwareSuggestion.cube_type === cubeType &&
      !userPickedHardware
    ) {
      onHardwareIdChange(hardwareSuggestion.hardware_id);
    }
  }, [hardwareSuggestion, userPickedHardware, cubeType, onHardwareIdChange]);

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
      ? sessions?.find((s) => s.id === sessionSuggestion.session_id)?.name ?? null
      : null;
  const suggestedHardwareLabel =
    hardwareSuggestion && hardwareSuggestion.hardware_id !== null
      ? hardware?.find((h) => h.id === hardwareSuggestion.hardware_id)?.name ?? null
      : null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
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
            {sessionSuggestion?.session_id !== null && !userPickedSession && (
              <span
                className="text-[10px] text-emerald-400"
                title={t("timerControls.sessionAutoTitle", { cube: cubeType })}
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
          {suggestedSessionLabel && !userPickedSession && (
            <span className="mt-1 text-[11px] text-emerald-400/80 truncate">
              {t("timerControls.sessionSuggestion", {
                name: suggestedSessionLabel,
                count: sessionSuggestion?.count ?? 0,
                cube: cubeType,
              })}
            </span>
          )}
        </label>

        {/* Hardware */}
        <label className="flex flex-col text-sm text-gray-400">
          <span className="flex items-center justify-between">
            {t("timerControls.hardware")}
            {hardwareSuggestion?.hardware_id !== null && !userPickedHardware && (
              <span
                className="text-[10px] text-emerald-400"
                title={
                  hardwareSuggestion?.reason === "most_used"
                    ? t("timerControls.hwAutoTitleMostUsed", { cube: cubeType })
                    : t("timerControls.hwAutoTitleFirstActive", { cube: cubeType })
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
          {suggestedHardwareLabel && !userPickedHardware && (
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
              placeholder={t("timerControls.newSessionPlaceholder", { cube: cubeType })}
              className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
            />
          </label>
          <button
            onClick={createNewSession}
            disabled={createSession.isPending || !newSessionName.trim()}
            className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {t("timerControls.newSessionCreate")}
          </button>
          <button
            onClick={() => {
              setShowNewSessionForm(false);
              setNewSessionName("");
            }}
            className="text-base rounded bg-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-600"
          >
            {t("timerControls.newSessionCancel")}
          </button>
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
            <p>
              <strong>{t("timerControls.modeInfoPragmaticLabel")}</strong>{" "}
              {t("timerControls.modeInfoPragmaticBody")}
            </p>
          </InfoButton>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ModeButton
            active={!spacebarMode}
            onClick={() =>
              setSettings({ ...settings, spacebar_enabled: false })
            }
          >
            {t("timerControls.modeText")}
          </ModeButton>
          <ModeButton
            active={spacebarMode && settings.inspection_mode === "wca"}
            onClick={() =>
              setSettings({
                ...settings,
                spacebar_enabled: true,
                inspection_mode: "wca",
              })
            }
          >
            {t("timerControls.modeWca")}
          </ModeButton>
          <ModeButton
            active={spacebarMode && settings.inspection_mode === "pragmatic"}
            onClick={() =>
              setSettings({
                ...settings,
                spacebar_enabled: true,
                inspection_mode: "pragmatic",
              })
            }
          >
            {t("timerControls.modePragmatic")}
          </ModeButton>
        </div>
        {!spacebarMode && (
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
    </div>
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

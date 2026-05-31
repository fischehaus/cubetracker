// SettingsPanel (Phase 8.2 + W.8) — „Einstellungen"-Subtab in Konto & Daten.
// AccountSettingsPanel (seit W.ia-profil-bereich: NUR Sicherheit — Passwort/
// Email/Account-Löschen; die Identitäts-Felder leben jetzt im Profil) oben,
// darunter Aussehen/Skins + App-/Timer-/Drill-Settings.

import { useTranslation } from "react-i18next";
import { AccountSettingsPanel } from "./AccountSettingsPanel";
import { InfoButton } from "./InfoButton";
import { SkinPickerCard } from "./SkinPickerCard";
import {
  FONT_SIZE_LABELS,
  SETTINGS_DEFAULTS,
  type TimerFontSize,
  useAppSettings,
} from "../lib/settings";

const MAX_PHASES = 8;

export function SettingsPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useAppSettings();

  function updatePhaseCount(n: number) {
    const clamped = Math.max(1, Math.min(MAX_PHASES, n));
    const cur = settings.phase_names;
    let next: string[];
    if (clamped === cur.length) return;
    if (clamped > cur.length) {
      // mehr — auffuellen mit generischen Namen
      next = [
        ...cur,
        ...Array.from({ length: clamped - cur.length }, (_, i) => `Phase ${cur.length + i + 1}`),
      ];
    } else {
      next = cur.slice(0, clamped);
    }
    setSettings({ ...settings, phase_names: next });
  }

  function updatePhaseName(idx: number, name: string) {
    const next = [...settings.phase_names];
    next[idx] = name;
    setSettings({ ...settings, phase_names: next });
  }

  function reset() {
    if (confirm(t("settingsPanel.resetConfirm"))) {
      setSettings(SETTINGS_DEFAULTS);
    }
  }

  return (
    <div className="space-y-4">
      {/* W.ia-profil-bereich: AccountSettingsPanel = nur noch Sicherheit
          (Passwort/Email/Account-Löschen). Identität → Profil (UserMenu). */}
      <AccountSettingsPanel />

      {/* W.skin-cyberpunk-mvp: Skin-Picker (Background-Bilder).
       * Geräte-spezifisch via localStorage — analog zu den anderen
       * App-Settings darunter. Bewusst oben unter Account einsortiert
       * weil "Aussehen" stark sichtbar ist und unter Setup/Style-Themen
       * gehört, nicht unter Timer-Verhalten. */}
      <SkinPickerCard />

      {/* App-Settings (Spacebar, Drills, Font-Size) — Geräte-spezifisch */}
      <Section
        title={t("settingsPanel.spacebarTitle")}
        info={
          <>
            <p className="font-medium mb-1">
              {t("settingsPanel.spacebarInfoTitle")}
            </p>
            <p>{t("settingsPanel.spacebarInfoBody")}</p>
          </>
        }
      >
        <Toggle
          label={t("settingsPanel.spacebarEnableLabel")}
          hint={t("settingsPanel.spacebarEnableHint")}
          value={settings.spacebar_enabled}
          onChange={(v) => setSettings({ ...settings, spacebar_enabled: v })}
        />
        <NumberField
          label={t("settingsPanel.spacebarHoldTimeLabel")}
          hint={t("settingsPanel.spacebarHoldTimeHint")}
          value={settings.hold_time_ms}
          min={100}
          max={2000}
          step={50}
          onChange={(v) => setSettings({ ...settings, hold_time_ms: v })}
          disabled={!settings.spacebar_enabled}
        />
      </Section>

      {/* Inspection */}
      <Section title={t("settingsPanel.inspectionTitle")}>
        <Toggle
          label={t("settingsPanel.inspectionEnableLabel")}
          hint={t("settingsPanel.inspectionEnableHint")}
          value={settings.inspection_enabled}
          onChange={(v) => setSettings({ ...settings, inspection_enabled: v })}
          disabled={!settings.spacebar_enabled}
        />

        {/* Inspection-Mode-Toggle */}
        <div className={!settings.spacebar_enabled || !settings.inspection_enabled ? "opacity-50" : ""}>
          <div className="text-base text-gray-100 mb-1">
            {t("settingsPanel.inspectionModeHeading")}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            <strong className="text-gray-300">
              {t("settingsPanel.inspectionModeWcaIntro")}
            </strong>{" "}
            {t("settingsPanel.inspectionModeWcaDesc")}
            <br />
            <strong className="text-gray-300">
              {t("settingsPanel.inspectionModePragmaticIntro")}
            </strong>{" "}
            {t("settingsPanel.inspectionModePragmaticDesc")}
            <br />
            <span className="text-gray-500">
              {t("settingsPanel.inspectionModeNote")}
            </span>
          </div>
          <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1 inline-flex">
            <button
              onClick={() => setSettings({ ...settings, inspection_mode: "wca" })}
              disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                settings.inspection_mode === "wca"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t("settingsPanel.inspectionModeWcaBtn")}
            </button>
            <button
              onClick={() => setSettings({ ...settings, inspection_mode: "pragmatic" })}
              disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                settings.inspection_mode === "pragmatic"
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t("settingsPanel.inspectionModePragmaticBtn")}
            </button>
          </div>
        </div>

        <NumberField
          label={t("settingsPanel.inspectionDurationLabel")}
          hint={t("settingsPanel.inspectionDurationHint")}
          value={settings.inspection_seconds}
          min={5}
          max={60}
          step={1}
          onChange={(v) => setSettings({ ...settings, inspection_seconds: v })}
          disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
        />
        <Toggle
          label={t("settingsPanel.inspectionSoundLabel")}
          hint={t("settingsPanel.inspectionSoundHint")}
          value={settings.sound_enabled}
          onChange={(v) => setSettings({ ...settings, sound_enabled: v })}
          disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">
            {t("settingsPanel.inspectionAudioModeLabel")}
          </span>
          <select
            value={settings.inspection_audio_mode ?? "beep"}
            onChange={(e) =>
              setSettings({
                ...settings,
                inspection_audio_mode: e.target.value as
                  | "beep"
                  | "de"
                  | "en"
                  | "off",
              })
            }
            disabled={
              !settings.spacebar_enabled ||
              !settings.inspection_enabled ||
              !settings.sound_enabled
            }
            className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none disabled:opacity-50 max-w-xs"
          >
            <option value="beep">{t("settingsPanel.inspectionAudioModeBeep")}</option>
            <option value="de">{t("settingsPanel.inspectionAudioModeDe")}</option>
            <option value="en">{t("settingsPanel.inspectionAudioModeEn")}</option>
            <option value="off">{t("settingsPanel.inspectionAudioModeOff")}</option>
          </select>
          <span className="text-xs text-gray-500">
            {t("settingsPanel.inspectionAudioModeNote")}
          </span>
        </label>
      </Section>

      {/* Multi-Phase-Splits */}
      <Section title={t("settingsPanel.splitsTitle")}>
        <Toggle
          label={t("settingsPanel.splitsEnableLabel")}
          hint={t("settingsPanel.splitsEnableHint")}
          value={settings.splits_enabled}
          onChange={(v) => setSettings({ ...settings, splits_enabled: v })}
          disabled={!settings.spacebar_enabled}
        />
        <NumberField
          label={t("settingsPanel.splitsPhaseCountLabel")}
          hint={t("settingsPanel.splitsPhaseCountHint", { max: MAX_PHASES })}
          value={settings.phase_names.length}
          min={1}
          max={MAX_PHASES}
          step={1}
          onChange={updatePhaseCount}
          disabled={!settings.spacebar_enabled || !settings.splits_enabled}
        />
        <div>
          <div className="text-sm text-gray-300 mb-2">
            {t("settingsPanel.splitsPhaseNamesHeading")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settings.phase_names.map((name, i) => (
              <input
                key={i}
                type="text"
                value={name}
                onChange={(e) => updatePhaseName(i, e.target.value)}
                disabled={!settings.spacebar_enabled || !settings.splits_enabled}
                placeholder={`Phase ${i + 1}`}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Schrift-Größe Timer + Scramble */}
      <Section title={t("settingsPanel.timerFontTitle")}>
        <div>
          <div className="text-sm text-gray-300 mb-2">
            {t("settingsPanel.timerFontDesc")}
          </div>
          <FontSizeToggle
            value={settings.timer_font_size}
            onChange={(fs) => setSettings({ ...settings, timer_font_size: fs })}
          />
        </div>
      </Section>

      {/* Scramble-Bild (Phase W.scramble-image, 2026-05-17) */}
      <Section title={t("settingsPanel.scrambleImageTitle")}>
        <Toggle
          label={t("settingsPanel.scrambleImageEnableLabel")}
          hint={t("settingsPanel.scrambleImageEnableHint")}
          value={settings.show_scramble_image}
          onChange={(v) => setSettings({ ...settings, show_scramble_image: v })}
        />
      </Section>

      {/* Schrift-Größe Drill-Fenster (User-Wunsch) */}
      <Section title={t("settingsPanel.drillFontTitle")}>
        <div>
          <div className="text-sm text-gray-300 mb-2">
            {t("settingsPanel.drillFontDesc")}
          </div>
          <FontSizeToggle
            value={settings.drill_font_size}
            onChange={(fs) => setSettings({ ...settings, drill_font_size: fs })}
          />
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          onClick={reset}
          className="text-sm rounded bg-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-600"
        >
          {t("settingsPanel.resetButton")}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Form-Helpers
// ============================================================

function FontSizeToggle({
  value,
  onChange,
}: {
  value: TimerFontSize;
  onChange: (fs: TimerFontSize) => void;
}) {
  return (
    <div className="flex gap-1 rounded border border-gray-700 bg-gray-800 p-1 inline-flex flex-wrap">
      {/* W.timer-display-size-v2: 7 Stufen statt 5 — xxxl + xxxxl ergaenzt. */}
      {(["sm", "md", "lg", "xl", "xxl", "xxxl", "xxxxl"] as TimerFontSize[]).map((fs) => {
        const active = value === fs;
        return (
          <button
            key={fs}
            onClick={() => onChange(fs)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {FONT_SIZE_LABELS[fs]}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  info,
  children,
}: {
  title: string;
  info?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
        {info && <InfoButton>{info}</InfoButton>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ label, hint, value, onChange, disabled }: ToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 accent-purple-500 w-4 h-4"
      />
      <div className="flex-1">
        <div className="text-base text-gray-100">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function NumberField({ label, hint, value, min, max, step, onChange, disabled }: NumberFieldProps) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <div className="text-base text-gray-100">{label}</div>
      {hint && <div className="text-xs text-gray-500 mb-1">{hint}</div>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-base text-gray-100 focus:border-purple-500 focus:outline-none w-32"
      />
    </label>
  );
}

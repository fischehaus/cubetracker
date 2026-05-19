// SettingsPanel (Phase 8.2 + W.8) — Sub-Tab in VERWALTUNG.
// W.8: AccountSettingsPanel oben drüber gerendert (Profil + Passwort +
// Email + Account-Löschen). Drunter dann die App-/Timer-/Drill-Settings.

import { AccountSettingsPanel } from "./AccountSettingsPanel";
import { InfoButton } from "./InfoButton";
import {
  FONT_SIZE_LABELS,
  SETTINGS_DEFAULTS,
  type TimerFontSize,
  useAppSettings,
} from "../lib/settings";

const MAX_PHASES = 8;

export function SettingsPanel() {
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
    if (confirm("Alle Einstellungen auf Standard zurücksetzen?")) {
      setSettings(SETTINGS_DEFAULTS);
    }
  }

  return (
    <div className="space-y-4">
      {/* W.8: Account-Settings (Profil, Passwort, Email, Account-Löschen) */}
      <AccountSettingsPanel />

      {/* App-Settings (Spacebar, Drills, Font-Size) — Geräte-spezifisch */}
      <Section
        title="Spacebar-Timer"
        info={
          <>
            <p className="font-medium mb-1">Spacebar-Timer-Settings</p>
            <p>
              Tiefere Einstellungen für den Spacebar-Timer. Mode (WCA vs
              Pragmatisch) kann auch direkt im Timer-Tab gewählt werden.
              Inspection-Dauer, Hold-Time, Sound-Signale, Phase-Splits sind
              hier konfigurierbar.
            </p>
          </>
        }
      >
        <Toggle
          label="Spacebar-Modus aktivieren"
          hint="WCA-Standard-Flow: Space halten → loslassen startet, Space drücken stoppt. Klassischer Text-Input bleibt parallel verfügbar."
          value={settings.spacebar_enabled}
          onChange={(v) => setSettings({ ...settings, spacebar_enabled: v })}
        />
        <NumberField
          label="Hold-Time bevor 'go' (ms)"
          hint="Wie lange Space gehalten werden muss, bis er grün wird. WCA-Empfehlung 550ms."
          value={settings.hold_time_ms}
          min={100}
          max={2000}
          step={50}
          onChange={(v) => setSettings({ ...settings, hold_time_ms: v })}
          disabled={!settings.spacebar_enabled}
        />
      </Section>

      {/* Inspection */}
      <Section title="Inspection">
        <Toggle
          label="Inspection-Phase aktivieren"
          hint="Vor dem Solve läuft ein Countdown."
          value={settings.inspection_enabled}
          onChange={(v) => setSettings({ ...settings, inspection_enabled: v })}
          disabled={!settings.spacebar_enabled}
        />

        {/* Inspection-Mode-Toggle */}
        <div className={!settings.spacebar_enabled || !settings.inspection_enabled ? "opacity-50" : ""}>
          <div className="text-base text-gray-100 mb-1">Inspection-Verhalten</div>
          <div className="text-xs text-gray-500 mb-2">
            <strong className="text-gray-300">WCA-Empfehlung:</strong> Single Space → Solve in „Halten"
            (loslassen startet); +2 ab 15s, DNF ab 17s.<br />
            <strong className="text-gray-300">Pragmatisch:</strong> Single Space (250ms Latenz) startet
            Solve direkt; Double-Tap = Reset; Auto-DNF bei 0.
            <br />
            <span className="text-gray-500">
              Hinweis: dein Cube muss nicht gleichzeitig auf der Tastatur liegen — Pause ist OK.
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
              WCA-Empfehlung
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
              Pragmatisch
            </button>
          </div>
        </div>

        <NumberField
          label="Inspection-Dauer (Sekunden)"
          hint="WCA-Standard 15s."
          value={settings.inspection_seconds}
          min={5}
          max={60}
          step={1}
          onChange={(v) => setSettings({ ...settings, inspection_seconds: v })}
          disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
        />
        <Toggle
          label="Sound-Signale (8s + 12s Warnung)"
          hint="Audio-Signal bei 8s + dringendes Doppel-Signal bei 12s. Modus unten wählbar."
          value={settings.sound_enabled}
          onChange={(v) => setSettings({ ...settings, sound_enabled: v })}
          disabled={!settings.spacebar_enabled || !settings.inspection_enabled}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">Audio-Modus für Inspection-Warnings</span>
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
            <option value="beep">🔔 Sinus-Beep (default)</option>
            <option value="de">🇩🇪 Stimme: Deutsch ("acht", "zwölf")</option>
            <option value="en">🇬🇧 Voice: English ("eight", "twelve")</option>
            <option value="off">🔇 Aus (kein Audio für 8s/12s)</option>
          </select>
          <span className="text-xs text-gray-500">
            Voice-Modi nutzen das Browser-TTS — funktioniert offline +
            ohne Asset, Stimme abhängig von Browser/OS.
          </span>
        </label>
      </Section>

      {/* Multi-Phase-Splits */}
      <Section title="Multi-Phase-Splits">
        <Toggle
          label="Splits aktivieren"
          hint="Mehrere Spacebar-Presses pro Solve, jeder Press registriert eine Zwischenzeit. Klassische CFOP-Aufteilung: Cross / F2L / OLL / PLL."
          value={settings.splits_enabled}
          onChange={(v) => setSettings({ ...settings, splits_enabled: v })}
          disabled={!settings.spacebar_enabled}
        />
        <NumberField
          label="Anzahl Phasen"
          hint={`1-${MAX_PHASES} Phasen. 1 = klassischer Solve ohne Splits.`}
          value={settings.phase_names.length}
          min={1}
          max={MAX_PHASES}
          step={1}
          onChange={updatePhaseCount}
          disabled={!settings.spacebar_enabled || !settings.splits_enabled}
        />
        <div>
          <div className="text-sm text-gray-300 mb-2">Phasen-Namen</div>
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
      <Section title="Schrift-Größe — Timer & Scramble">
        <div>
          <div className="text-sm text-gray-300 mb-2">
            Wirkt auf das Eingabefeld im /timer und auf die Scramble-Anzeige.
          </div>
          <FontSizeToggle
            value={settings.timer_font_size}
            onChange={(fs) => setSettings({ ...settings, timer_font_size: fs })}
          />
        </div>
      </Section>

      {/* Scramble-Bild (Phase W.scramble-image, 2026-05-17) */}
      <Section title="Scramble-Bild (2D-Net)">
        <Toggle
          label="2D-Net unter dem Scramble anzeigen"
          hint={`Cube-Vorschau (Cross-Layout) direkt unter der Notation. Hilft beim Verifizieren ob du den Scramble korrekt ausgeführt hast. Aktuell nur für 3x3 — andere Cube-Types zeigen kein Bild. Auch direkt im /timer-Tab toggle-bar (Knopf "Bild an/aus" neben "Eigene" / "Skip").`}
          value={settings.show_scramble_image}
          onChange={(v) => setSettings({ ...settings, show_scramble_image: v })}
        />
      </Section>

      {/* Schrift-Größe Drill-Fenster (User-Wunsch) */}
      <Section title="Schrift-Größe — Drill-Fenster">
        <div>
          <div className="text-sm text-gray-300 mb-2">
            Gilt für ALLE Drill-Fenster im Trainer (aktuell: PLL/OLL-Drill).
            Separat einstellbar von der Timer-Größe.
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
          Auf Standard zurücksetzen
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
      {(["sm", "md", "lg", "xl", "xxl"] as TimerFontSize[]).map((fs) => {
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

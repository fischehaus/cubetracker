// FixedSelectionSettings — feste Session-/Hardware-Voreinstellung je Cube-Typ
// (W.fixed-session-hardware, Roadmap #49, 2026-11-07).
//
// Cube-Typ wählen → für Session und Hardware je „Automatisch" (Suggest:
// meiste Solves) oder „Fest" (eigene Auswahl). Darunter eine Übersicht aller
// fest eingestellten Cube-Typen. Gespeichert pro Gerät (localStorage,
// lib/settings.ts); Logik in lib/timer-selection.ts.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHardware, useSessions } from "../lib/api";
import { COMMON_CUBE_TYPES } from "../lib/format";
import type { AppSettings, SelectionMode } from "../lib/settings";
import {
  cubeTypesWithFixedSelection,
  getFixedSelection,
  withSelection,
  type SelectionPart,
} from "../lib/timer-selection";

interface Props {
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
}

const NONE = "__none__";

export function FixedSelectionSettings({ settings, setSettings }: Props) {
  const { t } = useTranslation();
  const [cubeType, setCubeType] = useState<string>("3x3");
  const { data: sessions } = useSessions();
  const { data: hardware } = useHardware({
    cube_type: cubeType,
    active_only: true,
  });
  const fixed = getFixedSelection(settings, cubeType);
  const configured = cubeTypesWithFixedSelection(settings);

  function update(part: SelectionPart, mode: SelectionMode, id: number | null) {
    setSettings(withSelection(settings, cubeType, part, mode, id));
  }

  function firstId(list: { id: number }[] | undefined): number | null {
    return list && list.length > 0 ? list[0].id : null;
  }

  const sessionName = (id: number | null) =>
    id === null
      ? t("fixedSelection.none")
      : (sessions?.find((s) => s.id === id)?.name ??
        t("fixedSelection.deleted"));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">{t("fixedSelection.intro")}</p>

      <label className="flex flex-col text-sm text-gray-400 max-w-xs">
        {t("fixedSelection.cubeType")}
        <select
          value={cubeType}
          onChange={(e) => setCubeType(e.target.value)}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          {COMMON_CUBE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <SelectionRow
        label={t("fixedSelection.session")}
        mode={fixed.session_mode}
        value={fixed.session_id}
        options={(sessions ?? []).map((s) => ({ id: s.id, name: s.name }))}
        noneLabel={t("fixedSelection.none")}
        autoLabel={t("fixedSelection.auto")}
        fixedLabel={t("fixedSelection.fixed")}
        onMode={(m) =>
          update("session", m, m === "fixed" ? firstId(sessions) : null)
        }
        onValue={(id) => update("session", "fixed", id)}
      />

      <SelectionRow
        label={t("fixedSelection.hardware")}
        mode={fixed.hardware_mode}
        value={fixed.hardware_id}
        options={(hardware ?? []).map((h) => ({ id: h.id, name: h.name }))}
        noneLabel={t("fixedSelection.none")}
        autoLabel={t("fixedSelection.auto")}
        fixedLabel={t("fixedSelection.fixed")}
        onMode={(m) =>
          update("hardware", m, m === "fixed" ? firstId(hardware) : null)
        }
        onValue={(id) => update("hardware", "fixed", id)}
        emptyHint={
          hardware && hardware.length === 0
            ? t("fixedSelection.noHardware", { cube: cubeType })
            : undefined
        }
      />

      {configured.length > 0 && (
        <div className="rounded border border-gray-700 bg-gray-800/40 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            {t("fixedSelection.overview")}
          </div>
          <ul className="space-y-1 text-sm text-gray-300">
            {configured.map((ct) => {
              const f = getFixedSelection(settings, ct);
              return (
                <li key={ct}>
                  <button
                    type="button"
                    onClick={() => setCubeType(ct)}
                    className="font-medium text-gray-100 hover:text-purple-300 underline-offset-2 hover:underline"
                  >
                    {ct}
                  </button>
                  {": "}
                  {t("fixedSelection.session")}{" "}
                  {f.session_mode === "fixed"
                    ? sessionName(f.session_id)
                    : t("fixedSelection.auto")}
                  {" · "}
                  {t("fixedSelection.hardware")}{" "}
                  {f.hardware_mode === "fixed"
                    ? t("fixedSelection.fixed")
                    : t("fixedSelection.auto")}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SelectionRow({
  label,
  mode,
  value,
  options,
  noneLabel,
  autoLabel,
  fixedLabel,
  onMode,
  onValue,
  emptyHint,
}: {
  label: string;
  mode: SelectionMode;
  value: number | null;
  options: { id: number; name: string }[];
  noneLabel: string;
  autoLabel: string;
  fixedLabel: string;
  onMode: (m: SelectionMode) => void;
  onValue: (id: number | null) => void;
  emptyHint?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-24 text-sm text-gray-300">{label}</span>
      <div className="inline-flex rounded border border-gray-700 bg-gray-800 p-1">
        {(["auto", "fixed"] as SelectionMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            aria-pressed={mode === m}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === m
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {m === "auto" ? autoLabel : fixedLabel}
          </button>
        ))}
      </div>
      {mode === "fixed" && (
        <select
          aria-label={label}
          value={value === null ? NONE : String(value)}
          onChange={(e) =>
            onValue(
              e.target.value === NONE ? null : parseInt(e.target.value, 10),
            )
          }
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none sm:min-w-[12rem]"
        >
          <option value={NONE}>{noneLabel}</option>
          {value !== null && !options.some((o) => o.id === value) && (
            <option value={String(value)}>—</option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
      {emptyHint && <span className="text-xs text-gray-500">{emptyHint}</span>}
    </div>
  );
}

// Feste vs. automatische Session-/Hardware-Auswahl je Cube-Typ
// (W.fixed-session-hardware, Roadmap #49, 2026-11-07).
//
// Pure Funktionen — TimerControlsCard und EinstellungenView nutzen sie,
// Tests in timer-selection.test.ts.

import type { AppSettings, FixedSelection, SelectionMode } from "./settings";

export type SelectionPart = "session" | "hardware";

export const AUTO_SELECTION: FixedSelection = {
  session_mode: "auto",
  session_id: null,
  hardware_mode: "auto",
  hardware_id: null,
};

function sanitizeMode(v: unknown): SelectionMode {
  return v === "fixed" ? "fixed" : "auto";
}

function sanitizeId(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}

/** Eintrag für einen Cube-Typ; fehlende/kaputte Werte → Auto. */
export function getFixedSelection(
  settings: AppSettings,
  cubeType: string,
): FixedSelection {
  const raw = (settings.fixed_selection_by_cube ?? {})[cubeType] as
    Partial<FixedSelection> | undefined;
  if (!raw || typeof raw !== "object") return AUTO_SELECTION;
  return {
    session_mode: sanitizeMode(raw.session_mode),
    session_id: sanitizeId(raw.session_id),
    hardware_mode: sanitizeMode(raw.hardware_mode),
    hardware_id: sanitizeId(raw.hardware_id),
  };
}

/** Neue Settings mit geändertem Modus/ID für einen Teil eines Cube-Typs.
 *  Ein Eintrag, der danach komplett Auto ist, wird entfernt. */
export function withSelection(
  settings: AppSettings,
  cubeType: string,
  part: SelectionPart,
  mode: SelectionMode,
  id: number | null,
): AppSettings {
  const cur = getFixedSelection(settings, cubeType);
  const next: FixedSelection =
    part === "session"
      ? { ...cur, session_mode: mode, session_id: mode === "fixed" ? id : null }
      : {
          ...cur,
          hardware_mode: mode,
          hardware_id: mode === "fixed" ? id : null,
        };
  const map = { ...(settings.fixed_selection_by_cube ?? {}) };
  if (next.session_mode === "auto" && next.hardware_mode === "auto") {
    delete map[cubeType];
  } else {
    map[cubeType] = next;
  }
  return { ...settings, fixed_selection_by_cube: map };
}

export type ResolvedSelection =
  | { kind: "auto" }
  | { kind: "fixed"; id: number | null }
  /** Feste ID existiert nicht mehr (gelöscht/inaktiv) → Auto + Hinweis. */
  | { kind: "fixed-missing" };

/**
 * Entscheidet, was der Timer setzt. `availableIds` = aktuell wählbare IDs;
 * `undefined` = Liste lädt noch → solange „fixed" ohne Prüfung (kein Flackern
 * über den Suggest).
 */
export function resolveSelection(
  mode: SelectionMode,
  fixedId: number | null,
  availableIds: number[] | undefined,
): ResolvedSelection {
  if (mode !== "fixed") return { kind: "auto" };
  if (fixedId === null) return { kind: "fixed", id: null };
  if (availableIds === undefined || availableIds.includes(fixedId)) {
    return { kind: "fixed", id: fixedId };
  }
  return { kind: "fixed-missing" };
}

/** Cube-Typen mit mindestens einem festen Teil (für die Übersicht). */
export function cubeTypesWithFixedSelection(settings: AppSettings): string[] {
  return Object.keys(settings.fixed_selection_by_cube ?? {}).filter((ct) => {
    const s = getFixedSelection(settings, ct);
    return s.session_mode === "fixed" || s.hardware_mode === "fixed";
  });
}

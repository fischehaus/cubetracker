// ScrambleCard (Phase 8a, erweitert in Welle 3 / 2026-05-16) —
// zentrale Scramble-Anzeige im TIMER.
//
// Verhalten:
//  - Beim Mount + bei cube_type-Wechsel + nach Save: neuer Scramble
//    (passend zum aktuellen Cube-Type, falls kein User-Override)
//  - „Skip"-Button generiert manuell einen neuen Scramble
//  - Welle 3: User kann den Scramble-Typ aendern. Zwei Kategorien:
//      • WCA — alle offiziellen Wettkampf-Cubes (3x3, 4x4, Pyraminx, …)
//      • Inoffiziell — Ivy, Gear, Redi, Master Pyra/Skewb, FTO
//    Default folgt cubeType (z.B. „3x3" → WCA + 333). User-Override
//    bleibt bis zum naechsten cubeType-Wechsel, dann auto-reset.
//  - Session.scramble_type-Override (Phase 8b, z.B. „pll") schlaegt
//    cubeType — User-Picker-Override schlaegt beides (volles Steuern).
//
// Monospace + grosser Font fuer die Notation. Der Parent (TimerTab)
// steuert via `regenerationSeed`-prop wann ein neuer Scramble faellig
// ist (z.B. solve-counter erhoehen → re-gen).

import { useEffect, useState } from "react";
import {
  cubeTypeToScrambowType,
  defaultScrambleTypeForCube,
  generateScramble,
  resolveScrambleTypeOverride,
  UNOFFICIAL_SCRAMBLE_TYPES,
  WCA_SCRAMBLE_TYPES,
  type ScrambleTypeInfo,
} from "../lib/scramble";
import { TIMER_FONT_SCALE, useAppSettings } from "../lib/settings";
import { InfoButton } from "./InfoButton";

interface Props {
  /** App-cube_type ("3x3", "Pyraminx", …) — bestimmt den Default. */
  cubeType: string;
  /**
   * Optionaler Scramble-Type-Override aus Session.scramble_type
   * (Phase 8b). Wenn gesetzt, hat dieser Vorrang vor cubeType.
   * User-Picker-Override schlaegt aber auch das hier.
   */
  scrambleTypeOverride?: string | null;
  /** Aenderung dieser Zahl loest re-generation aus (z.B. nach save). */
  regenerationSeed: number;
  /**
   * Callback: bei jedem neu erzeugten Scramble — der Parent
   * cached den string, um ihn beim Save mit-zu-speichern.
   */
  onScrambleGenerated: (scramble: string) => void;
}

type Category = "wca" | "unofficial";

/** Hilfs-Funktion: ist ein Code in der WCA- oder Inoffiziell-Liste? */
function categoryFor(code: string): Category {
  return WCA_SCRAMBLE_TYPES.some((t) => t.code === code) ? "wca" : "unofficial";
}

/** UI-Label fuer einen Code aus den beiden Listen (Fallback = Code). */
function labelFor(code: string): string {
  const all: ScrambleTypeInfo[] = [
    ...WCA_SCRAMBLE_TYPES,
    ...UNOFFICIAL_SCRAMBLE_TYPES,
  ];
  return all.find((t) => t.code === code)?.label ?? code;
}

export function ScrambleCard({
  cubeType,
  scrambleTypeOverride,
  regenerationSeed,
  onScrambleGenerated,
}: Props) {
  const [scramble, setScramble] = useState<string>("");
  const [skipCounter, setSkipCounter] = useState(0);
  const [settings] = useAppSettings();
  const fontPx = TIMER_FONT_SCALE[settings.timer_font_size].scramble;

  // User-Override aus dem Picker. null = „folgt automatisch dem Cube".
  // Wir resetten ihn bei cubeType-Wechsel, sodass der naechste Cube
  // wieder seinen passenden Default zeigt.
  const [userPickedType, setUserPickedType] = useState<string | null>(null);
  useEffect(() => {
    setUserPickedType(null);
  }, [cubeType]);

  // Override-Resolution: Session-scramble_type → scrambow-Code, falls
  // bekannt. csTimer-Codes (444wca, pyrso, …) werden hier in scrambow-
  // Codes uebersetzt — sonst leerer Scramble fuer importierte Sessions.
  const resolvedSessionOverride = scrambleTypeOverride
    ? resolveScrambleTypeOverride(scrambleTypeOverride)
    : null;

  // Effektiver Typ: User-Pick > Session-Override > cube_type-Default
  const effectiveType =
    userPickedType ??
    resolvedSessionOverride ??
    cubeTypeToScrambowType(cubeType);

  // Kategorie fuer den Toggle — derived aus dem effektivenType.
  const effectiveCategory = categoryFor(effectiveType);

  useEffect(() => {
    const next = generateScramble(effectiveType);
    setScramble(next);
    onScrambleGenerated(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, regenerationSeed, skipCounter]);

  /** Toggle WCA ↔ Inoffiziell. Switcht auf den ersten Eintrag der Ziel-
   *  Kategorie ODER auf den Cube-Default, falls dieser zur Ziel-Kategorie
   *  passt (z.B. WCA-Toggle bei 3x3-Cube → 333 statt 222). */
  function setCategory(cat: Category) {
    if (cat === "wca") {
      const cubeDefault = defaultScrambleTypeForCube(cubeType);
      const defaultIsWca = categoryFor(cubeDefault) === "wca";
      setUserPickedType(defaultIsWca ? cubeDefault : WCA_SCRAMBLE_TYPES[0].code);
    } else {
      setUserPickedType(UNOFFICIAL_SCRAMBLE_TYPES[0].code);
    }
  }

  const isOverridden = userPickedType !== null;
  const typesInCategory =
    effectiveCategory === "wca" ? WCA_SCRAMBLE_TYPES : UNOFFICIAL_SCRAMBLE_TYPES;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 uppercase tracking-wide">
            Scramble{" "}
            <span className="text-gray-600 normal-case tracking-normal">
              ({labelFor(effectiveType)})
            </span>
          </span>
          <InfoButton>
            <p className="font-medium mb-1">Scramble</p>
            <p className="mb-2">
              Zufaellige Verdrehungs-Sequenz nach WCA-Notation. Buchstaben =
              Seite (R, L, U, D, F, B), Strich („L'") = gegen den Uhrzeiger,
              Zahl 2 = doppelte Drehung. Wende den Scramble auf einen
              geloesten Cube an — dann sind alle Loesungen unter denselben
              Bedingungen vergleichbar. „Skip" wirft einen neuen.
            </p>
            <p>
              <strong>Picker:</strong> Standard ist der passende Scramble zum
              gewaehlten Cube-Type. Toggle „WCA" ↔ „Inoffiziell" + Dropdown
              waehlt einen anderen Typ. Wechsel des Cube-Types setzt den
              Override automatisch zurueck.
            </p>
          </InfoButton>
        </div>
        <button
          onClick={() => setSkipCounter((c) => c + 1)}
          className="text-sm rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          title="Diesen Scramble ueberspringen, neuen generieren"
        >
          ⏭ Skip
        </button>
      </div>

      {/* Picker-Zeile: Toggle + Dropdown + Auto-Reset-Button.
          Flex-wrap, damit's auf Phone bei Bedarf umbricht. */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <div
          className="inline-flex rounded border border-gray-700 overflow-hidden text-xs"
          role="radiogroup"
          aria-label="Scramble-Kategorie"
        >
          <CategoryButton
            active={effectiveCategory === "wca"}
            onClick={() => setCategory("wca")}
          >
            WCA
          </CategoryButton>
          <CategoryButton
            active={effectiveCategory === "unofficial"}
            onClick={() => setCategory("unofficial")}
          >
            Inoffiziell
          </CategoryButton>
        </div>
        <label className="text-xs text-gray-500 sr-only" htmlFor="scramble-type-picker">
          Scramble-Typ
        </label>
        <select
          id="scramble-type-picker"
          value={effectiveType}
          onChange={(e) => setUserPickedType(e.target.value)}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:border-purple-500 focus:outline-none"
        >
          {typesInCategory.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
        {isOverridden && (
          <button
            type="button"
            onClick={() => setUserPickedType(null)}
            className="text-xs rounded border border-gray-700 px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            title={`Zurueck zum Default fuer ${cubeType}`}
          >
            ↺ auto
          </button>
        )}
      </div>

      <div
        className="font-mono text-gray-100 leading-relaxed break-words select-all"
        style={{ fontSize: fontPx }}
        aria-live="polite"
      >
        {scramble || (
          <span className="text-gray-500 text-base">
            Scramble nicht verfuegbar fuer diesen Typ.
          </span>
        )}
      </div>
    </div>
  );
}

/** Kleiner Pill-Button fuer die Kategorie-Toggle. */
function CategoryButton({
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
      role="radio"
      aria-checked={active}
      className={`px-2.5 py-1 transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

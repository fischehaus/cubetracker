// ScrambleCard (Phase 8a) — zentrale Scramble-Anzeige im TIMER.
//
// Verhalten:
//  - Beim Mount + bei cube_type-Wechsel + nach Save: neuer Scramble
//  - „Skip"-Button generiert manuell einen neuen Scramble
//  - Monospace + grosser Font, damit der User die Notation
//    zaehlbar sehen kann
//
// Der Parent (BigTimerInput) steuert, wann ein neuer Scramble
// faellig ist, via `seed`-prop (z.B. solve-counter erhoehen → re-gen).

import { useEffect, useState } from "react";
import {
  cubeTypeToScrambowType,
  generateScramble,
  resolveScrambleTypeOverride,
} from "../lib/scramble";

interface Props {
  /** App-cube_type ("3x3", "Pyraminx", …) oder Subset-Override ("pll"/"oll" → Phase 8b) */
  cubeType: string;
  /**
   * Optionaler Scramble-Type-Override aus Session.scramble_type
   * (Phase 8b). Wenn gesetzt, hat dieser Vorrang vor cubeType.
   */
  scrambleTypeOverride?: string | null;
  /** Aenderung dieser zahl loest re-generation aus (z.B. nach save). */
  regenerationSeed: number;
  /**
   * Callback: bei jedem neu erzeugten Scramble — der Parent
   * cached den string, um ihn beim Save mit-zu-speichern.
   */
  onScrambleGenerated: (scramble: string) => void;
}

export function ScrambleCard({
  cubeType,
  scrambleTypeOverride,
  regenerationSeed,
  onScrambleGenerated,
}: Props) {
  const [scramble, setScramble] = useState<string>("");
  const [skipCounter, setSkipCounter] = useState(0);

  // Override schlaegt cube_type — aber nur wenn er sich auf einen
  // scrambow-bekannten Code aufloesen laesst. csTimer-Codes wie
  // "444wca" werden via resolveScrambleTypeOverride zu scrambow-Codes
  // ("444"). Unbekannte Strings → fallback auf cube_type-Mapping.
  // Vor Phase 8.1 wurde der raw-Override an scrambow weitergegeben →
  // leerer Scramble bei 4x4/5x5/Pyra/etc. mit csTimer-importierten
  // Sessions.
  const resolvedOverride = scrambleTypeOverride
    ? resolveScrambleTypeOverride(scrambleTypeOverride)
    : null;
  const effectiveType = resolvedOverride ?? cubeTypeToScrambowType(cubeType);

  useEffect(() => {
    const next = generateScramble(effectiveType);
    setScramble(next);
    onScrambleGenerated(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, regenerationSeed, skipCounter]);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-sm text-gray-500 uppercase tracking-wide">
          Scramble{" "}
          <span className="text-gray-600 normal-case tracking-normal">
            ({effectiveType})
          </span>
        </div>
        <button
          onClick={() => setSkipCounter((c) => c + 1)}
          className="text-sm rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          title="Diesen Scramble ueberspringen, neuen generieren"
        >
          ⏭ Skip
        </button>
      </div>
      <div
        className="font-mono text-lg md:text-xl text-gray-100 leading-relaxed break-words select-all"
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

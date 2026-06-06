// ScrambleCard (Phase 8a, erweitert in Welle 3 / 2026-05-16) —
// zentrale Scramble-Anzeige im TIMER.
//
// Verhalten:
//  - Beim Mount + bei cube_type-Wechsel + nach Save: neuer Scramble
//    (passend zum aktuellen Cube-Type, falls kein User-Override)
//  - „Skip"-Button generiert manuell einen neuen Scramble
//  - Welle 3: User kann den Scramble-Typ ändern. Zwei Kategorien:
//      • WCA — alle offiziellen Wettkampf-Cubes (3x3, 4x4, Pyraminx, …)
//      • Inoffiziell — Ivy, Gear, Redi, Master Pyra/Skewb, FTO
//    Default folgt cubeType (z.B. „3x3" → WCA + 333). User-Override
//    bleibt bis zum nächsten cubeType-Wechsel, dann auto-reset.
//  - Session.scramble_type-Override (Phase 8b, z.B. „pll") schlägt
//    cubeType — User-Picker-Override schlägt beides (volles Steuern).
//
// Monospace + großer Font für die Notation. Der Parent (TimerTab)
// steuert via `regenerationSeed`-prop wann ein neuer Scramble faellig
// ist (z.B. solve-counter erhöhen → re-gen).

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BIG_CUBE_SCRAMBLE_TYPES,
  cubeTypeToScrambowType,
  defaultScrambleTypeForCube,
  generateScramble,
  isWcaQualityCustomPuzzle,
  prefetchScrambleVendors,
  resolveScrambleTypeOverride,
  UNOFFICIAL_SCRAMBLE_TYPES,
  WCA_SCRAMBLE_TYPES,
  type ScrambleTypeInfo,
} from "../lib/scramble";
import { TIMER_FONT_SCALE, useAppSettings } from "../lib/settings";
import { InfoButton } from "./InfoButton";
import { ScrambleNet, isScrambleNetSupported } from "./ScrambleNet";
import { Button, Card } from "./ui";

interface Props {
  /** App-cube_type ("3x3", "Pyraminx", …) — bestimmt den Default. */
  cubeType: string;
  /**
   * Optionaler Scramble-Type-Override aus Session.scramble_type
   * (Phase 8b). Wenn gesetzt, hat dieser Vorrang vor cubeType.
   * User-Picker-Override schlägt aber auch das hier.
   */
  scrambleTypeOverride?: string | null;
  /** Änderung dieser Zahl löst re-generation aus (z.B. nach save). */
  regenerationSeed: number;
  /**
   * Callback: bei jedem neu erzeugten Scramble — der Parent
   * cached den string, um ihn beim Save mit-zu-speichern.
   */
  onScrambleGenerated: (scramble: string) => void;
}

type Category = "wca" | "big" | "unofficial";

/**
 * Hilfs-Funktion: in welcher Picker-Kategorie ist der Code?
 *
 * Returnt `null` für Codes, die in keiner unserer beiden Listen sind —
 * z.B. Trainer-Subsets wie „pll", „oll" oder ein csTimer-Override wie
 * „333oh". Der Caller (ScrambleCard) deaktiviert den Dropdown in diesem
 * Fall und zeigt einen Hinweis, statt einen `<select>` mit value zu
 * rendern, der gar keine Option matcht (QA-Fix Welle 3, 2026-05-16).
 */
function categoryFor(code: string): Category | null {
  if (WCA_SCRAMBLE_TYPES.some((t) => t.code === code)) return "wca";
  if (BIG_CUBE_SCRAMBLE_TYPES.some((t) => t.code === code)) return "big";
  if (UNOFFICIAL_SCRAMBLE_TYPES.some((t) => t.code === code)) return "unofficial";
  return null;
}

/** UI-Label für einen Code aus den beiden Listen (Fallback = Code). */
function labelFor(code: string): string {
  const all: ScrambleTypeInfo[] = [
    ...WCA_SCRAMBLE_TYPES,
    ...BIG_CUBE_SCRAMBLE_TYPES,
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
  const { t } = useTranslation();
  const [scramble, setScramble] = useState<string>("");
  const [skipCounter, setSkipCounter] = useState(0);
  const [settings, setSettings] = useAppSettings();
  const fontPx = TIMER_FONT_SCALE[settings.timer_font_size].scramble;

  // Phase W.scramble-image (2026-05-17): ist das 2D-Net für den aktuellen
  // Cube-Type überhaupt verfügbar? Wir blenden den Toggle dann nur ein,
  // wenn er auch eine sichtbare Wirkung hat.
  const netSupported = isScrambleNetSupported(cubeType);

  // Phase W.custom-scramble (2026-05-17): Edit-Modus lässt User einen
  // eigenen Scramble eintippen. Aktivieren via Edit-Button, speichern
  // mit Enter / Save-Button. Generator-Effekt wird mit isCustom-Flag
  // pausiert (sonst würde der nächste Render-Trigger den Custom-
  // Scramble überschreiben).
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  // User-Override aus dem Picker. null = „folgt automatisch dem Cube".
  // Wir resetten ihn bei cubeType-Wechsel, sodass der nächste Cube
  // wieder seinen passenden Default zeigt.
  const [userPickedType, setUserPickedType] = useState<string | null>(null);
  useEffect(() => {
    setUserPickedType(null);
    // Cube-Wechsel verwirft auch den Custom-Scramble — er passt nicht
    // mehr.
    setIsCustom(false);
    setEditMode(false);
  }, [cubeType]);

  // Override-Resolution: Session-scramble_type → scrambow-Code, falls
  // bekannt. csTimer-Codes (444wca, pyrso, …) werden hier in scrambow-
  // Codes übersetzt — sonst leerer Scramble für importierte Sessions.
  const resolvedSessionOverride = scrambleTypeOverride
    ? resolveScrambleTypeOverride(scrambleTypeOverride)
    : null;

  // Effektiver Typ: User-Pick > Session-Override > cube_type-Default
  const effectiveType =
    userPickedType ??
    resolvedSessionOverride ??
    cubeTypeToScrambowType(cubeType);

  // Kategorie für den Toggle — derived aus dem effektivenType.
  const effectiveCategory = categoryFor(effectiveType);

  // Bundle-Split-Prefetch (W.cstimer-dynamic-import, 2026-05-30):
  // triggert den Vendor-Chunk-Load schon beim Mount, damit zum ersten
  // generateScramble-Call (im nächsten useEffect) die Vendors meistens
  // schon im Hot-Cache liegen — kein sichtbarer Loading-State im 99%-
  // Fall. fire-and-forget, kein await nötig.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    prefetchScrambleVendors();
  }, []);

  // QA-Hinweis: onScrambleGenerated bewusst NICHT in den deps. Der Parent
  // (TimerTab) gibt `setCurrentScramble` direkt aus `useState` rein — die
  // Identität bleibt stabil. Würde der Parent das mal in einen inline-
  // Callback umbauen, könnte dieser Effect ungewollt bei jedem Render
  // feuern und einen neuen Scramble erzeugen. Wenn das jemals nervt,
  // entweder useEvent (React 19+ stable?) oder den Parent zwingen,
  // useCallback zu nutzen.
  useEffect(() => {
    // Wenn der User gerade einen Custom-Scramble eingegeben hat,
    // nicht überschreiben. Nach Skip / Save / Cube-Wechsel wird
    // isCustom resetet.
    if (isCustom) return;
    // Race-Schutz: wenn die Komponente unmountet oder effectiveType
    // zwischen async-await wechselt, ignorieren wir das Ergebnis.
    let cancelled = false;
    void (async () => {
      const next = await generateScramble(effectiveType);
      if (cancelled) return;
      setScramble(next);
      onScrambleGenerated(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, regenerationSeed, skipCounter, isCustom]);

  /** Custom-Scramble übernehmen: validiert nicht streng (nur Trim),
   *  verlaesst sich darauf dass User die Notation kennt. */
  function applyCustomScramble() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      // Leerer Input → Edit-Modus verlassen ohne änderung
      setEditMode(false);
      return;
    }
    setScramble(trimmed);
    onScrambleGenerated(trimmed);
    setIsCustom(true);
    setEditMode(false);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditValue("");
  }

  function startEdit() {
    setEditValue(scramble);
    setEditMode(true);
  }

  /** Toggle WCA ↔ Inoffiziell. Switcht auf den ersten Eintrag der Ziel-
   *  Kategorie ODER auf den Cube-Default, falls dieser zur Ziel-Kategorie
   *  passt (z.B. WCA-Toggle bei 3x3-Cube → 333 statt 222). */
  function setCategory(cat: Category) {
    // Wenn der Cube-Default schon in die Ziel-Kategorie fällt, ihn behalten
    // (z.B. „11x11"-Cube + Big-Toggle → 111111 statt 8x8). Sonst der erste
    // Eintrag der Kategorie.
    const cubeDefault = defaultScrambleTypeForCube(cubeType);
    const defaultMatches = categoryFor(cubeDefault) === cat;
    if (cat === "wca") {
      setUserPickedType(defaultMatches ? cubeDefault : WCA_SCRAMBLE_TYPES[0].code);
    } else if (cat === "big") {
      setUserPickedType(
        defaultMatches ? cubeDefault : BIG_CUBE_SCRAMBLE_TYPES[0].code,
      );
    } else {
      setUserPickedType(
        defaultMatches ? cubeDefault : UNOFFICIAL_SCRAMBLE_TYPES[0].code,
      );
    }
  }

  const isOverridden = userPickedType !== null;
  // Bei Sonderfall (effectiveCategory === null, z.B. Session-Vorgabe „pll")
  // ist die Liste leer — Dropdown wird dann nicht gerendert (siehe unten).
  const typesInCategory: ScrambleTypeInfo[] =
    effectiveCategory === "wca"
      ? WCA_SCRAMBLE_TYPES
      : effectiveCategory === "big"
        ? BIG_CUBE_SCRAMBLE_TYPES
        : effectiveCategory === "unofficial"
          ? UNOFFICIAL_SCRAMBLE_TYPES
          : [];

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 uppercase tracking-wide">
            {t("scramble.title")}{" "}
            <span className="text-gray-600 normal-case tracking-normal">
              ({labelFor(effectiveType)})
            </span>
          </span>
          <InfoButton>
            <p className="font-medium mb-1">{t("scramble.infoTitle")}</p>
            <p className="mb-2">{t("scramble.infoBody1")}</p>
            <p>
              <strong>{t("scramble.infoPickerLabel")}</strong>{" "}
              {t("scramble.infoBody2")}
            </p>
          </InfoButton>
        </div>
        <div className="flex items-center gap-1.5">
          {!editMode && (
            <button
              onClick={startEdit}
              className="text-sm rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              title={t("scramble.customButtonTitle")}
            >
              {t("scramble.customButton")}
            </button>
          )}
          {/* 2D-Net-Toggle (Phase W.scramble-image-toggle): nur sichtbar wenn
              das Bild für den aktuellen Cube-Type überhaupt was zeigen
              würde — sonst wäre der Toggle wirkungslos und damit
              irreführend (User-Wunsch 2026-05-17). */}
          {netSupported && (
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  show_scramble_image: !settings.show_scramble_image,
                })
              }
              className={`text-sm rounded border px-2 py-1 transition-colors ${
                settings.show_scramble_image
                  ? "border-purple-500/60 bg-purple-600/20 text-purple-100 hover:bg-purple-600/30"
                  : "border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
              title={
                settings.show_scramble_image
                  ? t("scramble.imageHide")
                  : t("scramble.imageShow")
              }
              aria-pressed={settings.show_scramble_image}
            >
              {settings.show_scramble_image
                ? t("scramble.imageOn")
                : t("scramble.imageOff")}
            </button>
          )}
          <button
            onClick={() => {
              setIsCustom(false);
              setSkipCounter((c) => c + 1);
            }}
            className="text-sm rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
            title={t("scramble.skipTitle")}
          >
            {t("scramble.skipButton")}
          </button>
        </div>
      </div>

      {/* Picker-Zeile: Toggle + Dropdown + Auto-Reset-Button.
          Flex-wrap, damit's auf Phone bei Bedarf umbricht. */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <div
          className="inline-flex rounded border border-gray-700 overflow-hidden text-xs"
          role="radiogroup"
          aria-label={t("scramble.categoryAriaLabel")}
        >
          <CategoryButton
            active={effectiveCategory === "wca"}
            onClick={() => setCategory("wca")}
          >
            {t("scramble.categoryWca")}
          </CategoryButton>
          <CategoryButton
            active={effectiveCategory === "big"}
            onClick={() => setCategory("big")}
          >
            {t("scramble.categoryBig")}
          </CategoryButton>
          <CategoryButton
            active={effectiveCategory === "unofficial"}
            onClick={() => setCategory("unofficial")}
          >
            {t("scramble.categoryUnofficial")}
          </CategoryButton>
        </div>
        {effectiveCategory !== null ? (
          <>
            <label
              className="text-xs text-gray-500 sr-only"
              htmlFor="scramble-type-picker"
            >
              {t("scramble.typePickerLabel")}
            </label>
            <select
              id="scramble-type-picker"
              value={effectiveType}
              onChange={(e) => setUserPickedType(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:border-purple-500 focus:outline-none"
            >
              {typesInCategory.map((tt) => (
                <option key={tt.code} value={tt.code}>
                  {tt.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          // Sonderfall (QA-Fix Welle 3): effectiveType ist weder in WCA noch
          // in UNOFFICIAL — z.B. Session.scramble_type = "pll"/"oll". Wir
          // zeigen den Picker-Wert read-only an, beide Toggle-Buttons sind
          // un-highlighted, ein Klick auf einen Toggle wechselt in die
          // jeweilige Kategorie. „↺ auto" stellt den Cube-Default wieder her.
          <span className="text-xs text-gray-500 italic">
            {t("scramble.fromSessionOverride", {
              label: labelFor(effectiveType),
            })}
          </span>
        )}
        {isOverridden && (
          <button
            type="button"
            onClick={() => setUserPickedType(null)}
            className="text-xs rounded border border-gray-700 px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            title={t("scramble.backToDefaultTitle", { cube: cubeType })}
          >
            {t("scramble.backToDefault")}
          </button>
        )}
      </div>

      {editMode ? (
        // Edit-Modus (Phase W.custom-scramble): Textarea + Save/Abbrechen.
        // Enter speichert (ohne Shift), Esc bricht ab. Auto-Focus + select
        // damit User direkt überschreiben kann.
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                applyCustomScramble();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            autoFocus
            rows={3}
            placeholder={t("scramble.editPlaceholder")}
            className="w-full font-mono rounded border border-purple-500/40 bg-gray-800 text-gray-100 px-3 py-2 focus:border-purple-500 focus:outline-none resize-y"
            style={{ fontSize: fontPx }}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={applyCustomScramble}
            >
              {t("scramble.editApply")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancelEdit}
            >
              {t("scramble.editCancel")}
            </Button>
            <span className="text-xs text-gray-500">
              {t("scramble.editNoValidation")}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div
            className="font-mono text-gray-100 leading-relaxed break-words select-all"
            style={{ fontSize: fontPx }}
            aria-live="polite"
          >
            {scramble || (
              <span className="text-gray-500 text-base">
                {t("scramble.notAvailable")}
              </span>
            )}
            {isCustom && (
              <span className="ml-3 align-middle text-[11px] uppercase tracking-wide text-purple-300/80 border border-purple-500/40 rounded px-1.5 py-0.5">
                {t("scramble.customBadge")}
              </span>
            )}
          </div>
          {/* 2D-Net-Bild (Phase W.scramble-image): rendert sich selbst nur für
              unterstützte Cube-Types (aktuell 3x3) und bei aktivem Setting. */}
          {settings.show_scramble_image && scramble && (
            <ScrambleNet scramble={scramble} cubeType={cubeType} />
          )}
        </>
      )}

      {/* Disclaimer NUR für Custom-Puzzles ohne Random-State-Solver
          (Phase W.ivy-rs, 2026-05-17): Ivy hat seit jetzt einen
          Eigenbau-Solver (29.160-State-Lookup-Table). FTO über scrambow.
          Gear/Redi/Master Pyra/Skewb laufen weiter über Random-Move
          (kommen schrittweise auf Random-State, wenn das Konzept hier
          stabil ist). */}
      {effectiveCategory === "unofficial" &&
        !isWcaQualityCustomPuzzle(effectiveType) &&
        effectiveType !== "fto" && (
          <p className="mt-3 text-[11px] text-amber-300/70">
            {t("scramble.randomMoveWarning")}
          </p>
        )}
      {effectiveCategory === "big" && (
        <p className="mt-3 text-[11px] text-gray-500">
          {t("scramble.bigCubeNote")}
        </p>
      )}
    </Card>
  );
}

/** Kleiner Pill-Button für die Kategorie-Toggle. */
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

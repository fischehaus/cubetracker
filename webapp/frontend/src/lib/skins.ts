// Skin-System (W.skin-cyberpunk-mvp, 2026-05-28).
//
// User-waehlbare Background-Bilder. Bewusst client-only via localStorage
// — analog zu lib/settings.ts. Wenn das mal cross-device persistiert
// werden muss, kommt eine User-Preferences-Tabelle dazu (separate Welle).
//
// Architektur:
//   1. SKIN_REGISTRY (statisch) — alle verfuegbaren Skins + ihre Resolutions.
//      Skin-Assets liegen in public/skins/<id>/<resolution>.webp (siehe
//      scripts/convert-skins.cjs fuer die Convention).
//   2. resolveSkinImage(skin, vpWidth, vpHeight) — picked die beste
//      Resolution fuer den aktuellen Viewport (Superwide-Detection +
//      kleinste-passende-Aufloesung).
//   3. useSkin()-Hook in lib/use-skin.ts (separater File, weil Hook +
//      React-Deps; dieser File ist pure data).
//
// Format-Convention pro Skin-Paket (vom User generiert):
//   <skin-id>_wallpaper_appsafe_1920x1080.png         (FullHD 16:9)
//   <skin-id>_wallpaper_appsafe_2560x1440.png         (QHD 16:9)
//   <skin-id>_wallpaper_appsafe_3440x1440.png         (UWQHD 21:9)
//   <skin-id>_wallpaper_appsafe_3840x1600.png         (5K 2:1)
//   <skin-id>_wallpaper_appsafe_3840x1080_superwide.png  (32:9)
//   (optional) <skin-id>_wallpaper_appsafe_1080x1920_portrait.png  (9:16)
//
// "appsafe" = Cube + Logo am Bildrand, Mitte ist Card-Flaeche.

export interface SkinResolution {
  /** Minimum-Viewport-Breite in px ab der diese Resolution gepickt wird. */
  width: number;
  /** Pfad relativ zur Site-Root (public/-Verzeichnis). */
  src: string;
  /**
   * Optionales Aspect-Ratio-Tag fuer Spezial-Resolutions:
   *   - "32:9" — wird bei VP-Aspect-Ratio > 3 bevorzugt (DualUp-Monitore)
   *   - "9:16" — wird bei VP-Aspect-Ratio < 1 bevorzugt (Portrait/Phone)
   *   - undefined — normale 16:9 / 21:9 / 2:1 Landscape-Variante
   */
  aspectRatio?: "32:9" | "9:16";
}

/**
 * CSS `background-position`-Wert pro Skin. Skin-Designer bestimmt damit
 * wo das Bild verankert wird, wenn cover-Skalierung beschneidet.
 *
 *   "center bottom" — Cube/Logo unten links verankert (Cyberpunk-Layout)
 *   "center center" — gleichmaessig oben + unten beschnitten (Legendary —
 *     Cube ist hier mittig-links, Logo unten links; center center hat
 *     die beste Balance fuer beide Elemente)
 *   "center top"    — fuer Skins wo wichtige Visuals oben liegen
 *
 * Default ist "center bottom" — passt zu den meisten Speedcubing-Cube-
 * Hero-Bildern wo der Cube am unteren Bildrand sitzt.
 */
export type SkinBackgroundPosition =
  | "center bottom"
  | "center center"
  | "center top"
  | "left bottom"
  | "left center"
  | "left top";

export interface Skin {
  /** Stable ID, in localStorage gespeichert. */
  id: string;
  /** i18n-Key fuer Anzeige-Name im Picker. */
  labelKey: string;
  /** i18n-Key fuer Kurzbeschreibung im Picker. Optional. */
  descriptionKey?: string;
  /**
   * Preview-Thumbnail-URL fuer den Picker (320x135). null bei `none`
   * (das wird durch eine leere/dunkle Vorschau dargestellt).
   */
  preview: string | null;
  /** Liste aller verfuegbaren Resolutions. Leer bei `none`. */
  resolutions: SkinResolution[];
  /**
   * CSS background-position. Optional — Default "center bottom".
   * Wird vom BackgroundLayer als inline-style gesetzt.
   */
  position?: SkinBackgroundPosition;
}

/**
 * Registry aller verfuegbaren Skins. NEUE Skin hinzufuegen:
 *   1. ZIP-Paket per scripts/convert-skins.cjs konvertieren
 *   2. Hier einen Eintrag mit Resolution-Pfaden + i18n-Keys ergaenzen
 *   3. i18n-Keys in de.json + en.json hinterlegen (skin.<id>.label etc.)
 *
 * "none" ist immer der erste Eintrag — Default + Opt-Out-Option.
 */
export const SKIN_REGISTRY: Skin[] = [
  {
    id: "none",
    labelKey: "skin.none.label",
    descriptionKey: "skin.none.description",
    preview: null,
    resolutions: [],
  },
  {
    id: "cyberpunk-neon",
    labelKey: "skin.cyberpunkNeon.label",
    descriptionKey: "skin.cyberpunkNeon.description",
    preview: "/skins/cyberpunk-neon/preview.webp",
    // Cube + Logo sind unten links im Bild -> bottom-position verankert sie
    position: "center bottom",
    resolutions: [
      // Aufsteigende width, der Resolver picked die kleinste >= VP-Breite.
      // Superwide separat, wird per AR-Check bevorzugt.
      { width: 1920, src: "/skins/cyberpunk-neon/1920x1080.webp" },
      { width: 2560, src: "/skins/cyberpunk-neon/2560x1440.webp" },
      { width: 3440, src: "/skins/cyberpunk-neon/3440x1440.webp" },
      { width: 3840, src: "/skins/cyberpunk-neon/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/cyberpunk-neon/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
    ],
  },
  {
    // Renamed 2026-05-28 von `legendary-partymodus`. Migrations-Mapping
    // in lib/use-skin.ts LEGACY_SKIN_ID_MAP haelt User-Wahl konsistent.
    id: "cyberpunk-laser",
    labelKey: "skin.cyberpunkLaser.label",
    descriptionKey: "skin.cyberpunkLaser.description",
    preview: "/skins/cyberpunk-laser/preview.webp",
    // Cube ist mittig-links, Logo unten links -> center center hat die
    // beste Balance bei verschiedenen Aspect-Ratios (Cube + Logo
    // bleiben beide moeglichst sichtbar).
    position: "center center",
    resolutions: [
      { width: 1920, src: "/skins/cyberpunk-laser/1920x1080.webp" },
      { width: 2560, src: "/skins/cyberpunk-laser/2560x1440.webp" },
      { width: 3440, src: "/skins/cyberpunk-laser/3440x1440.webp" },
      { width: 3840, src: "/skins/cyberpunk-laser/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/cyberpunk-laser/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
    ],
  },
  {
    id: "party-fun",
    labelKey: "skin.partyFun.label",
    descriptionKey: "skin.partyFun.description",
    preview: "/skins/party-fun/preview.webp",
    // 3D-Cube zentriert mittig, Bonbons + Confetti rundherum.
    // center center balanciert alle Visuals.
    position: "center center",
    resolutions: [
      // Neu in diesem Pack: HD-Laptop (1366x768) + Portrait (1080x1920)
      { width: 1366, src: "/skins/party-fun/1366x768.webp" },
      { width: 1920, src: "/skins/party-fun/1920x1080.webp" },
      { width: 2560, src: "/skins/party-fun/2560x1440.webp" },
      { width: 3440, src: "/skins/party-fun/3440x1440.webp" },
      { width: 3840, src: "/skins/party-fun/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/party-fun/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
      {
        width: 1080,
        src: "/skins/party-fun/1080x1920-portrait.webp",
        aspectRatio: "9:16",
      },
    ],
  },
  {
    // W.skin-three-themes (2026-05-29). appsafe-Pack: Cube/Logo am Rand,
    // Mitte frei fuer Cards -> center center cropt ausgewogen.
    id: "pb-hunt-focus",
    labelKey: "skin.pbHuntFocus.label",
    descriptionKey: "skin.pbHuntFocus.description",
    preview: "/skins/pb-hunt-focus/preview.webp",
    position: "center center",
    resolutions: [
      { width: 1920, src: "/skins/pb-hunt-focus/1920x1080.webp" },
      { width: 2560, src: "/skins/pb-hunt-focus/2560x1440.webp" },
      { width: 3440, src: "/skins/pb-hunt-focus/3440x1440.webp" },
      { width: 3840, src: "/skins/pb-hunt-focus/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/pb-hunt-focus/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
    ],
  },
  {
    id: "algorithm-lab",
    labelKey: "skin.algorithmLab.label",
    descriptionKey: "skin.algorithmLab.description",
    preview: "/skins/algorithm-lab/preview.webp",
    position: "center center",
    resolutions: [
      { width: 1920, src: "/skins/algorithm-lab/1920x1080.webp" },
      { width: 2560, src: "/skins/algorithm-lab/2560x1440.webp" },
      { width: 3440, src: "/skins/algorithm-lab/3440x1440.webp" },
      { width: 3840, src: "/skins/algorithm-lab/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/algorithm-lab/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
    ],
  },
  {
    id: "codex-vitruvian",
    labelKey: "skin.codexVitruvian.label",
    descriptionKey: "skin.codexVitruvian.description",
    preview: "/skins/codex-vitruvian/preview.webp",
    position: "center center",
    resolutions: [
      { width: 1920, src: "/skins/codex-vitruvian/1920x1080.webp" },
      { width: 2560, src: "/skins/codex-vitruvian/2560x1440.webp" },
      { width: 3440, src: "/skins/codex-vitruvian/3440x1440.webp" },
      { width: 3840, src: "/skins/codex-vitruvian/3840x1600.webp" },
      {
        width: 3840,
        src: "/skins/codex-vitruvian/3840x1080-super.webp",
        aspectRatio: "32:9",
      },
    ],
  },
];

/** Default-Skin-ID, wenn localStorage leer ist. */
export const DEFAULT_SKIN_ID = "none";

/**
 * Findet einen Skin per ID. Fallback auf Default wenn unbekannt.
 * (User koennte einen alten Skin-ID im Storage haben, der entfernt wurde.)
 */
export function getSkin(id: string): Skin {
  return (
    SKIN_REGISTRY.find((s) => s.id === id) ??
    SKIN_REGISTRY.find((s) => s.id === DEFAULT_SKIN_ID) ??
    SKIN_REGISTRY[0]
  );
}

/**
 * Picked die beste Resolution fuer den aktuellen Viewport.
 *
 *  - Aspect-Ratio > 3 (32:9 DualUp) -> bevorzugt Superwide-Variante
 *  - Aspect-Ratio < 1 (Portrait) -> bevorzugt 9:16-Variante (falls vorhanden)
 *  - Sonst: kleinste Resolution mit width >= Viewport-Breite,
 *    Fallback groesste vorhandene.
 *
 * Returns `null` wenn Skin keine Resolutions hat (= "none").
 */
export function resolveSkinImage(
  skin: Skin,
  viewportWidth: number,
  viewportHeight: number,
): string | null {
  if (skin.resolutions.length === 0) return null;

  const aspectRatio = viewportWidth / Math.max(1, viewportHeight);

  // Superwide-Monitor (DualUp 32:9, 3.56:1)
  if (aspectRatio > 3) {
    const sw = skin.resolutions.find((r) => r.aspectRatio === "32:9");
    if (sw) return sw.src;
  }

  // Portrait-Device (Phone hochkant, ~0.5)
  if (aspectRatio < 1) {
    const portrait = skin.resolutions.find((r) => r.aspectRatio === "9:16");
    if (portrait) return portrait.src;
    // Wenn keine Portrait-Version vorhanden: kleinste Landscape-Variante
    // mit `cover` + position center bottom (siehe BackgroundLayer-CSS).
  }

  // Standard-Pfad: kleinste Landscape-Resolution >= Viewport-Breite.
  const landscape = skin.resolutions
    .filter((r) => !r.aspectRatio)
    .sort((a, b) => a.width - b.width);

  for (const r of landscape) {
    if (r.width >= viewportWidth) return r.src;
  }
  // Viewport groesser als groesste Resolution -> nimm die groesste.
  return landscape[landscape.length - 1].src;
}

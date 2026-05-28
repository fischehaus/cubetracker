/**
 * Skin-Asset-Converter
 *
 * Liest PNGs aus einem Skin-Paket (siehe NEXT_SESSION „Skin-Paket-Convention")
 * und schreibt WebP-Outputs (Q70 lossy) in `public/skins/<skin-id>/`.
 *
 * Convention pro Skin-Paket (vom User generiert):
 *   <skin-id>_wallpaper_appsafe_1920x1080.png     -> 1920x1080.webp
 *   <skin-id>_wallpaper_appsafe_2560x1440.png     -> 2560x1440.webp
 *   <skin-id>_wallpaper_appsafe_3440x1440.png     -> 3440x1440.webp
 *   <skin-id>_wallpaper_appsafe_3840x1600.png     -> 3840x1600.webp
 *   <skin-id>_wallpaper_appsafe_3840x1080_superwide.png -> 3840x1080-super.webp
 *   (optional) <skin-id>_wallpaper_appsafe_1080x1920_portrait.png -> 1080x1920-portrait.webp
 *
 * Plus 1x Preview-Thumbnail (320x135, Q80) fuer den Skin-Picker.
 *
 * Benutzung:
 *   node scripts/convert-skins.cjs --skin cyberpunk-neon --src <pfad-zum-pack-ordner>
 *
 * Output:
 *   public/skins/<skin-id>/{1920x1080,2560x1440,3440x1440,3840x1600,3840x1080-super,preview}.webp
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1];
}

const skinId = getArg("skin");
const srcDir = getArg("src");

if (!skinId || !srcDir) {
  console.error(
    "Usage: node scripts/convert-skins.cjs --skin <skin-id> --src <pack-folder>",
  );
  process.exit(1);
}

const outDir = path.resolve(__dirname, "..", "public", "skins", skinId);
fs.mkdirSync(outDir, { recursive: true });

// Reihenfolge wichtig: superwide-Variante zuerst, sonst matcht
// `3840x1080` die superwide-Datei auch.
//
// Suffix-Toleranz fuer drei Pack-Conventions:
//   1. Pack (cyberpunk-neon):  `_appsafe_<W>x<H>.png`
//   2. Pack (cyberpunk-laser): `_appsafe_<W>x<H>_<variant>.jpg`
//   3. Pack (party-fun):       `_<W>x<H>_<variant>.jpg` (kein _appsafe_)
// Plus akzeptierte Extensions: .png, .jpg, .jpeg (case-insensitive).
// `_appsafe_` ist optional, Variante-Suffix (_standard|_ultrawide|
// _superwide|_hd|_portrait) ebenfalls optional.
const MAPPING = [
  {
    match: /(?:_appsafe)?_3840x1080_superwide(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "3840x1080-super.webp",
  },
  {
    match: /(?:_appsafe)?_1366x768(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "1366x768.webp",
  },
  {
    match: /(?:_appsafe)?_1920x1080(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "1920x1080.webp",
  },
  {
    match: /(?:_appsafe)?_2560x1440(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "2560x1440.webp",
  },
  {
    match: /(?:_appsafe)?_3440x1440(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "3440x1440.webp",
  },
  {
    match: /(?:_appsafe)?_3840x1600(_standard|_ultrawide|_superwide|_hd)?\.(png|jpe?g)$/i,
    out: "3840x1600.webp",
  },
  {
    match: /(?:_appsafe)?_1080x1920_portrait(_standard|_ultrawide|_superwide|_hd|_portrait)?\.(png|jpe?g)$/i,
    out: "1080x1920-portrait.webp",
  },
];

// File-Filter: nur Files mit "cubetracker_"-Prefix (filtert preview-
// contact-sheets, readability-tests, Convenience-Kopien ohne Prefix).
// Plus: maxenergy-Files explizit raus (2. Pack hatte die als Splash-
// Variante; im App-Background ist nur _appsafe_ gewollt).
const sourceFiles = fs
  .readdirSync(srcDir)
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .filter((f) => f.startsWith("cubetracker_"))
  .filter((f) => !f.includes("_maxenergy_"));

async function main() {
  let converted = 0;
  let previewSource = null;

  for (const file of sourceFiles) {
    const mapping = MAPPING.find((m) => m.match.test(file));
    if (!mapping) {
      // unbekannter Output (z.B. original_generated.png) -> skip
      continue;
    }
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(outDir, mapping.out);

    await sharp(inputPath).webp({ quality: 70 }).toFile(outputPath);

    const inSize = fs.statSync(inputPath).size;
    const outSize = fs.statSync(outputPath).size;
    const pct = Math.round((100 * outSize) / inSize);
    console.log(
      `${mapping.out.padEnd(30)} ${(inSize / 1024).toFixed(0)} KB -> ${(outSize / 1024).toFixed(0)} KB (${pct}%)`,
    );
    converted++;

    // fuer Preview: bevorzugt 1920x1080 (kleinste appsafe), sonst irgendwas
    if (mapping.out === "1920x1080.webp") {
      previewSource = inputPath;
    } else if (!previewSource) {
      previewSource = inputPath;
    }
  }

  if (previewSource) {
    const previewOut = path.join(outDir, "preview.webp");
    await sharp(previewSource)
      .resize(320, 135, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toFile(previewOut);
    const outSize = fs.statSync(previewOut).size;
    console.log(
      `preview.webp                   320x135        ${(outSize / 1024).toFixed(0)} KB`,
    );
  }

  console.log(`\n${converted} Aufloesungen konvertiert -> ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// SkinPickerCard (W.skin-cyberpunk-mvp).
//
// Section in EinstellungenView (Gruppe Aussehen): User waehlt Background-Skin
// per Klick auf eine der Radio-Cards. Sofort-Apply (kein Save-Button).
//
// UI:
//   - Grid mit ein Preview-Tile pro verfuegbarem Skin
//   - "none" zeigt eine dunkle Platzhalter-Tile mit "—"
//   - aktiver Skin: lila Ring + Check-Indikator
//   - Hover: leichte Skalierung
//
// Accessibility:
//   - role="radiogroup" + jeder Tile ist role="radio" mit aria-checked
//   - Keyboard: Tab fokussiert, Space/Enter aktiviert
//   - aria-labelledby fuer Gruppe-Titel

import { useTranslation } from "react-i18next";
import { SKIN_REGISTRY } from "../lib/skins";
import { useSkin } from "../lib/use-skin";
import { CARD_STYLES, useCardStyle } from "../lib/card-style";

export function SkinPickerCard() {
  const { t } = useTranslation();
  const { skinId, setSkinId } = useSkin();
  const { cardStyle, setCardStyle } = useCardStyle();

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 md:p-6 space-y-4">
      <div>
        <h2
          id="skin-picker-title"
          className="text-xl font-semibold text-gray-100 flex items-center gap-2"
        >
          <span aria-hidden="true">🎨</span>
          {t("skin.picker.title")}
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          {t("skin.picker.subtitle")}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="skin-picker-title"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      >
        {SKIN_REGISTRY.map((skin) => {
          const isActive = skin.id === skinId;
          return (
            <button
              key={skin.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setSkinId(skin.id)}
              className={[
                "group relative flex flex-col gap-2 rounded-lg overflow-hidden",
                "border-2 transition-all text-left",
                "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900",
                isActive
                  ? "border-purple-400 ring-2 ring-purple-400/40"
                  : "border-gray-700 hover:border-purple-500/60",
              ].join(" ")}
            >
              {/* Preview-Tile */}
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                {skin.preview ? (
                  <img
                    src={skin.preview}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl font-light">
                    —
                  </div>
                )}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm shadow-lg"
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Label + Description */}
              <div className="px-2 pb-2">
                <div className="text-sm font-medium text-gray-100">
                  {t(skin.labelKey)}
                </div>
                {skin.descriptionKey && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {t(skin.descriptionKey)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 italic">
        {t("skin.picker.hint")}
      </p>

      {/* W.skin-glassmorphism: Card-Stil-Picker, separat vom Skin.
       * "Solid" ist und bleibt der Default — Status-quo der MVP-Variante.
       * "Glass" macht die Cards halbtransparent + Backdrop-Blur, sodass
       * das Hintergrundbild durch die Cards scheint. Hat ohne aktiven
       * Skin keinen sichtbaren Effekt (Body bleibt solid dunkel). */}
      <div className="pt-4 border-t border-purple-500/20">
        <h3
          id="card-style-picker-title"
          className="text-sm font-semibold text-gray-100 mb-2"
        >
          {t("cardStyle.title")}
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="card-style-picker-title"
          className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-1"
        >
          {CARD_STYLES.map((style) => {
            const isActive = style.id === cardStyle;
            return (
              <button
                key={style.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setCardStyle(style.id)}
                className={[
                  "rounded px-3 py-1.5 text-sm font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-purple-400",
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-700",
                ].join(" ")}
              >
                {t(style.labelKey)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {cardStyle === "glass"
            ? t("cardStyle.glass.description")
            : t("cardStyle.solid.description")}
        </p>
        {cardStyle === "glass" && skinId === "none" && (
          <p className="text-xs text-amber-300 mt-1.5">
            {t("cardStyle.glass.noSkinHint")}
          </p>
        )}
      </div>
    </div>
  );
}

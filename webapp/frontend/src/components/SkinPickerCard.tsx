// SkinPickerCard (W.skin-cyberpunk-mvp).
//
// Section im SettingsPanel: User waehlt Background-Skin per Klick auf
// eine der Radio-Cards. Sofort-Apply (kein Save-Button).
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

export function SkinPickerCard() {
  const { t } = useTranslation();
  const { skinId, setSkinId } = useSkin();

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
    </div>
  );
}

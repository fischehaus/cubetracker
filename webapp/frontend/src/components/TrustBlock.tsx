// TrustBlock — „Was Cubetracker mit deinen Daten macht".
// Phase W.login-trust-block, 2026-05-28.
//
// 5 Karten auf der LoginPage (im aside neben dem Auth-Form), die einen
// hoher-IQ-User abholen: keine Werbung, keine Buzzwords, nur die
// Fakten zu Datensicherheit + Privacy. Inhalte sind faktentreu aus
// docs/permissions-matrix.md (Single-Source) abgeleitet.
//
// Vor jeder UI-Aenderung am TrustBlock muss permissions-matrix.md
// re-validiert werden — sonst leakt eine falsche Marketing-Aussage
// (z.B. „kein Tracking" wenn doch ein neues Analytics-Tool eingebaut
// wurde).

import { useTranslation } from "react-i18next";
import { InfoButton } from "./InfoButton";

interface TrustCardData {
  icon: string;
  titleKey: string;
  bullets: string[]; // i18n-keys
  /** Optionaler ⓘ-Tooltip mit weiterer Details (z.B. „Was Admin nicht sieht"). */
  noteKey?: string;
}

// Reihenfolge folgt der vom User priorisierten Conversion-Logik:
// (1) wo liegen die Daten, (2) kein Tracking, (3) Pseudonym OK,
// (4) was sehen andere User, (5) was sieht / sieht nicht der Admin.
const TRUST_CARDS: TrustCardData[] = [
  {
    icon: "🇪🇺",
    titleKey: "trustBlock.dataLocationTitle",
    bullets: [
      "trustBlock.dataLocationBullet1",
      "trustBlock.dataLocationBullet2",
      "trustBlock.dataLocationBullet3",
    ],
  },
  {
    icon: "🚫",
    titleKey: "trustBlock.noTrackingTitle",
    bullets: [
      "trustBlock.noTrackingBullet1",
      "trustBlock.noTrackingBullet2",
      "trustBlock.noTrackingBullet3",
    ],
  },
  {
    icon: "👤",
    titleKey: "trustBlock.identityTitle",
    bullets: [
      "trustBlock.identityBullet1",
      "trustBlock.identityBullet2",
      "trustBlock.identityBullet3",
    ],
  },
  {
    icon: "👥",
    titleKey: "trustBlock.visibilityTitle",
    bullets: [
      "trustBlock.visibilityBullet1",
      "trustBlock.visibilityBullet2",
      "trustBlock.visibilityBullet3",
    ],
  },
  {
    icon: "🛡",
    titleKey: "trustBlock.adminTitle",
    bullets: [
      "trustBlock.adminBullet1",
      "trustBlock.adminBullet2",
      "trustBlock.adminBullet3",
    ],
    noteKey: "trustBlock.adminNotSeenNote",
  },
];

export function TrustBlock() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-emerald-200">
          {t("trustBlock.headerTitle")}
        </h2>
        <span className="text-xs text-emerald-300/70">
          {t("trustBlock.headerSubtitle")}
        </span>
      </div>

      <ul className="space-y-3">
        {TRUST_CARDS.map((card) => (
          <li
            key={card.titleKey}
            className="rounded-lg border border-gray-700 bg-gray-900/40 p-3 space-y-1.5"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden="true">
                {card.icon}
              </span>
              <span className="text-sm font-medium text-gray-100">
                {t(card.titleKey)}
              </span>
              {card.noteKey && (
                <InfoButton align="right">
                  <p className="font-medium mb-1">
                    {t("trustBlock.adminNotSeenLabel")}
                  </p>
                  <p>{t(card.noteKey)}</p>
                </InfoButton>
              )}
            </div>
            <ul className="space-y-1 text-xs text-gray-300 pl-7">
              {card.bullets.map((bKey) => (
                <li key={bKey} className="flex items-start gap-1.5">
                  <span
                    aria-hidden="true"
                    className="text-emerald-400 mt-0.5"
                  >
                    ✓
                  </span>
                  <span>{t(bKey)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-800">
        {t("trustBlock.footerHint")}{" "}
        <a
          href="/datenschutz"
          className="text-gray-300 hover:text-gray-100 underline"
        >
          {t("trustBlock.footerPrivacyLink")}
        </a>
        {" · "}
        <a
          href="https://github.com/fischehaus/cubetracker"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-gray-100 underline"
        >
          {t("trustBlock.footerGithubLink")}
        </a>
      </p>
    </div>
  );
}

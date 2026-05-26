// Sichtbarer Sprach-Switcher fuer den Header und die LoginPage-Card.
// W.i18n-flags (2026-05-27, Turnier-Sprint Meppel).
//
// Design-Entscheidung: Flaggen-Emoji (🇩🇪/🇬🇧) PLUS Buchstaben-Kuerzel
// (DE/EN). Auf macOS/iOS/Linux/Android werden die Flaggen bunt gerendert,
// auf Windows-Chrome erscheinen sie als „🇩🇪 → DE" (Regional-Indicator-
// Buchstaben in Boxen) — das Buchstaben-Kuerzel daneben bleibt aber lesbar,
// also kein Funktions-Verlust.
//
// UK-Flagge fuer Englisch (nicht US), weil Cubetracker primaer die
// europaeische Speedcubing-Community trifft. UserMenu-Switcher bleibt
// parallel bestehen — der hier ist die schnelle 1-Klick-Variante,
// dort die diskretere Option.

import { useTranslation } from "react-i18next";

export type LangSwitcherSize = "sm" | "md";

interface Props {
  /** Visuelle Variante — sm fuer LoginPage-Card, md fuer App-Header. */
  size?: LangSwitcherSize;
  /** Optionale Klassen fuer den Container. */
  className?: string;
}

export function LanguageSwitcher({ size = "md", className = "" }: Props) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? "de";

  const buttonPadding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800/60 p-0.5 ${className}`}
      role="group"
      aria-label={t("userMenu.language")}
    >
      <FlagButton
        active={current === "de"}
        onClick={() => void i18n.changeLanguage("de")}
        flag="🇩🇪"
        code="DE"
        title={t("common.languageDe")}
        padding={buttonPadding}
        textSize={textSize}
      />
      <FlagButton
        active={current === "en"}
        onClick={() => void i18n.changeLanguage("en")}
        flag="🇬🇧"
        code="EN"
        title={t("common.languageEn")}
        padding={buttonPadding}
        textSize={textSize}
      />
    </div>
  );
}

function FlagButton({
  active,
  onClick,
  flag,
  code,
  title,
  padding,
  textSize,
}: {
  active: boolean;
  onClick: () => void;
  flag: string;
  code: string;
  title: string;
  padding: string;
  textSize: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded ${padding} ${textSize} font-semibold transition-colors ${
        active
          ? "bg-purple-600/40 text-purple-100 border border-purple-500/50"
          : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 border border-transparent"
      }`}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {flag}
      </span>
      <span>{code}</span>
    </button>
  );
}

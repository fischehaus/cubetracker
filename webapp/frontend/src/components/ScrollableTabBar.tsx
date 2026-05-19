// ScrollableTabBar — wiederverwendbare Tab-Leiste, mobile-first.
//
// Problem das es loest (UX-Audit 2026-05-14): TabBar (6 Top-Tabs) + die
// Sub-Tab-Bars in Verwaltung (5) + Community (2) nutzten alle `flex-1`,
// d.h. alle Tabs zwangs-gleichbreit. Auf Phone-Breiten (320-375px) wird
// das mit Icon+Label unleserlich oder bricht um.
//
// Lösung:
//   - Mobile (default): horizontal scrollbar, Tabs in natuerlicher Breite
//     (shrink-0), whitespace-nowrap, snap-scroll für sauberes Wischen.
//   - Desktop (md+): flex-1 wie vorher — alle Tabs gleichmaessig verteilt,
//     kein Scroll noetig.
//
// Genutzt von: TabBar (Top-Level, size="lg"), VerwaltungTab + CommunityTab
// (Sub-Tabs, size="md").

export interface ScrollableTabItem {
  id: string;
  label: string;
  icon?: string;
  /** Optionaler title-Tooltip auf dem Button. */
  description?: string;
}

interface Props {
  tabs: ScrollableTabItem[];
  current: string;
  onChange: (id: string) => void;
  /** Pflicht — aria-label für die <nav>. */
  ariaLabel: string;
  /** "lg" = Top-Level (h-14, text-lg), "md" = Sub-Tabs (h-11, text-base). */
  size?: "lg" | "md";
}

export function ScrollableTabBar({
  tabs,
  current,
  onChange,
  ariaLabel,
  size = "lg",
}: Props) {
  const heightClass = size === "lg" ? "h-14 text-lg" : "h-11 text-base";
  const iconClass = size === "lg" ? "text-xl" : "text-base";

  return (
    <nav
      // snap-proximity statt snap-mandatory: mandatory zwingt den
      // Container immer an einen Snap-Punkt — beim Antippen halb
      // sichtbarer Tabs ruckelt das. proximity snappt nur "wenn nah dran".
      className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1 overflow-x-auto md:overflow-visible snap-x snap-proximity"
      aria-label={ariaLabel}
    >
      {tabs.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? "page" : undefined}
            title={t.description}
            className={`flex shrink-0 md:flex-1 md:shrink items-center justify-center gap-2 rounded-md px-4 ${heightClass} font-medium transition whitespace-nowrap snap-start ${
              active
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
            }`}
          >
            {t.icon && (
              <span className={iconClass} aria-hidden="true">
                {t.icon}
              </span>
            )}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

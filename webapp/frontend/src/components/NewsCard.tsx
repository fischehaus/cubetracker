// NewsCard (Phase W.news) — Speedcubing-News aus dem RSS-Aggregator.
//
// Backend GET /news/latest pflegt die Liste, on-demand-Refresh wenn
// Items > 60min alt. Frontend cached 30min lokal.
//
// Quellen aktuell (Stand 2026-05-16): WCA Posts (offizielle
// Announcements) + r/Cubers (Reddit-Community). Erweiterung erfolgt
// im Backend (`webapp/news/sources.py`), kein Frontend-Update nötig.

import { useTranslation } from "react-i18next";
import { useLatestNews, type NewsItem } from "../lib/api";
import { getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";

export function NewsCard() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useLatestNews(10);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span aria-hidden="true" className="text-lg">
          📰
        </span>
        <h3 className="text-lg font-semibold text-purple-300">
          {t("news.title")}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("news.infoTitle")}</p>
          <p className="mb-2">{t("news.infoBody1")}</p>
          <p>{t("news.infoBody2")}</p>
        </InfoButton>
      </div>

      {isLoading && <p className="text-sm text-gray-500">{t("news.loading")}</p>}

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">
          <p className="font-medium">{t("news.errorTitle")}</p>
          <p className="mt-1 text-red-300/80">
            {error instanceof Error ? error.message : t("news.errorUnknown")}
          </p>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-gray-500">{t("news.emptyText")}</p>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <NewsItemRow
              key={item.id}
              item={item}
              locale={i18n.resolvedLanguage ?? "de"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsItemRow({ item, locale }: { item: NewsItem; locale: string }) {
  const { t } = useTranslation();
  const dateLabel = formatRelativeDate(
    item.published_at || item.fetched_at,
    locale,
    t,
  );
  return (
    <li className="rounded border border-gray-700 bg-gray-800/40 p-3 hover:border-purple-500/40 transition-colors">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-purple-200 hover:text-purple-100 underline-offset-2 hover:underline break-words"
        >
          {item.title}
        </a>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {dateLabel}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
        <SourceBadge source={item.source} label={item.source_label} />
        {item.summary && (
          <span className="text-gray-400 line-clamp-2">{item.summary}</span>
        )}
      </div>
    </li>
  );
}

function SourceBadge({ source, label }: { source: string; label: string }) {
  // Farb-Kodierung pro Quelle (rein optisch, hilft beim Scannen).
  const colorClass =
    source === "wca"
      ? "bg-purple-500/20 text-purple-200 border-purple-500/30"
      : source === "reddit_cubers"
        ? "bg-orange-500/20 text-orange-200 border-orange-500/30"
        : "bg-gray-700/50 text-gray-300 border-gray-600";
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${colorClass}`}
    >
      {label}
    </span>
  );
}

function formatRelativeDate(
  iso: string | null,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffH = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDay = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMin < 1) return t("news.ageNow");
    if (diffMin < 60) return t("news.ageMinutes", { count: diffMin });
    if (diffH < 24) return t("news.ageHours", { count: diffH });
    if (diffDay < 7) return t("news.ageDays", { count: diffDay });
    return date.toLocaleDateString(getIntlLocale(locale), {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

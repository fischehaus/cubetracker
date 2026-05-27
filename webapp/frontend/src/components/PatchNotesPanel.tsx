// PatchNotesPanel — Anzeige aller Versions-Highlights.
//
// Liest /api/changelog (PATCH_NOTES aus webapp/changelog/data.py).
// Source-of-Truth für Versions-Bumps + Highlights ist die Backend-
// Datei — kein Doppel-Pflege-Risiko.

import { useTranslation } from "react-i18next";
import { usePatchNotes, type PatchNote } from "../lib/api";
import { getIntlLocale } from "../lib/format";

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PatchNotesPanel() {
  const { t, i18n } = useTranslation();
  const dateLocale = getIntlLocale(i18n.resolvedLanguage);
  const { data, isLoading, error } = usePatchNotes();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">{t("patchNotes.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">
          {t("patchNotes.errorPrefix")}
          {error instanceof Error ? error.message : t("patchNotes.errorUnknown")}
        </p>
      </div>
    );
  }

  if (!data || data.patches.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">{t("patchNotes.empty")}</p>
      </div>
    );
  }

  const latest = data.patches[0];

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <h2 className="text-2xl font-semibold text-gray-100">
          {t("patchNotes.title")}{" "}
          <span className="text-sm text-gray-500">
            {t("patchNotes.countSummary", { count: data.patches.length })}
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {t("patchNotes.currentVersionPrefix")}{" "}
          <code className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-200">
            v{latest.version}
          </code>{" "}
          {t("patchNotes.currentVersionSuffix", {
            date: fmtDate(latest.released, dateLocale),
          })}
        </p>
      </header>

      <ol className="space-y-3">
        {data.patches.map((p, idx) => (
          <PatchNoteCard
            key={p.version}
            note={p}
            isLatest={idx === 0}
            dateLocale={dateLocale}
          />
        ))}
      </ol>
    </div>
  );
}

function PatchNoteCard({
  note,
  isLatest,
  dateLocale,
}: {
  note: PatchNote;
  isLatest: boolean;
  dateLocale: string;
}) {
  const { t } = useTranslation();
  return (
    <li
      className={`rounded-lg border p-4 ${
        isLatest
          ? "border-purple-500/40 bg-purple-500/5"
          : "border-gray-700 bg-gray-900/50"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <code
            className={`rounded px-2 py-0.5 text-sm font-mono ${
              isLatest
                ? "bg-purple-500/30 text-purple-100"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            v{note.version}
          </code>
          {note.internal && (
            <code
              className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-300"
              title={t("patchNotes.internalBadgeTitle")}
            >
              {t("patchNotes.internalBadge")}
            </code>
          )}
          <h3 className="text-base font-semibold text-gray-100">
            {note.title}
          </h3>
        </div>
        <div className="flex items-baseline gap-2 text-xs text-gray-500">
          <time>{fmtDate(note.released, dateLocale)}</time>
          {note.commit && (
            <code
              className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-500"
              title={t("patchNotes.commitHashTitle")}
            >
              {note.commit}
            </code>
          )}
        </div>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
        {note.highlights.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </li>
  );
}

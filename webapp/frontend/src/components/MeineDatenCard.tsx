// MeineDatenCard (Roadmap #6) — Daten-Ownership-Botschaft + prominenter
// Voll-Backup-Download. Steht oben im VerwaltungTab -> "Meine Daten".
// Die detaillierten Tools (Restore, Snapshots, Import) leben darunter im
// BackupPanel / ImportPanel.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadFullBackup } from "../lib/backup";

export function MeineDatenCard() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      await downloadFullBackup();
    } catch (e) {
      console.error("downloadFullBackup fehlgeschlagen:", e);
      setError(t("meineDaten.downloadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">
          {t("meineDaten.title")}
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          {t("meineDaten.subtitle")}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-gray-300">
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            <strong className="text-gray-100">
              {t("meineDaten.bullet1Strong")}
            </strong>{" "}
            {t("meineDaten.bullet1Rest")}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            {t("meineDaten.bullet2Prefix")}{" "}
            <strong className="text-gray-100">
              {t("meineDaten.bullet2Import")}
            </strong>{" "}
            {t("meineDaten.bullet2Middle")}{" "}
            <strong className="text-gray-100">
              {t("meineDaten.bullet2DeleteAccount")}
            </strong>{" "}
            {t("meineDaten.bullet2Suffix")}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            {t("meineDaten.bullet3Prefix")}{" "}
            <strong className="text-gray-100">
              {t("meineDaten.bullet3Daily")}
            </strong>{" "}
            {t("meineDaten.bullet3Suffix")}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>{t("meineDaten.bullet4")}</span>
        </li>
      </ul>

      <div>
        <button
          onClick={() => void onDownload()}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy
            ? t("meineDaten.downloadPreparing")
            : t("meineDaten.downloadButton")}
        </button>
        {error && (
          <div className="mt-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{t("meineDaten.moreToolsHint")}</p>
    </div>
  );
}

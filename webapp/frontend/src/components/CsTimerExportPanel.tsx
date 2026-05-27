// CsTimerExportPanel: exportiert die DB im csTimer-JSON-Format.
// Spiegel zum ImportPanel — wer csTimer als Hauptwerkzeug nutzt
// (oder zurück-migrieren will), bekommt seine Daten zurück.
//
// Was nicht im Export ist (im Hilfetext erklärt):
//  - Hardware-Zuordnung (csTimer kennt es nicht)
//  - Achievements/Challenges (cubetracker-spezifisch)
//
// Wer Voll-Backup will: BackupPanel (sqlite/json) eine Sektion drüber.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { InfoButton } from "./InfoButton";

export function CsTimerExportPanel() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  async function downloadExport() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.get("/export/cstimer");
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      const filename = `cubetracker_cstimer_export_${ts}.txt`;
      // csTimer nutzt .txt mit JSON-content — das ist deren Konvention
      const blob = new Blob([JSON.stringify(r.data)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setLastFilename(filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("csTimerExport.downloadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-gray-100">
          {t("csTimerExport.title")}
        </h2>
        <InfoButton>
          <p className="font-medium mb-1">{t("csTimerExport.title")}</p>
          <p>{t("csTimerExport.infoBody")}</p>
        </InfoButton>
      </div>

      <p className="text-base text-gray-400">{t("csTimerExport.description")}</p>

      <button
        onClick={downloadExport}
        disabled={busy}
        className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {busy ? t("csTimerExport.busy") : t("csTimerExport.button")}
      </button>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {lastFilename && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {t("csTimerExport.doneMessage", { filename: lastFilename })}
        </div>
      )}

      <p className="text-xs text-gray-500">
        <strong>{t("csTimerExport.notInExportStrong")}</strong>
        {t("csTimerExport.notInExportRest")}
      </p>
    </div>
  );
}

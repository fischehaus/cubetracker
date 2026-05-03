// CsTimerExportPanel: exportiert die DB im csTimer-JSON-Format.
// Spiegel zum ImportPanel — wer csTimer als Hauptwerkzeug nutzt
// (oder zurueck-migrieren will), bekommt seine Daten zurueck.
//
// Was nicht im Export ist (im Hilfetext erklaert):
//  - Hardware-Zuordnung (csTimer kennt es nicht)
//  - Achievements/Challenges (cubetracker-spezifisch)
//
// Wer Voll-Backup will: BackupPanel (sqlite/json) eine Sektion drueber.

import { useState } from "react";
import { api } from "../lib/api";

export function CsTimerExportPanel() {
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
      setError(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <h2 className="text-2xl font-semibold text-gray-100">csTimer-Export</h2>

      <p className="text-base text-gray-400">
        Exportiert deine Solves + Sessions im csTimer-JSON-Format. Du
        kannst die Datei in csTimer importieren (Settings → Backup →
        Import) und so cubetracker-Daten dort weiternutzen.
      </p>

      <button
        onClick={downloadExport}
        disabled={busy}
        className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {busy ? "Wird vorbereitet …" : "📤 csTimer-Datei herunterladen"}
      </button>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {lastFilename && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Datei „{lastFilename}" heruntergeladen.
        </div>
      )}

      <p className="text-xs text-gray-500">
        <strong>Nicht im Export</strong>: Hardware-Zuordnung (csTimer
        kennt das Konzept nicht) und cubetracker-Achievements/Challenges.
        Fuer Voll-Backup bitte das BackupPanel oben verwenden.
        Solves ohne Session-Zuordnung landen in einer Pseudo-Session
        „Ohne Session".
      </p>
    </div>
  );
}

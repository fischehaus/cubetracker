// File-Upload-Panel für csTimer-Export-Dateien.
// Zeigt nach Import die Statistik-Zusammenfassung.

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { InfoButton } from "./InfoButton";

interface ImportResult {
  sessions_created: number;
  sessions_updated: number;
  solves_created: number;
  solves_skipped_duplicate: number;
  solves_skipped_invalid: number;
  filename: string;
}

export function ImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post<ImportResult>("/import/cstimer", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        // 5 Min Timeout defensiv. Import von 6000+ Solves hat
        // gemessen ~20s gebraucht; Snapshot+Recheck laufen jetzt
        // im Hintergrund (Backend-Fix 2026-05-12), also sollte der
        // synchron-Anteil unter 30s liegen.
        timeout: 300_000,
      });
      setResult(r.data);
      // Liste + Sessions invalidieren, damit UI die neuen Daten zeigt
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Unbekannter Fehler beim Import";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-gray-100">
          csTimer-Import <span className="text-sm text-gray-500">(Migration aus csTimer)</span>
        </h2>
        <InfoButton>
          <p className="font-medium mb-1">csTimer-Import</p>
          <p>
            Lade deine csTimer-Export-Datei (.txt oder .json) hoch und
            cubetracker übernimmt deinen kompletten Bestand: Sessions,
            Solves, Scrambles, Notizen, +2/DNF-Penalties, Timestamps.
            Re-Import erkennt Duplikate (timestamp + time_ms) automatisch —
            nichts wird doppelt angelegt. Dry-Run-Option zeigt vorher was
            passieren würde.
          </p>
        </InfoButton>
      </div>

      <p className="text-base text-gray-400">
        Lade eine <strong>csTimer-Export-Datei</strong> hoch (.txt oder .json).
        Re-Import erkennt Duplikate automatisch — nichts wird doppelt angelegt.
      </p>

      <p className="text-xs text-gray-500">
        ⚠ Nicht das Cubetracker-Backup-JSON hier hochladen — das gehört
        zu „Backup &amp; Wiederherstellung" oben. csTimer-Export-Dateien
        heissen typischerweise <code>cstimer_YYYYMMDD_HHMMSS.txt</code>.
      </p>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.json"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="block w-full text-base text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-purple-700 file:cursor-pointer disabled:opacity-50"
        />
      </div>

      {busy && (
        <div className="text-base text-purple-300">
          Import läuft … (kann bei großen Dateien 10-30 Sekunden dauern)
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-base text-emerald-200 space-y-1">
          <div className="font-medium">
            Import von „{result.filename}" abgeschlossen.
          </div>
          <ul className="text-sm space-y-0.5 text-emerald-300/90">
            <li>
              <strong>{result.solves_created}</strong> neue Solves
            </li>
            {result.solves_skipped_duplicate > 0 && (
              <li>
                <strong>{result.solves_skipped_duplicate}</strong> als
                Duplikat übersprungen (Re-Import)
              </li>
            )}
            {result.sessions_created > 0 && (
              <li>
                <strong>{result.sessions_created}</strong> neue Sessions
              </li>
            )}
            {result.sessions_updated > 0 && (
              <li>
                <strong>{result.sessions_updated}</strong> Sessions
                aktualisiert
              </li>
            )}
            {result.solves_skipped_invalid > 0 && (
              <li className="text-yellow-300">
                ⚠ {result.solves_skipped_invalid} Solves als ungültig
                übersprungen
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

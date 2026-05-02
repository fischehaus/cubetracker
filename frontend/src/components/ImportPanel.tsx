// File-Upload-Panel fuer csTimer-Export-Dateien.
// Zeigt nach Import die Statistik-Zusammenfassung.

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

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
        timeout: 120_000,
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
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5 space-y-3">
      <h2 className="text-xl font-semibold text-gray-100">csTimer-Import</h2>

      <p className="text-sm text-gray-400">
        Lade die csTimer-Export-Datei (.txt oder .json) hoch. Re-Import
        erkennt Duplikate automatisch — nichts wird doppelt angelegt.
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
          className="block w-full text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-purple-700 file:cursor-pointer disabled:opacity-50"
        />
      </div>

      {busy && (
        <div className="text-sm text-purple-300">
          Import laeuft … (kann bei grossen Dateien 10-30 Sekunden dauern)
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 space-y-1">
          <div className="font-medium">
            Import von „{result.filename}" abgeschlossen.
          </div>
          <ul className="text-xs space-y-0.5 text-emerald-300/90">
            <li>
              <strong>{result.solves_created}</strong> neue Solves
            </li>
            {result.solves_skipped_duplicate > 0 && (
              <li>
                <strong>{result.solves_skipped_duplicate}</strong> als
                Duplikat ueberspruengen (Re-Import)
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
                ⚠ {result.solves_skipped_invalid} Solves als ungueltig
                uebersprungen
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

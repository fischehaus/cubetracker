// BackupPanel: Voll-Backup der App-Daten — zwei Strategien.
//
// SQLite-File: vollstaendig, binaer, gut fuer Migration zwischen
// Rechnern (auf neuem Rechner Datei unter backend/data/solves.db
// ablegen + Backend neu starten).
//
// JSON-Voll-Export: lesbar, schema-versioniert, gut fuer Drittwerkzeuge
// oder Migration zwischen App-Versionen mit Schema-Aenderungen.
//
// Restore ist bewusst NICHT als Upload-Endpoint implementiert — DB-
// Replace waehrend laufendem Server ist fragil. Restore-Anleitung
// (manuelles File-Replace) ist im Hilfe-Text dokumentiert.

import { useState } from "react";
import { api } from "../lib/api";

interface ExportSummary {
  schema_version: string;
  exported_at: string;
  counts: { solves: number; sessions: number; hardware: number };
}

export function BackupPanel() {
  const [busy, setBusy] = useState<"sqlite" | "json" | null>(null);
  const [lastSummary, setLastSummary] = useState<ExportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadSqlite() {
    setBusy("sqlite");
    setError(null);
    try {
      const r = await api.get("/backup/sqlite", { responseType: "blob" });
      // Filename aus Content-Disposition holen, sonst Fallback
      const cd = r.headers["content-disposition"] ?? "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename = match?.[1] ?? "cubetracker_backup.db";
      triggerBlobDownload(r.data, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  async function downloadJson() {
    setBusy("json");
    setError(null);
    try {
      const r = await api.get("/backup/json");
      const data = r.data;
      const ts = new Date()
        .toISOString()
        .replace(/[-:T]/g, "")
        .slice(0, 15);
      const filename = `cubetracker_backup_${ts}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      triggerBlobDownload(blob, filename);
      setLastSummary({
        schema_version: data.schema_version,
        exported_at: data.exported_at,
        counts: data.counts,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-4">
      <h2 className="text-2xl font-semibold text-gray-100">Backup &amp; Export</h2>

      <p className="text-base text-gray-400">
        Voll-Backup deiner Daten — fuer Umzug auf einen anderen Rechner
        oder als regelmaessiger Sicherungspunkt. Die Buttons triggern
        einen Download im Browser.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SQLite-Variante */}
        <div className="rounded border border-gray-700 bg-gray-800/40 p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            SQLite-Datei (.db)
          </h3>
          <p className="text-sm text-gray-400 mb-3 flex-1">
            Vollstaendige binaere Kopie der DB. Empfohlen fuer Umzug auf
            einen anderen Rechner mit derselben App-Version. Restore =
            Datei unter <code className="text-gray-300">backend/data/solves.db</code>{" "}
            ablegen + Backend neu starten.
          </p>
          <button
            onClick={downloadSqlite}
            disabled={busy !== null}
            className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {busy === "sqlite" ? "Wird vorbereitet …" : "📥 .db herunterladen"}
          </button>
        </div>

        {/* JSON-Variante */}
        <div className="rounded border border-gray-700 bg-gray-800/40 p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            JSON-Voll-Export (.json)
          </h3>
          <p className="text-sm text-gray-400 mb-3 flex-1">
            Lesbarer Export aller Tabellen mit Schema-Version. Empfohlen
            fuer Migration zwischen App-Versionen oder Datenuebergabe an
            Drittwerkzeuge. Re-Import folgt in einer spaeteren Phase.
          </p>
          <button
            onClick={downloadJson}
            disabled={busy !== null}
            className="text-base rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {busy === "json" ? "Wird vorbereitet …" : "📥 .json herunterladen"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {lastSummary && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <strong>Letzter JSON-Export:</strong> Schema {lastSummary.schema_version}{" "}
          · {lastSummary.counts.solves} Solves ·{" "}
          {lastSummary.counts.sessions} Sessions ·{" "}
          {lastSummary.counts.hardware} Hardware
        </div>
      )}

      <p className="text-xs text-gray-500">
        Hinweis: Backups enthalten alle Daten auch dieser App (Solves,
        Sessions, Hardware) — sowie spaetere Erweiterungen wie
        Achievements + Challenges. csTimer-Export gibt es separat (nur
        Solves + Sessions, csTimer-Format).
      </p>
    </div>
  );
}

// ============================================================
// Helper: Browser-Download eines Blobs ausloesen
// ============================================================
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

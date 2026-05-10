// BackupPanel: Voll-Backup + Restore der App-Daten.
//
// Drei Funktionen:
// - SQLite-Download: vollstaendige binaere DB-Kopie. Restore via
//   manuellem File-Replace (im Installer-Modus geht das nicht easy).
// - JSON-Download: lesbar, schema-versioniert.
// - JSON-Restore (Phase 9): Upload eines JSON-Backups, ersetzt die
//   gesamte DB. DESTRUKTIV — mit Confirm-Dialog gesichert.

import { useState } from "react";
import { api, useStats } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface ExportSummary {
  schema_version: string;
  exported_at: string;
  counts: { solves: number; sessions: number; hardware: number };
}

interface RestoreDryRun {
  dry_run: true;
  message: string;
  would_restore: { solves: number; sessions: number; hardware: number; achievements: number; challenges: number };
  schema_version: string;
}

interface RestoreDone {
  dry_run: false;
  message: string;
  restored: { solves: number; sessions: number; hardware: number; achievements: number; challenges: number };
  schema_version: string;
}

export function BackupPanel() {
  const [busy, setBusy] = useState<"sqlite" | "json" | "restore-dry" | "restore" | null>(null);
  const [lastSummary, setLastSummary] = useState<ExportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = useState<RestoreDryRun | null>(null);
  const [restoreDone, setRestoreDone] = useState<RestoreDone | null>(null);
  const qc = useQueryClient();
  // useStats hier nicht direkt benoetigt — aber wir invalidieren nach restore
  void useStats;

  async function runRestoreDryRun() {
    if (!restoreFile) return;
    setBusy("restore-dry");
    setError(null);
    setDryRunResult(null);
    setRestoreDone(null);
    try {
      const fd = new FormData();
      fd.append("file", restoreFile);
      const r = await api.post<RestoreDryRun>("/backup/restore", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDryRunResult(r.data);
    } catch (e: unknown) {
      const msg =
        // axios-Style: e.response.data.detail
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.response?.data?.detail ||
        (e instanceof Error ? e.message : "Dry-Run fehlgeschlagen");
      setError(String(msg));
    } finally {
      setBusy(null);
    }
  }

  async function runRestoreConfirmed() {
    if (!restoreFile) return;
    if (
      !confirm(
        "ACHTUNG: Wiederherstellen löscht ALLE aktuellen Daten und ersetzt sie durch das Backup. " +
          "Vorgang kann NICHT rückgängig gemacht werden (außer du hast ein vorheriges Backup).\n\n" +
          "Wirklich fortfahren?",
      )
    ) {
      return;
    }
    setBusy("restore");
    setError(null);
    setRestoreDone(null);
    try {
      const fd = new FormData();
      fd.append("file", restoreFile);
      const r = await api.post<RestoreDone>("/backup/restore?confirm=true", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRestoreDone(r.data);
      setDryRunResult(null);
      // Alle Caches invalidieren — DB ist komplett anders jetzt
      qc.invalidateQueries();
    } catch (e: unknown) {
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.response?.data?.detail ||
        (e instanceof Error ? e.message : "Restore fehlgeschlagen");
      setError(String(msg));
    } finally {
      setBusy(null);
    }
  }

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
        Hinweis: Backups enthalten alle Daten dieser App (Solves,
        Sessions, Hardware, Achievements, Challenges). csTimer-Export
        gibt es separat (nur Solves + Sessions, csTimer-Format).
      </p>

      {/* ============================================================
          Phase 9: JSON-Restore-Upload
          ============================================================ */}
      <div className="rounded border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
        <h3 className="text-lg font-semibold text-amber-200">
          🔄 JSON-Backup wiederherstellen
        </h3>
        <p className="text-sm text-amber-200/80">
          <strong>DESTRUKTIV</strong>: ersetzt ALLE aktuellen Daten durch
          das Backup. Schema-Version muss zur App-Version passen.
          Erst Dry-Run, dann Bestätigen.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setRestoreFile(f);
              setDryRunResult(null);
              setRestoreDone(null);
              setError(null);
            }}
            className="text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-purple-700"
          />
          <button
            onClick={runRestoreDryRun}
            disabled={!restoreFile || busy !== null}
            className="text-sm rounded border border-gray-600 px-3 py-1.5 text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            {busy === "restore-dry" ? "Prüfe …" : "1. Dry-Run prüfen"}
          </button>
          <button
            onClick={runRestoreConfirmed}
            disabled={!restoreFile || !dryRunResult || busy !== null}
            className="text-sm rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy === "restore" ? "Wiederherstelle …" : "2. ⚠ Wiederherstellen (DESTRUKTIV)"}
          </button>
        </div>

        {dryRunResult && (
          <div className="rounded bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm text-blue-200">
            <strong>Dry-Run OK</strong> — Schema {dryRunResult.schema_version},
            würde wiederherstellen: {dryRunResult.would_restore.solves} Solves,
            {dryRunResult.would_restore.sessions} Sessions,
            {dryRunResult.would_restore.hardware} Hardware,
            {dryRunResult.would_restore.achievements} Achievements,
            {dryRunResult.would_restore.challenges} Challenges.
          </div>
        )}

        {restoreDone && (
          <div className="rounded bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-200">
            ✅ <strong>Wiederherstellung erfolgreich</strong> — {restoreDone.restored.solves} Solves,
            {restoreDone.restored.sessions} Sessions importiert. Seite ggf. neu laden.
          </div>
        )}
      </div>
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

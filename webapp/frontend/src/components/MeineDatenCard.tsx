// MeineDatenCard (Roadmap #6) — Daten-Ownership-Botschaft + prominenter
// Voll-Backup-Download. Steht oben im VerwaltungTab -> "Meine Daten".
// Die detaillierten Tools (Restore, Snapshots, Import) leben darunter im
// BackupPanel / ImportPanel.
import { useState } from "react";
import { downloadFullBackup } from "../lib/backup";

export function MeineDatenCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      await downloadFullBackup();
    } catch {
      setError("Backup konnte nicht erstellt werden. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">
          🔒 Deine Daten gehören dir
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Du hast jederzeit die volle Kontrolle über deine Daten.
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-gray-300">
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            <strong className="text-gray-100">Vollständiges Backup</strong> all
            deiner Solves, Sessions, Hardware &amp; Achievements — jederzeit als
            offenes, lesbares JSON.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            Jederzeit wieder{" "}
            <strong className="text-gray-100">importieren</strong> oder deinen{" "}
            <strong className="text-gray-100">Account komplett löschen</strong>{" "}
            (unter „Account").
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            Zusätzlich sichern wir die Datenbank{" "}
            <strong className="text-gray-100">täglich automatisch</strong>{" "}
            (Server in Deutschland/EU) — gegen Datenverlust.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">✓</span>
          <span>
            Kein Verkauf und keine Weitergabe deiner Daten an Dritte zu
            Werbezwecken.
          </span>
        </li>
      </ul>

      <div>
        <button
          onClick={() => void onDownload()}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Wird vorbereitet…" : "📥 Vollständiges Backup herunterladen"}
        </button>
        {error && (
          <div className="mt-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Wiederherstellen, Snapshots &amp; csTimer-Import findest du weiter unten.
      </p>
    </div>
  );
}

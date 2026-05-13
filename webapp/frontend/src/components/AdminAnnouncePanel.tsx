// AdminAnnouncePanel — Bulk-Mail an alle aktiven + verifizierten User.
//
// Workflow:
//   1. Subject + Body tippen
//   2. „Vorschau Empfaenger" -> dry_run -> Backend liefert Empfaenger-Count
//   3. „Wirklich senden" -> echter Versand
//
// Rate-Limit 3/h serverseitig — falls jemand zu oft probiert, kommt 429.

import { useState } from "react";
import { InfoButton } from "./InfoButton";
import {
  useAdminAnnouncement,
  type AdminAnnouncementResult,
} from "../lib/api";

export function AdminAnnouncePanel() {
  const send = useAdminAnnouncement();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [lastResult, setLastResult] = useState<AdminAnnouncementResult | null>(
    null,
  );

  const trim = (s: string) => s.trim();
  const canSubmit = !!trim(subject) && !!trim(body) && !send.isPending;

  const submit = (dryRun: boolean) => {
    send.mutate(
      { subject: trim(subject), body: trim(body), dry_run: dryRun },
      {
        onSuccess: (r) => {
          setLastResult(r);
          if (!dryRun && r.failed === 0) {
            // Erfolgreich an alle versendet -> Formular freuen
            setSubject("");
            setBody("");
          }
        },
      },
    );
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium text-purple-300">
          Bulk-Mail an alle User
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">Bulk-Mail</p>
          <p>
            Schickt eine Mail an alle aktiv+verifiziert User. Dry-Run zeigt
            erst die Empfaenger-Zahl. Rate-Limit 3/h server-seitig.
            Hard-Cap bei 80 Empfaengern (Worker-Timeout-Schutz). Body wird
            HTML-escaped (XSS-Defense). Use-Cases: Wartungs-Ankuendigungen,
            Migration-Hinweise.
          </p>
        </InfoButton>
      </div>
      <p className="text-sm text-gray-400">
        Geht an aktive User mit verifizierter Email. Wartung-/Ankuendigungs-
        Mails. Rate-Limit 3/h. <strong>Erst Dry-Run klicken</strong> um die
        Empfaenger-Zahl zu sehen.
      </p>
      <label className="flex flex-col text-xs text-gray-400">
        Betreff
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            // QA-Fix M3: Wenn nach Dry-Run der Text geaendert wird, gilt
            // die Empfaenger-Vorschau nicht mehr → Bestaetigung zuruecksetzen.
            setLastResult(null);
          }}
          maxLength={120}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          placeholder="z.B. Wartungsfenster Samstag 21:00–22:00"
        />
        <span className="mt-0.5 text-[10px] text-gray-500">
          Wird automatisch zu „[cubetracker] {subject || "…"}"
        </span>
      </label>
      <label className="flex flex-col text-xs text-gray-400">
        Text (Plain, Newlines werden im HTML zu &lt;br&gt;)
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            // QA-Fix M3: s.o. — geaendert nach Dry-Run → erneut pruefen
            setLastResult(null);
          }}
          rows={6}
          maxLength={4000}
          className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
          placeholder="Hi zusammen, am Samstag …"
        />
        <span className="mt-0.5 text-[10px] text-gray-500">
          {body.length} / 4000
        </span>
      </label>

      {send.isError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {send.error?.message}
        </div>
      )}

      {lastResult && (
        <div
          className={`rounded px-3 py-2 text-sm ${
            lastResult.dry_run
              ? "border border-blue-500/40 bg-blue-500/10 text-blue-200"
              : lastResult.failed === 0
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
          }`}
        >
          {lastResult.dry_run ? (
            <>
              <strong>Dry-Run:</strong> wuerde an{" "}
              <strong>{lastResult.recipient_count}</strong> Empfaenger gehen.
              {lastResult.over_cap ? (
                <span className="mt-1 block text-yellow-300">
                  ⚠ Ueber dem Server-Cap von {lastResult.max_recipients}
                  {" "}Empfaengern. Echter Send wird mit 400 abgelehnt — erst
                  Background-Job-Setup oder User-Filter noetig.
                </span>
              ) : (
                <> Wenn das passt → „Wirklich senden" klicken.</>
              )}
            </>
          ) : (
            <>
              <strong>Versendet:</strong> {lastResult.sent} ok,{" "}
              {lastResult.failed} fehlgeschlagen von{" "}
              {lastResult.recipient_count} Empfaengern.
              {lastResult.failures && lastResult.failures.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs">
                    Fehler-Details ({lastResult.failures.length})
                  </summary>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    {lastResult.failures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => submit(true)}
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {send.isPending && send.variables?.dry_run
            ? "Pruefe …"
            : "Empfaenger-Vorschau (Dry-Run)"}
        </button>
        <button
          onClick={() => submit(false)}
          disabled={
            !canSubmit ||
            !lastResult?.dry_run ||
            lastResult?.over_cap === true
          }
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            !lastResult?.dry_run
              ? "Erst Dry-Run klicken — die Vorschau ist Pflicht."
              : lastResult?.over_cap
                ? "Ueber Server-Cap — echter Send wuerde 400."
                : ""
          }
        >
          {send.isPending && !send.variables?.dry_run
            ? "Sende an alle …"
            : "Wirklich senden"}
        </button>
      </div>
    </div>
  );
}

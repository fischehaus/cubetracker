// DangerZoneCard (W.danger-zone) — drei abgestufte Lösch-Aktionen unter
// "Meine Daten". Sanft (Solves zurücksetzen) → mittel (Tracking-Daten /
// Reset to factory) → radikal (Account komplett löschen). Jede Aktion
// mit 2-Klick-Bestätigung (5s Auto-Reset) + prominentem Backup-Hinweis.
//
// Account-Löschung war bisher nur in den Account-Einstellungen — hier
// thematisch zusammen mit den anderen Datenhoheits-Aktionen.

import { useEffect, useState } from "react";
import {
  useDeleteAccount,
  useResetSolves,
  useResetTracking,
} from "../lib/api";
import { downloadFullBackup } from "../lib/backup";

type Armed = null | "solves" | "tracking" | "account";

export function DangerZoneCard() {
  const [armed, setArmed] = useState<Armed>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  const resetSolves = useResetSolves();
  const resetTracking = useResetTracking();
  const deleteAccount = useDeleteAccount();

  // 2-Klick-Pattern: armed-State automatisch nach 5s zurücksetzen,
  // damit "vergessene" Bestätigungs-Buttons nicht stehen bleiben.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  async function onBackup() {
    setBackupBusy(true);
    try {
      await downloadFullBackup();
    } catch (e) {
      console.error("downloadFullBackup fehlgeschlagen:", e);
    } finally {
      setBackupBusy(false);
    }
  }

  function handleExecute(which: NonNullable<Armed>) {
    if (armed !== which) {
      // Erster Klick: aktiviert den Bestätigungs-Modus für 5s.
      setArmed(which);
      setDoneMsg(null);
      return;
    }
    // Zweiter Klick: jetzt wirklich ausführen.
    setArmed(null);
    if (which === "solves") {
      resetSolves.mutate(undefined, {
        onSuccess: () =>
          setDoneMsg(
            "✓ Alle Solves wurden gelöscht. Sessions, Hardware und Achievements sind erhalten.",
          ),
      });
    } else if (which === "tracking") {
      resetTracking.mutate(undefined, {
        onSuccess: () =>
          setDoneMsg(
            "✓ Tracking-Daten zurückgesetzt — Account und Hardware-Inventar bleiben (dein Setup).",
          ),
      });
    } else if (which === "account") {
      // useDeleteAccount macht selbst Token-Cleanup + redirect zur Login-Seite.
      deleteAccount.mutate();
    }
  }

  const errorMsg =
    resetSolves.error?.message ||
    resetTracking.error?.message ||
    deleteAccount.error?.message ||
    null;

  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
          <span aria-hidden>⚠</span> Gefahren-Bereich
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Diese Aktionen können{" "}
          <strong className="text-red-300">nicht rückgängig gemacht werden</strong>.
          Jede Aktion erfordert eine zweite Bestätigung innerhalb von 5 Sekunden.
        </p>
      </div>

      <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
        <strong>💾 Vorher Backup runterladen?</strong>{" "}
        <button
          onClick={() => void onBackup()}
          disabled={backupBusy}
          className="underline text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
        >
          {backupBusy ? "Wird vorbereitet…" : "Backup jetzt herunterladen"}
        </button>
      </div>

      {doneMsg && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {doneMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded border border-red-500/50 bg-red-500/15 p-3 text-sm text-red-200">
          Fehler: {errorMsg}
        </div>
      )}

      <DangerAction
        title="Solves zurücksetzen"
        desc="Alle deine Solves werden gelöscht. Sessions, Hardware-Inventar, Achievements und dein Account bleiben unangetastet."
        useCase="Use-Case: Test-Daten weg, mit eigenem Hardware-Setup neu anfangen."
        buttonLabel="Alle Solves löschen"
        armed={armed === "solves"}
        busy={resetSolves.isPending}
        onClick={() => handleExecute("solves")}
      />

      <DangerAction
        title="Tracking-Daten zurücksetzen (Reset to factory)"
        desc="Solves + Sessions + Achievements + Daily-Challenges-Historie werden gelöscht. Account und Hardware-Inventar bleiben — dein Setup."
        useCase="Use-Case: Kompletter Neustart, aber Cube-Sammlung behalten."
        buttonLabel="Tracking-Daten zurücksetzen"
        armed={armed === "tracking"}
        busy={resetTracking.isPending}
        onClick={() => handleExecute("tracking")}
      />

      <DangerAction
        title="Account komplett löschen"
        desc="DSGVO: Alle deine Daten inkl. Login werden unwiderruflich gelöscht. Danach wirst du automatisch ausgeloggt."
        useCase="Use-Case: Vollständiger Rückzug von cubetracker."
        buttonLabel="Account löschen"
        armed={armed === "account"}
        busy={deleteAccount.isPending}
        onClick={() => handleExecute("account")}
      />
    </div>
  );
}

interface DangerActionProps {
  title: string;
  desc: string;
  useCase: string;
  buttonLabel: string;
  armed: boolean;
  busy: boolean;
  onClick: () => void;
}

function DangerAction(props: DangerActionProps) {
  return (
    <div className="rounded border border-gray-700 bg-gray-900/40 p-4 space-y-2">
      <h3 className="text-base font-semibold text-gray-100">{props.title}</h3>
      <p className="text-sm text-gray-300">{props.desc}</p>
      <p className="text-xs text-gray-500 italic">{props.useCase}</p>
      <button
        onClick={props.onClick}
        disabled={props.busy}
        className={
          props.armed
            ? "rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 animate-pulse disabled:opacity-50"
            : "rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-300 font-medium hover:bg-red-500/20 disabled:opacity-50"
        }
        title={
          props.armed
            ? "Innerhalb 5 Sekunden bestätigen, sonst wird abgebrochen"
            : "Erster Klick aktiviert, zweiter Klick (innerhalb 5s) führt aus"
        }
      >
        {props.busy
          ? "Wird ausgeführt…"
          : props.armed
            ? "Wirklich? Nochmal klicken (5s)"
            : props.buttonLabel}
      </button>
    </div>
  );
}

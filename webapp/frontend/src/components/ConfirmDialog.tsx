// ConfirmDialog (W.confirm-dialog, 2026-06-07) — barrierefreie In-App-
// Bestätigung als Ersatz für das native window.confirm(). Vorteile gegenüber
// confirm(): zuverlässig auf Mobile-Browsern, Screenreader-tauglich
// (role="dialog" + aria + Fokus-Trap), konsistent mit dem App-Design
// (ui/Button), und Esc/Backdrop/Tab verhalten sich wie bei jedem App-Modal.
//
// Steuerung liegt beim Parent: die Komponente wird nur gemountet, wenn sie
// offen sein soll (parent-gated). `onConfirm` entscheidet, was passiert (z.B.
// eine Mutation), `onClose` ist Abbrechen/Backdrop/Esc. Während einer
// laufenden Aktion `busy` setzen → Buttons + Esc/Backdrop sind dann gesperrt.

import { useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { Button } from "./ui";

interface Props {
  /** Frage / Body-Text des Dialogs. */
  message: ReactNode;
  /** Aktion bei Bestätigung. */
  onConfirm: () => void;
  /** Abbrechen (Backdrop, Esc, Abbrechen-Button). */
  onClose: () => void;
  /** Label des Bestätigen-Buttons (Default: „Löschen"). */
  confirmLabel?: string;
  /** Variante des Bestätigen-Buttons (Default: danger / rot). */
  confirmVariant?: "danger" | "primary";
  /** Läuft die Aktion noch? Dann Buttons + Esc/Backdrop sperren. */
  busy?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onClose,
  confirmLabel,
  confirmVariant = "danger",
  busy = false,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const msgId = useId();
  // Während die Aktion läuft, kein Esc-Close (man würde sonst mitten in der
  // Mutation schließen). Der Fokus-Trap selbst bleibt aktiv.
  useFocusTrap(dialogRef, busy ? undefined : onClose);

  return (
    <div
      // z-[60] > z-50 der übrigen Modals: ein Confirm kann ÜBER einem Modal
      // (z.B. SolveDetailModal) liegen und muss darüber sichtbar sein. Die
      // Tastatur-Hoheit regelt der Trap-Stack im useFocusTrap-Hook.
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={busy ? undefined : onClose}
      // alertdialog = semantisch korrekt für eine Bestätigung, die eine
      // Antwort erfordert (Screenreader kündigt sie dringlicher an als ein
      // generisches dialog). Die kurze Frage dient als zugänglicher Name.
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={msgId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id={msgId} className="text-sm text-gray-200 whitespace-pre-line">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {confirmLabel ?? t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ToastHost (W.toast-manager, 2026-05-30): zentraler Render-Layer für
// alle Toasts. EIN <ToastHost /> in App.tsx ersetzt die vorher
// individuellen Render-Sektionen der 3 Spezial-Toaster.
//
// Architektur:
// - Subscribt auf den Singleton-Store (lib/toast.ts) via
//   useSyncExternalStore (React-18-idiomatisch für externe Stores).
// - Gruppiert nach Position (4 Eck-Stacks: TR / TL / BR / BL).
// - Pro Stack: max 5 sichtbar + ein „+N weitere"-Summen-Toast +
//   „Alle ausblenden"-Knopf (analog Achievement/Challenge alt).
// - Auto-Dismiss-Timer pro Toast (useEffect mit cleanup je Mount).
// - Severity-spezifische Farben + Default-Icons. Override via toast.icon
//   möglich.

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  type Toast,
  type ToastPosition,
  type ToastSeverity,
  dismissAllToasts,
  dismissToast,
  subscribe,
} from "../lib/toast";

const MAX_VISIBLE = 5;

// Severity-spezifische Styling-Tokens. Tailwind-Strings müssen STATISCH
// erscheinen (kein dynamisch zusammengesetzter Class-String), damit der
// JIT-Compiler sie behält — darum hier komplette Klassen-Strings.
const SEVERITY_STYLES: Record<
  ToastSeverity,
  {
    border: string;
    bg: string;
    titleColor: string;
    textColor: string;
    iconColor: string;
    closeColor: string;
    moreBg: string;
    moreText: string;
    defaultIcon: string;
  }
> = {
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    titleColor: "text-emerald-100",
    textColor: "text-emerald-200/90",
    iconColor: "text-emerald-200",
    closeColor: "text-emerald-300/60 hover:text-emerald-200",
    moreBg: "bg-emerald-500/10 border-emerald-500/40",
    moreText: "text-emerald-200",
    defaultIcon: "✓",
  },
  info: {
    border: "border-blue-500/40",
    bg: "bg-blue-500/10",
    titleColor: "text-blue-100",
    textColor: "text-blue-200/90",
    iconColor: "text-blue-200",
    closeColor: "text-blue-300/60 hover:text-blue-200",
    moreBg: "bg-blue-500/10 border-blue-500/40",
    moreText: "text-blue-200",
    defaultIcon: "ℹ",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    titleColor: "text-amber-100",
    textColor: "text-amber-200/90",
    iconColor: "text-amber-200",
    closeColor: "text-amber-300/60 hover:text-amber-200",
    moreBg: "bg-amber-500/10 border-amber-500/40",
    moreText: "text-amber-200",
    defaultIcon: "⚠",
  },
  error: {
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    titleColor: "text-red-100",
    textColor: "text-red-200/90",
    iconColor: "text-red-200",
    closeColor: "text-red-300/60 hover:text-red-200",
    moreBg: "bg-red-500/10 border-red-500/40",
    moreText: "text-red-200",
    defaultIcon: "✗",
  },
  achievement: {
    border: "border-yellow-500/40",
    bg: "bg-yellow-500/10",
    titleColor: "text-yellow-100",
    textColor: "text-yellow-200/80",
    iconColor: "text-yellow-100",
    closeColor: "text-yellow-300/60 hover:text-yellow-200",
    moreBg: "bg-yellow-500/10 border-yellow-500/40",
    moreText: "text-yellow-200",
    defaultIcon: "🏆",
  },
  challenge: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    titleColor: "text-emerald-100",
    textColor: "text-emerald-200/80",
    iconColor: "text-emerald-100",
    closeColor: "text-emerald-300/60 hover:text-emerald-200",
    moreBg: "bg-emerald-500/10 border-emerald-500/40",
    moreText: "text-emerald-200",
    defaultIcon: "🎯",
  },
};

// Positions-spezifische fixed-Klassen. Wieder: statische Tailwind-Strings.
const POSITION_CLASSES: Record<ToastPosition, string> = {
  TR: "fixed top-4 right-4",
  TL: "fixed top-4 left-4",
  BR: "fixed bottom-4 right-4",
  BL: "fixed bottom-4 left-4",
};

const ALL_POSITIONS: ToastPosition[] = ["TR", "TL", "BR", "BL"];

export function ToastHost() {
  // QA-Fix W.toast-manager-qa: per-Instance-Closures statt Modul-Level-
  // Snapshot, damit mehrere ToastHost-Instanzen (Edge-Case: Modal mit
  // eigenem ToastHost) sich nicht denselben Snapshot teilen.
  const snapshotRef = useRef<Toast[]>([]);
  const { ssubscribe, getSnapshot } = useMemo(
    () => ({
      ssubscribe: (cb: () => void): (() => void) =>
        subscribe((next) => {
          snapshotRef.current = next;
          cb();
        }),
      getSnapshot: (): Toast[] => snapshotRef.current,
    }),
    [],
  );
  const toasts = useSyncExternalStore(ssubscribe, getSnapshot, getSnapshot);
  return (
    <>
      {/* QA-Fix W.toast-manager-qa: zentraler aria-live-Announcer fuer
          Screen-Reader. Aggregiert alle aktiven Toasts in eine sr-only-
          Region. Einzelne ToastCards haben deshalb KEIN aria-live mehr
          (sonst wuerden Multi-Stacks 4× sprechen). */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {toasts
          .map((t) => (t.title ? `${t.title}: ${t.message}` : t.message))
          .join(". ")}
      </div>
      {ALL_POSITIONS.map((pos) => {
        const stack = toasts.filter((t) => (t.position ?? "TR") === pos);
        if (stack.length === 0) return null;
        return <ToastStack key={pos} position={pos} toasts={stack} />;
      })}
    </>
  );
}

function ToastStack({
  position,
  toasts,
}: {
  position: ToastPosition;
  toasts: Toast[];
}) {
  const visible = toasts.slice(-MAX_VISIBLE);
  const hiddenCount = Math.max(0, toasts.length - MAX_VISIBLE);
  return (
    <div
      className={`${POSITION_CLASSES[position]} z-50 flex flex-col gap-2 max-w-xs`}
    >
      {visible.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
      {hiddenCount > 0 && (
        // QA-Fix W.toast-manager-qa: Severity des aeltesten VERSTECKTEN
        // Toasts (= toasts[0], weil Push-Reihenfolge), nicht des juengsten
        // sichtbaren. So passt die Farbe zu „... noch X aelteren weitere".
        <MoreCard severity={toasts[0].severity} count={hiddenCount} />
      )}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const { t: tr } = useTranslation();
  const styles = SEVERITY_STYLES[toast.severity];
  const icon = toast.icon ?? styles.defaultIcon;

  // Auto-Dismiss-Timer. autoDismissMs = 0 oder undefined → kein Timer.
  useEffect(() => {
    if (!toast.autoDismissMs) return;
    const timer = window.setTimeout(
      () => dismissToast(toast.id),
      toast.autoDismissMs,
    );
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.autoDismissMs]);

  const cardClasses = `rounded-lg border ${styles.border} ${styles.bg} backdrop-blur p-4 shadow-lg flex items-start gap-3 transition-opacity duration-200`;
  // QA-Fix W.toast-manager-qa: titleColor (heller) für Title, textColor
  // (gedimmt) für Message — semantisch passend.
  const titleNode = toast.title && (
    <div className={`text-sm uppercase tracking-wide ${styles.titleColor}`}>
      {toast.title}
    </div>
  );
  const messageNode = (
    <div
      className={`${toast.title ? "mt-0.5 text-sm" : "text-sm"} ${styles.textColor}`}
    >
      {toast.message}
    </div>
  );
  const innerBody = (
    <>
      <span className={`text-2xl shrink-0 ${styles.iconColor}`}>{icon}</span>
      <div className="flex-1 min-w-0 text-left">
        {titleNode}
        {messageNode}
      </div>
    </>
  );

  // onClick → ganze Karte wird klickbar (Button), sonst klassisches Div.
  if (toast.onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          toast.onClick?.();
          dismissToast(toast.id);
        }}
        className={`${cardClasses} cursor-pointer hover:brightness-110 text-left`}
      >
        {innerBody}
        <CloseButton
          severity={toast.severity}
          onClick={(e) => {
            e.stopPropagation();
            dismissToast(toast.id);
          }}
          aria={tr("toast.closeAria")}
        />
      </button>
    );
  }

  return (
    <div className={cardClasses} role="status">
      {innerBody}
      <CloseButton
        severity={toast.severity}
        onClick={() => dismissToast(toast.id)}
        aria={tr("toast.closeAria")}
      />
    </div>
  );
}

function CloseButton({
  severity,
  onClick,
  aria,
}: {
  severity: ToastSeverity;
  onClick: (e: React.MouseEvent) => void;
  aria: string;
}) {
  const styles = SEVERITY_STYLES[severity];
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      className={`text-xl leading-none -mt-1 cursor-pointer ${styles.closeColor}`}
      aria-label={aria}
    >
      ×
    </span>
  );
}

function MoreCard({
  severity,
  count,
}: {
  severity: ToastSeverity;
  count: number;
}) {
  const { t } = useTranslation();
  const styles = SEVERITY_STYLES[severity];
  return (
    <div
      className={`rounded border ${styles.moreBg} px-3 py-2 text-sm ${styles.moreText} flex items-center gap-2`}
    >
      <span>{t("toast.moreCount", { count })}</span>
      <button
        type="button"
        onClick={dismissAllToasts}
        className="ml-auto text-xs underline hover:brightness-110"
      >
        {t("toast.dismissAll")}
      </button>
    </div>
  );
}

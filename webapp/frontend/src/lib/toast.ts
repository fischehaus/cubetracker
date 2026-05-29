/**
 * Zentraler Toast-Manager (W.toast-manager, 2026-05-30).
 *
 * Vorher: 3 separate Toaster-Komponenten (AchievementToaster,
 * ChallengeCompletionToaster, FeedbackUnreadToaster) — jeweils mit
 * eigenem useState, eigenem Auto-Dismiss-Timer, eigenem Stack-Cap,
 * fast wortgleichem JSX. Die ersten zwei waren ~90% Code-Doppel
 * (nur Position + Farbe + Lookup-Source unterschiedlich).
 *
 * Jetzt: ein zentraler Pub-Sub-Store. Trigger-Komponenten (oder
 * beliebiger Code) pushen via `toast.success(...)` / `toast.error(...)`
 * / `toast.achievement(...)` / `toast.challenge(...)`. Eine einzige
 * <ToastHost />-Komponente in App.tsx rendert alle Toasts gruppiert
 * nach Position (4 Eck-Stacks), mit Auto-Dismiss + Max-Visible-Cap +
 * "+N weitere"-Summen-Toast pro Position.
 *
 * Design-Entscheidungen:
 *
 * 1. **Singleton-Store** statt React-Context, weil:
 *    - Toasts können aus Nicht-React-Code getriggert werden (z.B.
 *      axios-Interceptor in api.ts — der hat keinen Context).
 *    - Keine Provider-Re-Render-Pflicht bei jedem neuen Toast.
 *
 * 2. **Pub-Sub mit Set<Listener>** statt Redux/Zustand-Store —
 *    konsistent mit dem bestehenden `onAchievementUnlocked` /
 *    `onChallengeCompleted`-Pattern in api.ts. Minimal-Footprint.
 *
 * 3. **Position-Stacks** (4 Ecken): unterschiedliche Severities
 *    landen an semantisch sinnvollen Stellen — Achievement / Challenge
 *    weiterhin bottom-right/bottom-left (vertraute UI), neue Info-
 *    /Error-Toasts top-right (Standard für Notifications).
 *
 * 4. **Severity steuert Farbe + Default-Position + Default-Icon**, kann
 *    aber pro-Toast überschrieben werden (z.B. Feedback-Toast nutzt
 *    `severity: "info"` aber position TR mit Click-Handler).
 *
 * 5. **AutoDismiss = 0 → bleibt offen** bis User dismissed. Wichtig
 *    für persistente Hinweise (z.B. WCA-503-Banner-Pattern, falls
 *    künftig als Toast statt eigenes Banner).
 */

export type ToastSeverity =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "achievement"
  | "challenge";

export type ToastPosition = "TR" | "TL" | "BR" | "BL";

export interface Toast {
  /** Eindeutige ID, auto-generiert wenn nicht angegeben. */
  id: number;
  severity: ToastSeverity;
  /** Optionaler Titel (fett, oben im Toast). */
  title?: string;
  /** Haupt-Text. */
  message: string;
  /** Optionales Icon (Emoji-String) — überschreibt Default je Severity. */
  icon?: string;
  /** Auto-Dismiss in ms. 0 oder undefined = bleibt bis User-Dismiss. */
  autoDismissMs?: number;
  /** Position-Stack. Default abhängig von Severity. */
  position?: ToastPosition;
  /** Click-Handler für den Toast-Body (z.B. zum Navigieren). */
  onClick?: () => void;
  /** Wird im DOM nicht angezeigt — interner Marker für „nur einmal
   *  per Mount pushen"-Pattern (verhindert Duplikate bei Re-Renders). */
  dedupKey?: string;
}

export type ToastInput = Omit<Toast, "id"> & { id?: number };

type Listener = (toasts: Toast[]) => void;

// =====================================================================
// Singleton-Store
// =====================================================================

let nextId = 1;
let toasts: Toast[] = [];
const listeners: Set<Listener> = new Set();
const seenDedupKeys: Set<string> = new Set();

function notify(): void {
  // Defensive Kopie, damit Listener nicht versehentlich am State mutieren.
  const snapshot = [...toasts];
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch (err) {
      // Listener-Crashes dürfen den Store nicht killen.
      // eslint-disable-next-line no-console
      console.error("[toast] listener threw:", err);
    }
  }
}

/** Subscribt auf alle Store-Änderungen. Rückgabe: unsubscribe-fn. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Sofort den aktuellen Stand pushen, damit der Subscriber konsistent
  // startet (z.B. wenn ein Toast schon vor Mount des ToastHost gepusht
  // wurde — kann passieren bei axios-Interceptor während App.tsx mountet).
  fn([...toasts]);
  return () => {
    listeners.delete(fn);
  };
}

/** Schiebt einen neuen Toast in den Store. Rückgabe: id zum späteren
 *  Dismissen. dedupKey verhindert Duplikate (Toast mit gleichem dedupKey
 *  wird ignoriert solange er noch existiert). */
export function pushToast(input: ToastInput): number {
  if (input.dedupKey && seenDedupKeys.has(input.dedupKey)) {
    // bereits ein Toast mit diesem Key aktiv → ignorieren
    const existing = toasts.find((t) => t.dedupKey === input.dedupKey);
    return existing?.id ?? -1;
  }
  const id = input.id ?? nextId++;
  const toast: Toast = { ...input, id };
  toasts = [...toasts, toast];
  if (toast.dedupKey) seenDedupKeys.add(toast.dedupKey);
  notify();
  return id;
}

/** Entfernt einen Toast aus dem Store. Idempotent. */
export function dismissToast(id: number): void {
  const target = toasts.find((t) => t.id === id);
  if (!target) return;
  toasts = toasts.filter((t) => t.id !== id);
  if (target.dedupKey) seenDedupKeys.delete(target.dedupKey);
  notify();
}

/** Entfernt ALLE Toasts (z.B. „Alle ausblenden"-Button).
 *
 * Hinweis (QA-NICE): Setzt auch den `seenDedupKeys`-Set zurueck. D.h.
 * ein identischer Toast (gleicher dedupKey) der danach gepusht wird,
 * kommt durch — gewollt, weil der User aktiv „alle weg"-geklickt hat
 * und ggf. dieselbe Info gleich wieder ansehen koennen soll. */
export function dismissAllToasts(): void {
  toasts = [];
  seenDedupKeys.clear();
  notify();
}

// =====================================================================
// Convenience-API: severity-spezifische One-Shot-Pusher.
//
// Jede Funktion hat sinnvolle Defaults (Position + AutoDismiss) für
// ihre Severity, kann aber per Override-Object angepasst werden.
// =====================================================================

const SUCCESS_DEFAULT_MS = 4000;
const INFO_DEFAULT_MS = 5000;
const WARNING_DEFAULT_MS = 6000;
const ERROR_DEFAULT_MS = 0; // Errors bleiben bis User-Dismiss
const ACHIEVEMENT_DEFAULT_MS = 5000;
const CHALLENGE_DEFAULT_MS = 5000;

type Override = Partial<Omit<ToastInput, "severity" | "message">>;

/**
 * `toast.*`-API für den häufigen One-Shot-Aufruf. Beispiele:
 *
 *   toast.success("Solve gespeichert");
 *   toast.error("Server nicht erreichbar");
 *   toast.achievement({ title: "PB!", message: "ao12 unter 12s", icon: "🏆" });
 *   toast.challenge({ title: "Daily-Streak +1", message: "5 in Folge", icon: "🔥" });
 *
 * Für selten benötigte Varianten direkt `pushToast({...})` nutzen.
 */
export const toast = {
  success: (message: string, override: Override = {}): number =>
    pushToast({
      severity: "success",
      message,
      autoDismissMs: SUCCESS_DEFAULT_MS,
      position: "TR",
      ...override,
    }),
  info: (message: string, override: Override = {}): number =>
    pushToast({
      severity: "info",
      message,
      autoDismissMs: INFO_DEFAULT_MS,
      position: "TR",
      ...override,
    }),
  warning: (message: string, override: Override = {}): number =>
    pushToast({
      severity: "warning",
      message,
      autoDismissMs: WARNING_DEFAULT_MS,
      position: "TR",
      ...override,
    }),
  error: (message: string, override: Override = {}): number =>
    pushToast({
      severity: "error",
      message,
      autoDismissMs: ERROR_DEFAULT_MS,
      position: "TR",
      ...override,
    }),
  achievement: (
    input: { title: string; message: string; icon?: string },
    override: Override = {},
  ): number =>
    pushToast({
      severity: "achievement",
      title: input.title,
      message: input.message,
      icon: input.icon,
      autoDismissMs: ACHIEVEMENT_DEFAULT_MS,
      position: "BR",
      ...override,
    }),
  challenge: (
    input: { title: string; message: string; icon?: string },
    override: Override = {},
  ): number =>
    pushToast({
      severity: "challenge",
      title: input.title,
      message: input.message,
      icon: input.icon,
      autoDismissMs: CHALLENGE_DEFAULT_MS,
      position: "BL",
      ...override,
    }),
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};

// =====================================================================
// Debug-Helper (nur dev): window.__toast für manuelles Testen
// =====================================================================
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __toast: typeof toast }).__toast = toast;
}

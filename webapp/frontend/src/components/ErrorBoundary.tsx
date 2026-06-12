// ErrorBoundary (W.ops-hardening, 2026-06-12).
//
// Letztes Netz für die Live-App: vorher white-screente JEDER unbehandelte
// Render-Fehler die komplette App ohne Hinweis. Häufigster realer Fall:
// Chunk-Load-Fehler nach einem Deploy (User hat altes index.html im Tab,
// die alten Lazy-Chunks existieren auf dem Server nicht mehr) — dafür gibt
// es eine eigene Erkennung + "Neu laden"-Empfehlung.
//
// Klassen-Komponente (React-Boundary-API gibt es nur als Klasse) → keine
// Hooks; Übersetzung läuft direkt über das i18next-Singleton. Sprachwechsel
// während der Fehleranzeige re-rendert nicht — für einen Crash-Screen ok.
//
// Einsatz: einmal um die ganze App (main.tsx) + um die Lazy-Chart-Suspenses
// (LazyCharts.tsx, mit compact-Variante damit nur die Chart-Karte ausfällt
// statt der ganzen Seite).

import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../i18n";

/** Heuristik über die gängigen Browser-Meldungen für fehlgeschlagene
 *  dynamische Imports (Chrome/Firefox/Safari formulieren unterschiedlich).
 *  "load failed" ist Safaris generischer TypeError für fehlgeschlagene
 *  Fetches — Fehler, die bis zur Boundary durchschlagen UND so heißen,
 *  sind praktisch immer Chunk-Loads (QA-Hinweis W.ops-hardening). */
const CHUNK_ERROR_RE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .* failed|chunkloaderror|load failed/i;

interface Props {
  children: ReactNode;
  /** compact: kleine Inline-Karte (z.B. Chart-Slot) statt Vollbild-Screen. */
  compact?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kein Error-Tracking (Sentry o.ä.) vorhanden — Konsole ist aktuell
    // der einzige Kanal. Bewusst geloggt, damit User-Reports ("weißer
    // Bildschirm") wenigstens per DevTools diagnostizierbar sind.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = CHUNK_ERROR_RE.test(error.message);
    const title = isChunkError
      ? i18n.t("errorBoundary.chunkTitle")
      : i18n.t("errorBoundary.title");
    const body = isChunkError
      ? i18n.t("errorBoundary.chunkBody")
      : i18n.t("errorBoundary.body");

    if (this.props.compact) {
      return (
        <div
          role="alert"
          className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-center"
        >
          <p className="text-sm text-gray-300">{title}</p>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            {i18n.t("errorBoundary.reload")}
          </button>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-gray-950 p-6"
      >
        <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 text-center">
          <p className="text-4xl" aria-hidden="true">
            🧊
          </p>
          <h1 className="mt-3 text-lg font-semibold text-gray-100">{title}</h1>
          <p className="mt-2 text-sm text-gray-400">{body}</p>
          <button
            type="button"
            onClick={this.reload}
            className="mt-5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            {i18n.t("errorBoundary.reload")}
          </button>
        </div>
      </div>
    );
  }
}

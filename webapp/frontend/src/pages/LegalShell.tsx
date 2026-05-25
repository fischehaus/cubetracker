/**
 * Gemeinsames Layout für die öffentlichen Rechtsseiten (Impressum +
 * Datenschutz). Standalone (ohne App-Chrome), erreichbar ohne Login —
 * gerendert via pathname-Check in App.tsx.
 */
import type { ReactNode } from "react";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 underline"
        >
          ← zurück zur App
        </a>

        <h1 className="mt-4 mb-6 text-3xl font-bold text-gray-100">{title}</h1>

        <div className="space-y-6 text-[15px] leading-relaxed text-gray-300">
          {children}
        </div>

        <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-gray-800 pt-4 text-xs text-gray-500">
          <a href="/impressum" className="hover:text-gray-200 underline">
            Impressum
          </a>
          <span aria-hidden="true">·</span>
          <a href="/datenschutz" className="hover:text-gray-200 underline">
            Datenschutz
          </a>
          <span aria-hidden="true">·</span>
          <a href="/" className="hover:text-gray-200 underline">
            cubetracker
          </a>
        </footer>
      </div>
    </div>
  );
}

/** Abschnitts-Überschrift im einheitlichen Stil der Rechtsseiten. */
export function LegalHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-100">{children}</h2>
  );
}

// accountForm — geteilte Form-Helfer für Konto-/Profil-Panels.
//
// Extrahiert (W.ia-profil-bereich, 2026-05-31) aus AccountSettingsPanel, damit
// sowohl AccountSettingsPanel (Sicherheit: Passwort/Email/Löschen) als auch
// ProfilView (Identität: Name/Land/WCA-ID/Auffindbarkeit) dieselben Bausteine
// nutzen, ohne sie zu duplizieren.

import type { ReactNode } from "react";

export function Card({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border ${
        danger ? "border-red-500/40 bg-red-500/5" : "border-gray-700 bg-gray-900/50"
      } p-4`}
    >
      <h3
        className={`text-lg font-semibold mb-2 ${
          danger ? "text-red-200" : "text-gray-100"
        }`}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FeedbackOk({ text }: { text: string }) {
  return (
    <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

export function FeedbackErr({ text }: { text: string }) {
  return (
    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

export function extractErrorMessage(
  err: unknown,
  t: (key: string) => string,
): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return t("accountSettings.unknownError");
}

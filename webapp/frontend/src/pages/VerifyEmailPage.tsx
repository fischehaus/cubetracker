/**
 * VerifyEmailPage — Landing für Mail-Link
 * `https://www.cubetracker.de/verify-email?token=...`
 *
 * Triggert auto den Verify-Call. Falls erfolgreich + User bereits
 * eingeloggt: refreshMe damit email_verified-Status in der UI aktuell wird.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type State = "running" | "ok" | "fail";

export function VerifyEmailPage() {
  const { isAuthenticated, refreshMe } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [state, setState] = useState<State>(token ? "running" : "fail");
  const [error, setError] = useState<string | null>(null);

  // Single-Shot-Flag: verhindert doppeltes Feuern in React-19-StrictMode
  // (DEV-only) ODER wenn deps wie isAuthenticated/refreshMe sich ändern
  // nachdem der erste Call schon den Token "used" markiert hat. Sonst
  // sieht die UI 400 "abgelaufen" trotz erfolgreicher Verifizierung.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    let cancelled = false;
    async function run() {
      try {
        await api.post("/auth/verify-email", { token });
        if (cancelled) return;
        setState("ok");
        // Falls eingeloggt: User-State aktualisieren damit Banner verschwindet
        if (isAuthenticated) {
          await refreshMe();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError(extractErrorMessage(err));
        setState("fail");
      }
    }
    void run();

    return () => {
      cancelled = true;
    };
    // Nur token als dep — isAuthenticated/refreshMe nutzen wir aus
    // closure (waeren sonst weitere Re-Runs nach Mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          Email-Verifizierung
        </h1>

        {state === "running" && (
          <p className="text-sm text-gray-400">Wird überprüft…</p>
        )}

        {state === "ok" && (
          <>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-3 py-2 mb-4">
              ✅ Email erfolgreich bestaetigt.
            </div>
            <a
              href="/"
              className="inline-block rounded-lg bg-purple-600 text-white font-medium px-4 py-2 hover:bg-purple-700"
            >
              Weiter zur App
            </a>
          </>
        )}

        {state === "fail" && (
          <>
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2 mb-4">
              {error ?? "Verifikations-Link ist ungueltig oder abgelaufen."}
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Probier es nochmal: log dich ein und klick "Verify-Mail erneut
              senden" in den Einstellungen.
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-purple-600 text-white font-medium px-4 py-2 hover:bg-purple-700"
            >
              Zur App
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return "Unbekannter Fehler.";
}

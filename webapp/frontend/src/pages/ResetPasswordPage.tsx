/**
 * ResetPasswordPage — Landing fuer Mail-Link
 * `https://www.cubetracker.de/reset-password?token=...`
 *
 * Frontend ist Static-Site; wir nutzen kein React-Router. Stattdessen
 * pruefen wir window.location.pathname + URLSearchParams (siehe App.tsx
 * Routing).
 */
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";

export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <Center>
        <Card>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            Reset-Link ungueltig
          </h1>
          <p className="text-sm text-gray-400">
            Der Link enthaelt keinen Token. Probier es nochmal ueber{" "}
            <a
              href="/"
              className="text-purple-400 underline hover:text-purple-300"
            >
              Login → Passwort vergessen
            </a>
            .
          </p>
        </Card>
      </Center>
    );
  }

  if (done) {
    return (
      <Center>
        <Card>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            ✅ Passwort gesetzt
          </h1>
          <p className="text-sm text-gray-400 mb-4">
            Du kannst dich jetzt mit dem neuen Passwort einloggen.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-purple-600 text-white font-medium px-4 py-2 hover:bg-purple-700"
          >
            Zum Login
          </a>
        </Card>
      </Center>
    );
  }

  return (
    <Center>
      <Card>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">
          Neues Passwort setzen
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          Waehle dein neues Passwort (mindestens 8 Zeichen).
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            placeholder="Neues Passwort"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-purple-600 text-white font-medium py-2 hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? "Setze…" : "Passwort setzen"}
          </button>
        </form>
      </Card>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl p-6">
      {children}
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

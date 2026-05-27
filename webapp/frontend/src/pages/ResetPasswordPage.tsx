/**
 * ResetPasswordPage — Landing für Mail-Link
 * `https://www.cubetracker.de/reset-password?token=...`
 *
 * Frontend ist Static-Site; wir nutzen kein React-Router. Stattdessen
 * prüfen wir window.location.pathname + URLSearchParams (siehe App.tsx
 * Routing).
 */
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export function ResetPasswordPage() {
  const { t } = useTranslation();
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
      setError(extractErrorMessage(err, t("authPages.unknownError")));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <Center>
        <Card>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            {t("authPages.tokenMissingTitle")}
          </h1>
          <p className="text-sm text-gray-400">
            {t("authPages.tokenMissingBody")}
            <a
              href="/"
              className="text-purple-400 underline hover:text-purple-300"
            >
              {t("authPages.tokenMissingLink")}
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
            {t("authPages.doneTitle")}
          </h1>
          <p className="text-sm text-gray-400 mb-4">
            {t("authPages.doneBody")}
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-purple-600 text-white font-medium px-4 py-2 hover:bg-purple-700"
          >
            {t("authPages.doneToLogin")}
          </a>
        </Card>
      </Center>
    );
  }

  return (
    <Center>
      <Card>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">
          {t("authPages.setNewTitle")}
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          {t("authPages.setNewHint")}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            placeholder={t("authPages.newPasswordPlaceholder")}
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
            {busy ? t("authPages.setting") : t("authPages.submitSet")}
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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return fallback;
}

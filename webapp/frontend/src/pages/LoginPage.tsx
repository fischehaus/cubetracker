/**
 * Login + Register + ForgotPassword auf einer Seite — Mode-Switch.
 * Dunkles Theme passend zur App.
 */
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { FeatureListPanel } from "../components/FeatureListPanel";
import { APP_TAGLINE, HERO_HIGHLIGHTS } from "../lib/features-data";

type Mode = "login" | "register" | "forgot";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register(email, password);
      } else {
        // forgot
        await api.post("/auth/forgot-password", { email });
        setInfo(
          "Wenn die Email-Adresse registriert ist, ist eine Mail mit Reset-Link unterwegs. Pruefe auch Spam-Ordner.",
        );
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 lg:gap-10 items-start">
        {/* Linke Spalte: Logo + Login-Form */}
        <div className="w-full max-w-sm mx-auto lg:max-w-none bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl p-6">
          <img
            src="/cubetracker-logo.png"
            alt="cubetracker — Speedcubing Solve-Tracking"
            className="w-full max-w-[260px] mx-auto mb-3"
          />
          <p className="text-sm text-gray-400 mb-6 text-center">
            {mode === "login"
              ? "Willkommen zurueck."
              : mode === "register"
                ? "Account erstellen."
                : "Passwort vergessen."}
          </p>

        {mode !== "forgot" && (
          <div className="flex gap-2 mb-4">
            <TabButton active={mode === "login"} onClick={() => setMode("login")}>
              Login
            </TabButton>
            <TabButton
              active={mode === "register"}
              onClick={() => setMode("register")}
            >
              Registrieren
            </TabButton>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Passwort
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {mode === "register" && (
                <p className="text-xs text-gray-500 mt-1">
                  Mindestens 8 Zeichen.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-3 py-2">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-purple-600 text-white font-medium py-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy
              ? "Bitte warten…"
              : mode === "login"
                ? "Anmelden"
                : mode === "register"
                  ? "Registrieren"
                  : "Reset-Link senden"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setInfo(null);
              }}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Passwort vergessen?
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setInfo(null);
              }}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ← zurueck zum Login
            </button>
          )}
        </div>

          <p className="text-xs text-gray-500 mt-6 text-center">
            Tipp: Render-Free schlaeft nach 15 Min Idle. Erste Anmeldung kann
            ~50s dauern.
          </p>
        </div>

        {/* Rechte Spalte: Was-ist-das + Feature-Liste fuer Besucher
            ohne Account. Auf Desktop nebeneinander, auf Mobile gestapelt. */}
        <aside className="space-y-4 max-w-2xl mx-auto lg:mx-0">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
            <p className="text-base text-gray-200 leading-relaxed">
              {APP_TAGLINE}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-purple-200">
              {HERO_HIGHLIGHTS.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-purple-400">
                    ✓
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <FeatureListPanel compact />
        </aside>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
      }`}
    >
      {children}
    </button>
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

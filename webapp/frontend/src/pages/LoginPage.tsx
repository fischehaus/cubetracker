/**
 * Login + Register kombiniert auf einer Seite — Tab-Switch.
 * Dunkles Theme passend zur App.
 */
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

type Mode = "login" | "register";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-gray-100 mb-1">cubetracker</h1>
        <p className="text-sm text-gray-400 mb-6">
          {mode === "login" ? "Willkommen zurueck." : "Account erstellen."}
        </p>

        <div className="flex gap-2 mb-4">
          <TabButton active={mode === "login"} onClick={() => setMode("login")}>
            Login
          </TabButton>
          <TabButton active={mode === "register"} onClick={() => setMode("register")}>
            Registrieren
          </TabButton>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {mode === "register" && (
              <p className="text-xs text-gray-500 mt-1">Mindestens 8 Zeichen.</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-purple-600 text-white font-medium py-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Bitte warten…" : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Tipp: Render-Free schlaeft nach 15 Min Idle. Erste Anmeldung kann ~50s dauern.
        </p>
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
        active ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return "Unbekannter Fehler.";
}

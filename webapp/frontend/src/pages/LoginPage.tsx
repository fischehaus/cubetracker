/**
 * LoginPage — Konzept A (W.login-redesign-and-demo, 2026-05-28).
 *
 * Aufbau:
 *   - Skin-Slideshow im Hintergrund (rotiert alle 6s durch die 3 Skins,
 *     unabhaengig vom User-Setting)
 *   - Logo mittig + Tagline
 *   - Login/Register-Card (Glas-Look)
 *   - Demo-Login-Card (prominent, eigene Card)
 *   - Trust-Pills (3 inline)
 *   - Feature-Highlights (4 Icon-Tiles)
 *   - Footer mit allen relevanten Links
 *
 * Trust + Feature lebten frueher rechts neben dem Login als lange Spalten.
 * Aus Konzept-A jetzt zentriert + kompakt, damit der Eye-Anchor klar
 * auf Login/Demo bleibt.
 */
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { LoginPageBackgroundLayer } from "../components/LoginPageBackgroundLayer";
import { useFeatures } from "../lib/features-data";

type Mode = "login" | "register" | "forgot";

export function LoginPage() {
  const { login, register, demoLogin } = useAuth();
  const { t } = useTranslation();
  const { tagline } = useFeatures();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
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
        await api.post("/auth/forgot-password", { email });
        setInfo(t("auth.forgotInfo"));
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDemoLogin() {
    setError(null);
    setInfo(null);
    setDemoBusy(true);
    try {
      await demoLogin();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <LoginPageBackgroundLayer />

      {/* Sprachswitcher rechts oben — ohne Card-Background, schwebt frei
          ueber dem Skin */}
      <div className="max-w-3xl mx-auto flex justify-end mb-4">
        <LanguageSwitcher size="sm" />
      </div>

      {/* Logo + Tagline zentriert */}
      <div className="max-w-md mx-auto text-center mb-4">
        <img
          src="/cubetracker-logo.png"
          alt={t("auth.logoAlt")}
          className="cubetracker-app-logo w-full max-w-xs mx-auto mb-2"
        />
        <p className="text-sm text-gray-200 leading-relaxed px-4">
          {tagline}
        </p>
      </div>

      {/* Login / Register Form */}
      <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-5 mb-4">
        <p className="text-sm text-gray-400 mb-4 text-center">
          {mode === "login"
            ? t("auth.welcomeBack")
            : mode === "register"
              ? t("auth.createAccount")
              : t("auth.forgotPassword")}
        </p>

        {mode !== "forgot" && (
          <div className="flex gap-2 mb-4">
            <TabButton active={mode === "login"} onClick={() => setMode("login")}>
              {t("auth.tabLogin")}
            </TabButton>
            <TabButton
              active={mode === "register"}
              onClick={() => setMode("register")}
            >
              {t("auth.tabRegister")}
            </TabButton>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.email")}
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
                {t("auth.password")}
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
                  {t("auth.passwordHint")}
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
              ? t("auth.submitting")
              : mode === "login"
                ? t("auth.submitLogin")
                : mode === "register"
                  ? t("auth.submitRegister")
                  : t("auth.submitForgot")}
          </button>
        </form>

        <div className="mt-3 text-center text-sm">
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
              {t("auth.forgotLink")}
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
              {t("auth.backToLogin")}
            </button>
          )}
        </div>
      </div>

      {/* Demo-Login Card */}
      <div className="max-w-md mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5">
        <button
          type="button"
          onClick={onDemoLogin}
          disabled={demoBusy}
          className="w-full text-left rounded-lg p-3 hover:bg-amber-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl shrink-0">🎬</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-100">
                {demoBusy
                  ? t("auth.demoLoading")
                  : t("auth.demoLoginCtaTitle")}
              </div>
              <div className="text-xs text-amber-200/80 mt-0.5">
                {t("auth.demoLoginCtaSubtitle")}
              </div>
            </div>
            <span aria-hidden="true" className="text-amber-300">→</span>
          </div>
        </button>
      </div>

      {/* Trust-Pills */}
      <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-2 mb-5 px-2">
        <TrustPill icon="🇪🇺" label={t("auth.trustEuServer")} />
        <TrustPill icon="🚫" label={t("auth.trustNoTracking")} />
        <TrustPill icon="🔓" label={t("auth.trustOpenSource")} />
      </div>

      {/* Feature-Highlights */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 px-2">
        <FeatureTile icon="🎯" label={t("auth.featureTimer")} />
        <FeatureTile icon="📊" label={t("auth.featureStats")} />
        <FeatureTile icon="🔥" label={t("auth.featureTrainer")} />
        <FeatureTile icon="👥" label={t("auth.featureCommunity")} />
      </div>

      <footer className="mx-auto max-w-2xl mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="text-gray-300">{t("footer.appName")}</span>
        <span aria-hidden="true" className="text-gray-500">·</span>
        <a href="/impressum" className="text-gray-300 hover:text-purple-200 underline">
          {t("footer.imprint")}
        </a>
        <span aria-hidden="true" className="text-gray-500">·</span>
        <a href="/datenschutz" className="text-gray-300 hover:text-purple-200 underline">
          {t("footer.privacy")}
        </a>
      </footer>
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

function TrustPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-200">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function FeatureTile({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-3 text-center">
      <div className="text-2xl mb-1" aria-hidden="true">
        {icon}
      </div>
      <div className="text-xs text-gray-200">{label}</div>
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

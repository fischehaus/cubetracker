/**
 * LoginPage — Konzept A (W.login-redesign, 2026-05-28).
 *
 * Aufbau:
 *   - Skin-Slideshow im Hintergrund (rotiert alle 6s durch die Skins,
 *     unabhaengig vom User-Setting)
 *   - Logo mittig + Tagline
 *   - Login/Register-Card
 *   - Trust-Pills (3 inline)
 *   - Feature-Highlights (4 Icon-Tiles)
 *   - Footer mit Impressum + Datenschutz
 *
 * Trust + Feature lebten frueher rechts neben dem Login als lange Spalten.
 * Jetzt zentriert + kompakt, damit der Eye-Anchor klar auf Login bleibt.
 */
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { LoginPageBackgroundLayer } from "../components/LoginPageBackgroundLayer";
import { FeatureListPanel } from "../components/FeatureListPanel";
import { useFeatures } from "../lib/features-data";

type Mode = "login" | "register" | "forgot";

// W.pre-demo-fixes (2026-05-29): Mapping LoginPage-Pill/Tile -> Feature-
// Kategorie-titleKey. Beim Klick scrollt das Features-Modal zu diesem
// Eintrag und highlightet ihn kurz.
const TRUST_TARGETS = {
  euServer: "features.accountTitle",
  noTracking: "features.accountTitle",
  openSource: "features.dataTitle",
} as const;

const FEATURE_TARGETS = {
  timer: "features.solvingTitle",
  stats: "features.analysisTitle",
  trainer: "features.trainerTitle",
  community: "features.communityTitle",
} as const;

export function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const { tagline } = useFeatures();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [featuresOpen, setFeaturesOpen] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <LoginPageBackgroundLayer />

      {/* Sprachswitcher rechts oben — schwebt frei ueber dem Skin */}
      <div className="max-w-3xl mx-auto flex justify-end mb-4">
        <LanguageSwitcher size="sm" />
      </div>

      {/* Logo + Tagline zentriert */}
      <div className="max-w-md mx-auto text-center mb-4">
        <img
          src="/cubetracker-logo.png"
          alt={t("auth.logoAlt")}
          className="cubetracker-app-logo cubetracker-logo-always w-full max-w-xs mx-auto mb-2"
        />
        <p className="text-sm text-gray-100 leading-relaxed px-4 drop-shadow-md">
          {tagline}
        </p>
      </div>

      {/* Login / Register Form */}
      <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-5 mb-5">
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

      {/* Trust-Pills — klickbar (oeffnet Features-Modal zur passenden Kategorie) */}
      <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-2 mb-5 px-2">
        <TrustPill
          icon="🇪🇺"
          label={t("auth.trustEuServer")}
          onClick={() => setFeaturesOpen(TRUST_TARGETS.euServer)}
        />
        <TrustPill
          icon="🚫"
          label={t("auth.trustNoTracking")}
          onClick={() => setFeaturesOpen(TRUST_TARGETS.noTracking)}
        />
        <TrustPill
          icon="🔓"
          label={t("auth.trustOpenSource")}
          onClick={() => setFeaturesOpen(TRUST_TARGETS.openSource)}
        />
      </div>

      {/* Feature-Highlights — klickbar */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 px-2">
        <FeatureTile
          icon="🎯"
          label={t("auth.featureTimer")}
          onClick={() => setFeaturesOpen(FEATURE_TARGETS.timer)}
        />
        <FeatureTile
          icon="📊"
          label={t("auth.featureStats")}
          onClick={() => setFeaturesOpen(FEATURE_TARGETS.stats)}
        />
        <FeatureTile
          icon="🔥"
          label={t("auth.featureTrainer")}
          onClick={() => setFeaturesOpen(FEATURE_TARGETS.trainer)}
        />
        <FeatureTile
          icon="👥"
          label={t("auth.featureCommunity")}
          onClick={() => setFeaturesOpen(FEATURE_TARGETS.community)}
        />
      </div>

      <footer className="mx-auto max-w-2xl mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="text-gray-200 drop-shadow-md">{t("footer.appName")}</span>
        <span aria-hidden="true" className="text-gray-400">·</span>
        <a href="/impressum" className="text-gray-200 hover:text-purple-200 underline drop-shadow-md">
          {t("footer.imprint")}
        </a>
        <span aria-hidden="true" className="text-gray-400">·</span>
        <a href="/datenschutz" className="text-gray-200 hover:text-purple-200 underline drop-shadow-md">
          {t("footer.privacy")}
        </a>
      </footer>

      {/* Features-Modal — oeffnet sich beim Klick auf Pill/Tile */}
      {featuresOpen !== null && (
        <LoginFeaturesModal
          scrollToKey={featuresOpen}
          onClose={() => setFeaturesOpen(null)}
        />
      )}
    </div>
  );
}

function LoginFeaturesModal({
  scrollToKey,
  onClose,
}: {
  scrollToKey: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-4 md:p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("health.closeAria")}
          >
            ×
          </button>
        </div>
        <FeatureListPanel scrollToCategoryTitleKey={scrollToKey} />
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

function TrustPill({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:bg-gray-700 hover:border-purple-500/60 hover:text-gray-100 transition focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function FeatureTile({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-3 text-center hover:bg-gray-700 hover:border-purple-500/60 transition focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
    >
      <div className="text-2xl mb-1" aria-hidden="true">
        {icon}
      </div>
      <div className="text-xs text-gray-200">{label}</div>
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

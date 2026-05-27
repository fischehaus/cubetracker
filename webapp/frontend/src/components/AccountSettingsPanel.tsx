/**
 * AccountSettingsPanel (Phase W.8) — User-Profil-Management.
 *
 * 4 Sektionen:
 * - Profil (Email-Status, display_name)
 * - Passwort ändern (current + new)
 * - Email ändern (current_pw + new_email -> Verify-Mail an neue Adresse)
 * - Account löschen (DSGVO, mit Confirm)
 *
 * Resend-Verify-Mail-Button bei email_verified=false.
 */
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { COUNTRIES } from "../lib/countries";
import { InfoButton } from "./InfoButton";

export function AccountSettingsPanel() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-gray-100">
          {t("accountSettings.headerTitle")}
        </h2>
        <InfoButton>
          <p className="font-medium mb-1">
            {t("accountSettings.headerTitle")}
          </p>
          <p>{t("accountSettings.infoBody")}</p>
        </InfoButton>
      </div>

      <ProfileSection />
      <PasswordSection />
      <EmailSection />
      <DangerSection />

      <p className="text-xs text-gray-500">
        {t("accountSettings.loggedInAs")}{" "}
        <code className="text-gray-300">{user.email}</code>
        {user.display_name &&
          t("accountSettings.displayNameSuffix", { name: user.display_name })}
        .{" · "}
        <button
          onClick={() => void logout()}
          className="text-purple-400 hover:text-purple-300 underline"
        >
          {t("accountSettings.logout")}
        </button>
      </p>
    </div>
  );
}

// ============================================================
// Profil
// ============================================================

function ProfileSection() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [postalCode, setPostalCode] = useState(user?.postal_code ?? "");
  const [country, setCountry] = useState(user?.country_iso2 ?? "");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", {
        display_name: displayName || null,
        postal_code: postalCode.trim() || null,
        country_iso2: country.trim() || null,
      });
      await refreshMe();
      setInfo(t("accountSettings.okProfileUpdated"));
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerify() {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/resend-verification");
      setInfo(t("accountSettings.okVerifyResent"));
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("accountSettings.profileCardTitle")}>
      <div className="mb-3 text-sm">
        <span className="text-gray-400">{t("accountSettings.emailLabel")}</span>{" "}
        <code className="text-gray-200">{user.email}</code>
        {user.email_verified ? (
          <span className="ml-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
            {t("accountSettings.verified")}
          </span>
        ) : (
          <span className="ml-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
            {t("accountSettings.notVerified")}
          </span>
        )}
        {!user.email_verified && (
          <button
            onClick={() => void resendVerify()}
            disabled={busy}
            className="ml-2 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            {t("accountSettings.resendVerify")}
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          {t("accountSettings.displayNameLabel")}
        </label>
        <input
          type="text"
          maxLength={64}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("accountSettings.displayNamePlaceholder")}
          className="w-full max-w-xs rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <label className="block text-sm font-medium text-gray-300 pt-2">
          {t("accountSettings.postalCodeLabel")}
        </label>
        <input
          type="text"
          maxLength={16}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder={t("accountSettings.postalCodePlaceholder")}
          autoComplete="postal-code"
          className="w-full max-w-xs rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <label className="block text-sm font-medium text-gray-300 pt-2">
          {t("accountSettings.countryLabel")}
        </label>
        <select
          value={country.toUpperCase()}
          onChange={(e) => setCountry(e.target.value)}
          autoComplete="country"
          className="w-full max-w-xs rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">{t("accountSettings.countryPlaceholder")}</option>
          {COUNTRIES.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.label} ({c.iso2})
            </option>
          ))}
        </select>

        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 max-w-md text-xs text-amber-200/90">
          <p>
            <strong>{t("accountSettings.geoNoteIntro")}</strong>{" "}
            {t("accountSettings.geoNoteBody")}{" "}
            <strong>{t("accountSettings.geoNoteBodyStrong")}</strong>{" "}
            {t("accountSettings.geoNoteBodyTail")}
          </p>
          <p className="mt-1 text-amber-300/70">
            {t("accountSettings.geoNotePrivacy")}
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? t("accountSettings.saveBusy") : t("accountSettings.saveButton")}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>

      {/* Phase W.9: Discoverability-Toggle */}
      <DiscoverabilitySection />

      {/* Phase W.wca-profile-light: WCA-ID-Eingabe */}
      <WcaIdSection />
    </Card>
  );
}

function WcaIdSection() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const qc = useQueryClient();
  const [wcaId, setWcaId] = useState(user?.wca_id ?? "");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // WCA-Format „2024SMIT01" — 4 Ziffern Jahr + 4 Großbuchstaben + 2 Ziffern.
  // Leer ist auch ok (= unsetzen).
  const trimmed = wcaId.trim().toUpperCase();
  const isValid = trimmed === "" || /^[12][0-9]{3}[A-Z]{4}[0-9]{2}$/.test(trimmed);
  const hasChanged = trimmed !== (user.wca_id ?? "");

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", { wca_id: trimmed || null });
      await refreshMe();
      // QA-Fix W.wca-profile-qa: ohne diese Invalidation zeigt das
      // Dashboard noch bis zu 6h (staleTime) das alte WCA-Profil.
      // Live-Demo: User trägt ID ein → Karte erscheint sofort.
      qc.invalidateQueries({ queryKey: ["wca-me-profile"] });
      setInfo(
        trimmed
          ? t("accountSettings.okWcaIdSaved")
          : t("accountSettings.okWcaIdCleared"),
      );
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-700 pt-3 space-y-2">
      <div className="text-sm font-medium text-gray-300">
        {t("accountSettings.wcaIdHeading")}
      </div>
      <p className="text-xs text-gray-400">
        {t("accountSettings.wcaIdDescPrefix")}{" "}
        <a
          href="https://www.worldcubeassociation.org/persons"
          target="_blank"
          rel="noreferrer"
          className="text-purple-400 hover:text-purple-300 underline"
        >
          {t("accountSettings.wcaIdDescLink")}
        </a>{" "}
        {t("accountSettings.wcaIdDescSuffix")}
      </p>
      <form onSubmit={onSave} className="flex flex-wrap items-start gap-2">
        <input
          type="text"
          maxLength={10}
          value={wcaId}
          onChange={(e) => setWcaId(e.target.value.toUpperCase())}
          placeholder={t("accountSettings.wcaIdPlaceholder")}
          className="w-44 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-invalid={!isValid}
        />
        <button
          type="submit"
          disabled={busy || !isValid || !hasChanged}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? t("accountSettings.saveBusy") : t("accountSettings.saveButton")}
        </button>
      </form>
      {!isValid && (
        <p className="text-xs text-red-400">{t("accountSettings.wcaIdInvalid")}</p>
      )}
      {user.wca_id && (
        <p className="text-xs text-gray-500">
          {t("accountSettings.wcaIdCurrent")}{" "}
          <a
            href={`https://www.worldcubeassociation.org/persons/${user.wca_id}`}
            target="_blank"
            rel="noreferrer"
            className="text-purple-400 hover:text-purple-300 underline font-mono"
          >
            {user.wca_id}
          </a>
        </p>
      )}
      {info && <FeedbackOk text={info} />}
      {error && <FeedbackErr text={error} />}
    </div>
  );
}

function DiscoverabilitySection() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const hasName = !!user.display_name?.trim();

  async function toggle(next: boolean) {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", { is_discoverable: next });
      await refreshMe();
      setInfo(
        next
          ? t("accountSettings.okDiscoverable")
          : t("accountSettings.okNotDiscoverable"),
      );
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-700 pt-3 space-y-2">
      <div className="text-sm font-medium text-gray-300">
        {t("accountSettings.discoverabilityHeading")}
      </div>
      <p className="text-xs text-gray-400">
        {t("accountSettings.discoverabilityDescPrefix")}{" "}
        <em>{t("accountSettings.discoverabilityDescEm1")}</em>{" "}
        {t("accountSettings.discoverabilityDescMid")}{" "}
        <em>{t("accountSettings.discoverabilityDescEm2")}</em>{" "}
        {t("accountSettings.discoverabilityDescSuffix")}
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={user.is_discoverable}
          onChange={(e) => void toggle(e.target.checked)}
          disabled={busy || !hasName}
          className="accent-purple-500 w-4 h-4"
        />
        {t("accountSettings.discoverabilityToggleLabel")}
      </label>
      {!hasName && (
        <p className="text-xs text-amber-300">
          {t("accountSettings.discoverabilityNoNameWarn")}
        </p>
      )}
      {info && <FeedbackOk text={info} />}
      {error && <FeedbackErr text={error} />}
    </div>
  );
}

// ============================================================
// Passwort ändern
// ============================================================

function PasswordSection() {
  const { t } = useTranslation();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setInfo(t("accountSettings.okPasswordChanged"));
      setCurrentPw("");
      setNewPw("");
      // Backend hat token_version++ gemacht → nächster API-Call kriegt 401
      // → AuthContext bekommt 'cubetracker:logged-out'-Event → LoginPage erscheint.
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("accountSettings.passwordCardTitle")}>
      <form onSubmit={onSubmit} className="space-y-2 max-w-xs">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("accountSettings.passwordCurrentPlaceholder")}
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={t("accountSettings.passwordNewPlaceholder")}
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy
            ? t("accountSettings.saveBusy")
            : t("accountSettings.passwordSubmit")}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>
    </Card>
  );
}

// ============================================================
// Email ändern
// ============================================================

function EmailSection() {
  const { t } = useTranslation();
  const [currentPw, setCurrentPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/change-email", {
        current_password: currentPw,
        new_email: newEmail,
      });
      setInfo(
        t("accountSettings.okEmailVerifySent", { email: newEmail }),
      );
      setCurrentPw("");
      setNewEmail("");
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("accountSettings.emailCardTitle")}>
      <p className="text-sm text-gray-400 mb-2">
        {t("accountSettings.emailDescription")}
      </p>
      <form onSubmit={onSubmit} className="space-y-2 max-w-xs">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("accountSettings.passwordCurrentPlaceholder")}
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="email"
          required
          placeholder={t("accountSettings.emailNewPlaceholder")}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy
            ? t("accountSettings.saveBusy")
            : t("accountSettings.emailSubmit")}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>
    </Card>
  );
}

// ============================================================
// Account löschen (DSGVO)
// ============================================================

function DangerSection() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(t("accountSettings.dangerConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete("/auth/me");
      await logout();
      window.location.href = "/";
    } catch (err) {
      setError(extractErrorMessage(err, t));
      setBusy(false);
    }
  }

  return (
    <Card title={t("accountSettings.dangerCardTitle")} danger>
      <p className="text-sm text-gray-400 mb-3">
        {t("accountSettings.dangerDescription")}
      </p>
      <button
        onClick={() => void onDelete()}
        disabled={busy}
        className="rounded-lg bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700 disabled:opacity-50"
      >
        {busy
          ? t("accountSettings.dangerBusy")
          : t("accountSettings.dangerSubmit")}
      </button>
      {error && <FeedbackErr text={error} />}
    </Card>
  );
}

// ============================================================
// Helpers
// ============================================================

function Card({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border ${
        danger ? "border-red-500/40 bg-red-500/5" : "border-gray-700 bg-gray-900/50"
      } p-4`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${danger ? "text-red-200" : "text-gray-100"}`}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function FeedbackOk({ text }: { text: string }) {
  return (
    <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

function FeedbackErr({ text }: { text: string }) {
  return (
    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

function extractErrorMessage(
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

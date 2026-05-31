/**
 * AccountSettingsPanel (W.8 · seit W.ia-profil-bereich auf Sicherheit reduziert)
 * — Konto-Sicherheit:
 *   - Passwort ändern (current + new)
 *   - Email ändern (current_pw + new_email -> Verify-Mail an neue Adresse)
 *   - Account löschen (DSGVO, mit Confirm)
 *
 * Die Identitäts-Felder (Display-Name, PLZ, Land, WCA-ID, Auffindbarkeit) sind
 * seit W.ia-profil-bereich in die ProfilView umgezogen (UserMenu → Profil).
 * Geteilte Form-Helfer (Card / Feedback* / extractErrorMessage) liegen in
 * accountForm.tsx — von hier UND der ProfilView genutzt.
 */
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { InfoButton } from "./InfoButton";
import {
  Card,
  FeedbackOk,
  FeedbackErr,
  extractErrorMessage,
} from "./accountForm";

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

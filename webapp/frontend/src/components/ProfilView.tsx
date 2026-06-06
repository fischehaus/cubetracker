// ProfilView (W.ia-profil-bereich, 2026-05-31) — „Profil": die nach außen
// gerichtete Identität. Erreichbar über das UserMenu (Pseudo-Tab „profil",
// NICHT in der Haupt-TabBar). Vereint:
//  - die Identitäts-Felder (früher AccountSettingsPanel → Profil-Sektion:
//    Display-Name, PLZ, Land, WCA-ID, Auffindbarkeit)
//  - das offizielle WCA-Profil (früher im Statistik-Dashboard „Speedcubing-Welt")
//
// W.public-profile (2026-06-06): die teilbare öffentliche Solving-Card ist
// jetzt gebaut — Opt-In-Toggle + Teilen-Link in PublicProfileSection unten.
// Anonym erreichbar unter /u/<slug> (User-Entscheidung 2026-06-06, ersetzt die
// frühere „nur eingeloggte Nutzer / kein Web-Link"-Idee). Die Card zeigt nur
// Aggregate (PBs pro Cube, Counts, Achievements) — nie Email/PLZ/Einzel-Solves.

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { COUNTRIES } from "../lib/countries";
import { PseudoViewHeader } from "./PseudoViewHeader";
import { WcaProfileCard } from "./WcaProfileCard";
import {
  Card,
  FeedbackOk,
  FeedbackErr,
  extractErrorMessage,
} from "./accountForm";

interface Props {
  /** Zurück in die App (Statistik-Tab) — „profil" hat keine Haupt-TabBar. */
  onBack: () => void;
}

export function ProfilView({ onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Kontext-Header analog KontoDatenView: „profil" ist ein Pseudo-Tab
          ohne Eintrag in der Haupt-Leiste (die ist hier ausgeblendet). Titel +
          Zurück-Button machen klar, wo man ist und wie man zurück in die App
          kommt. */}
      <PseudoViewHeader
        icon="👤"
        title={t("profilView.title")}
        backLabel={t("profilView.back")}
        onBack={onBack}
        intro={t("profilView.intro")}
      />

      <ProfileSection />
      <WcaProfileCard />
      <PublicProfileSection />
    </div>
  );
}

// ============================================================
// Identität (Display-Name, PLZ, Land) + Auffindbarkeit + WCA-ID
// ============================================================

function ProfileSection() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const qc = useQueryClient();
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
      // QA W.ia-profil-bereich: FriendsTab cached display_name/Auffindbarkeit
      // über qk.friends.all() — analog useUpdateProfile mit-invalidieren, sonst
      // zeigt die Community-Discoverability-Card kurz den alten Stand.
      qc.invalidateQueries({ queryKey: qk.friends.all() });
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
      // WCA-Profil noch bis zu 6h (staleTime) das alte. Live-Demo: User
      // trägt ID ein → Karte erscheint sofort.
      qc.invalidateQueries({ queryKey: qk.wca.meProfile() });
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
  const qc = useQueryClient();
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
      // QA W.ia-profil-bereich: Friends-Cache mit-invalidieren (s. ProfileSection).
      qc.invalidateQueries({ queryKey: qk.friends.all() });
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
// Öffentliche Solving-Card — Opt-In + Teilen-Link (W.public-profile)
// ============================================================

function PublicProfileSection() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const enabled = user.public_profile_enabled;
  const relPath = user.public_slug ? `/u/${user.public_slug}` : null;
  const shareUrl = relPath ? `${window.location.origin}${relPath}` : null;
  const hasName = !!user.display_name?.trim();

  async function toggle(next: boolean) {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", { public_profile_enabled: next });
      await refreshMe();
      setInfo(
        next
          ? t("publicProfileSettings.okEnabled")
          : t("publicProfileSettings.okDisabled"),
      );
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API kann blockiert sein (kein HTTPS / Permission) — der
      // Link ist trotzdem als Text sichtbar + anklickbar.
    }
  }

  return (
    <Card title={t("publicProfileSettings.title")}>
      <p className="text-sm text-gray-400">{t("publicProfileSettings.intro")}</p>
      <p className="mt-1 text-xs text-gray-500">
        {t("publicProfileSettings.privacyNote")}
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void toggle(e.target.checked)}
          disabled={busy}
          className="accent-purple-500 w-4 h-4"
        />
        {t("publicProfileSettings.toggleLabel")}
      </label>

      {enabled && shareUrl && relPath && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-gray-400">
            {t("publicProfileSettings.shareLabel")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={relPath}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-purple-300 hover:text-purple-200 underline break-all"
            >
              {shareUrl}
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="text-xs rounded border border-gray-600 px-2 py-1 text-gray-300 hover:bg-gray-800"
            >
              {copied
                ? t("publicProfileSettings.copied")
                : t("publicProfileSettings.copy")}
            </button>
          </div>
          {!hasName && (
            <p className="text-xs text-amber-300">
              {t("publicProfileSettings.noNameHint")}
            </p>
          )}
        </div>
      )}

      {info && <FeedbackOk text={info} />}
      {error && <FeedbackErr text={error} />}
    </Card>
  );
}

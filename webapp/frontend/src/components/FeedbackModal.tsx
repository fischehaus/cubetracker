// FeedbackModal (Phase W.feedback, 2026-05-17; umgebaut W.feedback-modal-rebuild 2026-05-28).
//
// Zwei Wege:
//   1. GitHub-Issue-Form (öffnet in neuem Tab) — immer verfügbar, auch
//      anonym (Login-Seite-Footer).
//   2. „Per App"-Mode — eingeloggte User schreiben direkt in die
//      Admin-Inbox (DB-persistent statt früher per E-Mail). Admin
//      antwortet im Inbox-UI, User sieht die Antwort im „Mein
//      Feedback"-Bereich beim nächsten Login.
//
// Anonyme User (kein eingeloggter User, z.B. Login-Seite-Footer)
// sehen NUR den GitHub-Mode — die App-Inbox ist user-gebunden.

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import {
  useCreateFeedbackMessage,
  type FeedbackCategory,
} from "../lib/api";

interface Props {
  onClose: () => void;
}

const GITHUB_REPO_URL = "https://github.com/fischehaus/cubetracker";

export function FeedbackModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  // Anonyme User können nur GitHub — App-Mode braucht eingeloggten User
  // (Feedback wird mit user_id verknüpft + User soll Antwort sehen können).
  const [mode, setMode] = useState<"github" | "app">(
    isLoggedIn ? "app" : "github",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-purple-500/40 bg-gray-900 p-4 md:p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("feedback.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("feedback.closeAria")}
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">{t("feedback.intro")}</p>

        {/* Mode-Tabs nur wenn eingeloggt — anonym ist GitHub die einzige
            Option, kein Switcher nötig. */}
        {isLoggedIn ? (
          <div className="flex gap-2 mb-5 border-b border-gray-700">
            <button
              type="button"
              onClick={() => setMode("app")}
              className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
                mode === "app"
                  ? "border-purple-500 text-purple-200"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("feedback.modeApp")}
            </button>
            <button
              type="button"
              onClick={() => setMode("github")}
              className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
                mode === "github"
                  ? "border-purple-500 text-purple-200"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("feedback.modeGithub")}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-4">
            {t("feedback.anonHint")}
          </p>
        )}

        {mode === "github" ? <GitHubMode /> : <AppMode onClose={onClose} />}
      </div>
    </div>
  );
}

// ============================================================
// GitHub-Issue-Mode (für Reporter mit GitHub-Account, auch anonym)
// ============================================================

function GitHubMode() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">{t("feedback.githubIntro")}</p>
      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
        <li>{t("feedback.githubBullet1")}</li>
        <li>{t("feedback.githubBullet2")}</li>
        <li>{t("feedback.githubBullet3")}</li>
      </ul>
      <p className="text-sm text-gray-300">{t("feedback.githubTemplates")}</p>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={`${GITHUB_REPO_URL}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-purple-600 px-4 py-2 text-base font-medium text-white hover:bg-purple-700"
        >
          {t("feedback.githubCreateIssue")}
        </a>
        <a
          href={`${GITHUB_REPO_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-gray-700 px-4 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-gray-100"
        >
          {t("feedback.githubBrowseIssues")}
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Per App-Mode (eingeloggte User → DB-Inbox, Admin antwortet)
// ============================================================

function AppMode({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const submit = useCreateFeedbackMessage();

  const trimmed = message.trim();
  const tooShort = trimmed.length < 3;
  const tooLong = trimmed.length > 4000;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (tooShort || tooLong) return;
    submit.mutate(
      { category, message: trimmed },
      {
        onSuccess: () => {
          setMessage("");
          // Modal kurz offen lassen damit User Bestätigung sieht,
          // dann nach 2s auto-close.
          setTimeout(onClose, 2000);
        },
      },
    );
  }

  const errMsg = (() => {
    const e = submit.error as AxiosError<{ detail?: string }> | null;
    if (!e) return null;
    return e.response?.data?.detail || e.message || t("feedback.errorUnknown");
  })();

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-gray-300">{t("feedback.appIntro")}</p>

      <label className="block">
        <span className="text-sm font-medium text-gray-300">
          {t("feedback.categoryLabel")}
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          disabled={submit.isPending}
          className="mt-1 w-full max-w-xs rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="general">{t("feedback.typeGeneral")}</option>
          <option value="bug">{t("feedback.typeBug")}</option>
          <option value="feature">{t("feedback.typeFeature")}</option>
          <option value="other">{t("feedback.typeOther")}</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-300">
          {t("feedback.messageLabel")}
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submit.isPending}
          rows={8}
          maxLength={4000}
          placeholder={t("feedback.messagePlaceholder")}
          className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none resize-y"
        />
        <span className="text-xs text-gray-500">
          {t("feedback.charCount", { count: trimmed.length })}
        </span>
      </label>

      {submit.isSuccess && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {t("feedback.appSuccessMessage")}
        </div>
      )}

      {errMsg && !submit.isSuccess && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submit.isPending || tooShort || tooLong}
          className="rounded bg-purple-600 px-4 py-2 text-base font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submit.isPending
            ? t("feedback.sendBusy")
            : t("feedback.sendButton")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submit.isPending}
          className="rounded border border-gray-700 px-3 py-2 text-base text-gray-300 hover:bg-gray-800"
        >
          {t("feedback.cancelButton")}
        </button>
        <span className="text-[11px] text-gray-500">
          {t("feedback.rateLimitNote")}
        </span>
      </div>
    </form>
  );
}

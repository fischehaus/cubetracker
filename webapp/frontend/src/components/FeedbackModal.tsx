// FeedbackModal (Phase W.feedback, 2026-05-17).
//
// Zwei Wege parallel anbieten:
//   1. GitHub-Issue-Form (oeffnet in neuem Tab) — Profi-User mit
//      GitHub-Account, alle anderen sehen den Issue spaeter mit.
//   2. App-internes Email-Form — fuer Casual-User. Backend schickt
//      Email an den Admin via Resend.
//
// Layout: Tab-Toggle GitHub / Email mit kurzer Erklaerung warum man
// welchen waehlen sollte.

import { useState, type FormEvent } from "react";
import { useSubmitFeedback, type FeedbackType } from "../lib/api";
import { AxiosError } from "axios";

interface Props {
  onClose: () => void;
}

const GITHUB_REPO_URL = "https://github.com/fischehaus/cubetracker";

export function FeedbackModal({ onClose }: Props) {
  const [mode, setMode] = useState<"github" | "email">("github");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-100">
            💬 Feedback geben
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label="Schliessen"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Bug gefunden? Feature-Wunsch? Etwas funktioniert nicht? Es gibt
          zwei Wege:
        </p>

        {/* Mode-Tabs */}
        <div className="flex gap-2 mb-5 border-b border-gray-700">
          <button
            type="button"
            onClick={() => setMode("github")}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              mode === "github"
                ? "border-purple-500 text-purple-200"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            GitHub-Issue
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              mode === "email"
                ? "border-purple-500 text-purple-200"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Per Email (ohne GitHub-Account)
          </button>
        </div>

        {mode === "github" ? <GitHubMode onClose={onClose} /> : <EmailMode onClose={onClose} />}
      </div>
    </div>
  );
}

// ============================================================
// GitHub-Issue-Mode
// ============================================================

function GitHubMode({ onClose: _onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">
        Im GitHub-Issue-Tracker landen alle Reports oeffentlich + andere
        User sehen + kommentieren mit. Bevorzugt fuer:
      </p>
      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
        <li>Bug-Reports mit Reproduzier-Schritten</li>
        <li>Feature-Wuensche bei denen Diskussion sinnvoll ist</li>
        <li>Du hast schon einen GitHub-Account</li>
      </ul>
      <p className="text-sm text-gray-300">
        Wir haben Templates fuer Bug-Report + Feature-Wunsch, die dich
        Schritt-fuer-Schritt durch die wichtigen Fragen fuehren.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={`${GITHUB_REPO_URL}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-purple-600 px-4 py-2 text-base font-medium text-white hover:bg-purple-700"
        >
          🚀 Issue erstellen
        </a>
        <a
          href={`${GITHUB_REPO_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-gray-700 px-4 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-gray-100"
        >
          Bestehende Issues anschauen
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Email-Mode
// ============================================================

function EmailMode({ onClose }: { onClose: () => void }) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("other");
  const [message, setMessage] = useState("");
  const submit = useSubmitFeedback();

  const trimmed = message.trim();
  const tooShort = trimmed.length < 10;
  const tooLong = trimmed.length > 4000;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (tooShort || tooLong) return;
    submit.mutate(
      { feedback_type: feedbackType, message: trimmed },
      {
        onSuccess: () => {
          setMessage("");
          // Modal kurz offen lassen damit User Bestaetigung sieht,
          // dann nach 2s auto-close
          setTimeout(onClose, 2000);
        },
      },
    );
  }

  // 503 / Rate-Limit / sonstige Errors aus Axios extrahieren
  const errMsg = (() => {
    const e = submit.error as AxiosError<{ detail?: string }> | null;
    if (!e) return null;
    return e.response?.data?.detail || e.message || "Unbekannter Fehler";
  })();

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-gray-300">
        Schreib einfach was du hast — wir schicken das als Email an den
        Entwickler. Deine Email-Adresse (aus dem Account) wird mitgesendet,
        damit wir antworten koennen.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-gray-300">Worum geht's?</span>
        <select
          value={feedbackType}
          onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
          disabled={submit.isPending}
          className="mt-1 w-full max-w-xs rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none"
        >
          <option value="bug">🐛 Bug — etwas funktioniert nicht</option>
          <option value="feature">✨ Feature-Wunsch / Verbesserung</option>
          <option value="other">💬 Allgemeines Feedback / Frage</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-300">
          Deine Nachricht
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submit.isPending}
          rows={8}
          maxLength={4000}
          placeholder="Beschreib das Problem oder die Idee in deinen Worten. Bei Bugs hilft: was hast du gemacht, was hast du erwartet, was ist stattdessen passiert?"
          className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-base text-gray-100 focus:border-purple-500 focus:outline-none resize-y"
        />
        <span className="text-xs text-gray-500">
          {trimmed.length} / 4000 Zeichen (min. 10)
        </span>
      </label>

      {submit.isSuccess && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          ✓ Feedback gesendet. Danke! Wir antworten so bald wir koennen.
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
          {submit.isPending ? "Sende …" : "Feedback senden"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submit.isPending}
          className="rounded border border-gray-700 px-3 py-2 text-base text-gray-300 hover:bg-gray-800"
        >
          Abbrechen
        </button>
        <span className="text-[11px] text-gray-500">
          Rate-Limit: max. 3 Feedback-Mails pro Stunde.
        </span>
      </div>
    </form>
  );
}

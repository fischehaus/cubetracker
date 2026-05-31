// FeedbackToRoadmapModal (W.feedback-roadmap-pipeline, 2026-05-31).
//
// Admin macht aus einem Feedback-Item per Klick ein Roadmap-Item: der Editor
// ist mit dem User-Text vorbefüllt, der Admin präzisiert Titel/Beschreibung,
// wählt Phase + Sichtbarkeit + (optional) eine Antwort an den User, und
// speichert. Ein atomarer Endpoint (POST /admin/feedback/{id}/to-roadmap) legt
// das Roadmap-Item an (mit source_feedback_id-Rücklink), setzt den Feedback-
// Status und schreibt die Antwort. Das Item landet auf der Roadmap, die das
// Dev-Tooling (roadmap-fetch.py) ohnehin ausliest — direkter Auftrags-Flow.

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminFeedbackToRoadmap,
  type FeedbackMessage,
  type FeedbackStatus,
} from "../lib/api";
import { toast } from "../lib/toast";

const PHASES = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;

const inputCls =
  "w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none";

function firstLine(text: string, max = 120): string {
  const line = text.split("\n")[0].trim();
  return line.length > max ? line.slice(0, max) : line;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      {children}
    </label>
  );
}

interface Props {
  msg: FeedbackMessage;
  onClose: () => void;
}

export function FeedbackToRoadmapModal({ msg, onClose }: Props) {
  const { t } = useTranslation();
  const mut = useAdminFeedbackToRoadmap();

  const prefillTitle = firstLine(msg.message);
  const [phaseId, setPhaseId] = useState("P1");
  const [titleDe, setTitleDe] = useState(prefillTitle);
  const [titleEn, setTitleEn] = useState(prefillTitle);
  // QA: note_de ist serverseitig auf 2000 Zeichen begrenzt, msg.message bis
  // 4000 — Pre-Fill kappen, sonst 422 bei langen Feedbacks (maxLength am
  // Textarea greift nur bei Tastatur-Eingabe, nicht beim Init-Wert).
  const [noteDe, setNoteDe] = useState(msg.message.slice(0, 2000));
  const [noteEn, setNoteEn] = useState("");
  const [effort, setEffort] = useState("");
  const [internal, setInternal] = useState(true);
  const [feedbackStatus, setFeedbackStatus] =
    useState<FeedbackStatus>("in_progress");
  // QA: bestehende Antwort vorbefüllen, damit der Admin sie sieht (leer
  // lassen = unverändert; analog AdminFeedbackInboxPanel).
  const [adminResponse, setAdminResponse] = useState(msg.admin_response ?? "");
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    titleDe.trim().length > 0 && titleEn.trim().length > 0 && !mut.isPending;

  function onSubmit() {
    setError(null);
    mut.mutate(
      {
        feedbackId: msg.id,
        input: {
          phase_id: phaseId,
          title_de: titleDe.trim(),
          title_en: titleEn.trim(),
          note_de: noteDe.trim() || null,
          note_en: noteEn.trim() || null,
          effort: effort.trim() || null,
          internal,
          feedback_status: feedbackStatus,
          admin_response: adminResponse.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("feedbackToRoadmap.success"));
          onClose();
        },
        onError: (e) => {
          const detail = (
            e as { response?: { data?: { detail?: string } } }
          )?.response?.data?.detail;
          setError(detail ?? t("feedbackToRoadmap.errorGeneric"));
        },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-purple-500/40 bg-gray-900 p-4 md:p-6 mt-8 mb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <span aria-hidden="true">🗺</span>
            {t("feedbackToRoadmap.title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("health.closeAria")}
          >
            ×
          </button>
        </div>

        {/* Ursprungs-Feedback (read-only Kontext) */}
        <div className="rounded border border-gray-700 bg-gray-800/40 p-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {t("feedbackToRoadmap.sourceLabel", { id: msg.id })}
          </div>
          <div className="whitespace-pre-wrap text-xs text-gray-300 max-h-32 overflow-y-auto">
            {msg.message}
          </div>
        </div>

        {/* Phase + Sichtbarkeit */}
        <div className="flex flex-wrap items-end gap-4">
          <Field label={t("feedbackToRoadmap.phaseLabel")}>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-300 pb-1.5">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="accent-purple-500 w-4 h-4"
            />
            {t("feedbackToRoadmap.internalLabel")}
          </label>
        </div>

        <Field label={t("feedbackToRoadmap.titleDeLabel")}>
          <input
            type="text"
            value={titleDe}
            maxLength={256}
            onChange={(e) => setTitleDe(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("feedbackToRoadmap.titleEnLabel")}>
          <input
            type="text"
            value={titleEn}
            maxLength={256}
            onChange={(e) => setTitleEn(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label={t("feedbackToRoadmap.noteDeLabel")}>
          <textarea
            value={noteDe}
            rows={3}
            maxLength={2000}
            onChange={(e) => setNoteDe(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("feedbackToRoadmap.noteEnLabel")}>
          <textarea
            value={noteEn}
            rows={2}
            maxLength={2000}
            onChange={(e) => setNoteEn(e.target.value)}
            placeholder={t("feedbackToRoadmap.noteEnPlaceholder")}
            className={inputCls}
          />
        </Field>

        <Field label={t("feedbackToRoadmap.effortLabel")}>
          <input
            type="text"
            value={effort}
            maxLength={64}
            onChange={(e) => setEffort(e.target.value)}
            placeholder={t("feedbackToRoadmap.effortPlaceholder")}
            className={inputCls}
          />
        </Field>

        {/* Feedback-Handling: Status + optionale Antwort an den User */}
        <div className="border-t border-gray-700 pt-3 space-y-3">
          <div className="text-xs font-medium text-gray-400">
            {t("feedbackToRoadmap.feedbackSectionTitle")}
          </div>
          <Field label={t("feedbackToRoadmap.feedbackStatusLabel")}>
            <select
              value={feedbackStatus}
              onChange={(e) =>
                setFeedbackStatus(e.target.value as FeedbackStatus)
              }
              className={inputCls}
            >
              <option value="in_progress">
                {t("feedbackToRoadmap.statusInProgress")}
              </option>
              <option value="done">{t("feedbackToRoadmap.statusDone")}</option>
              <option value="new">{t("feedbackToRoadmap.statusNew")}</option>
              <option value="archived">
                {t("feedbackToRoadmap.statusArchived")}
              </option>
            </select>
          </Field>
          <Field label={t("feedbackToRoadmap.responseLabel")}>
            <textarea
              value={adminResponse}
              rows={2}
              maxLength={4000}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder={t("feedbackToRoadmap.responsePlaceholder")}
              className={inputCls}
            />
          </Field>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-sm rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
          >
            {t("feedbackToRoadmap.cancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="text-sm rounded bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {mut.isPending
              ? t("feedbackToRoadmap.submitBusy")
              : t("feedbackToRoadmap.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

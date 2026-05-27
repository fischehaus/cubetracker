// BackupPanel (Phase W.5) — Multi-User-Web-Variante.
//
// Drei Sektionen in einer Card:
//   1. Voll-Export (Download .json)
//   2. Wiederherstellen aus Backup-Datei (mode=merge default, mode=replace
//      mit Magic-String-Bestätigung "DELETE_ALL_MY_DATA")
//   3. Snapshots (max 2/User) — anlegen, wiederherstellen, löschen

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { downloadFullBackup } from "../lib/backup";
import { InfoButton } from "./InfoButton";

type RestoreMode = "merge" | "replace";

interface RestoreResult {
  mode: string;
  dry_run: boolean;
  snapshot_created: number | null;
  sessions: { imported: number; skipped_duplicate: number };
  hardware: { imported: number; skipped_duplicate: number };
  solves: { imported: number; skipped_duplicate: number };
  achievements: { imported: number; skipped_duplicate: number };
  newly_unlocked_achievements?: string[];
}

interface SnapshotItem {
  id: number;
  created_at: string;
  reason: string;
  counts: { solves: number; sessions: number; hardware: number };
}

interface SnapshotsResponse {
  snapshots: SnapshotItem[];
  max_per_user: number;
}

const REPLACE_MAGIC = "DELETE_ALL_MY_DATA";

export function BackupPanel() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  // ====== Voll-Export ======
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function downloadJson() {
    setExportBusy(true);
    setExportError(null);
    try {
      await downloadFullBackup();
    } catch (e: unknown) {
      setExportError(extractErrorMessage(e, t("backupPanel.unknownError")));
    } finally {
      setExportBusy(false);
    }
  }

  // ====== Restore (Datei-Upload) ======
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [confirmText, setConfirmText] = useState("");
  const [restoreDryRun, setRestoreDryRun] = useState<RestoreResult | null>(null);
  const [restoreDone, setRestoreDone] = useState<RestoreResult | null>(null);
  const [restoreBusy, setRestoreBusy] = useState<"dry" | "real" | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function runRestore(dryRun: boolean) {
    if (!restoreFile) return;
    setRestoreBusy(dryRun ? "dry" : "real");
    setRestoreError(null);
    if (dryRun) setRestoreDryRun(null);
    else setRestoreDone(null);

    try {
      const fd = new FormData();
      fd.append("file", restoreFile);
      const params = new URLSearchParams({
        mode: restoreMode,
        dry_run: dryRun ? "true" : "false",
      });
      if (restoreMode === "replace" && !dryRun) {
        if (confirmText !== REPLACE_MAGIC) {
          setRestoreError(
            t("backupPanel.replaceConfirmError", { magic: REPLACE_MAGIC }),
          );
          setRestoreBusy(null);
          return;
        }
        params.set("confirm", REPLACE_MAGIC);
      }
      const r = await api.post<RestoreResult>(
        `/backup/restore?${params.toString()}`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 180_000,
        },
      );
      if (dryRun) {
        setRestoreDryRun(r.data);
      } else {
        setRestoreDone(r.data);
        setRestoreDryRun(null);
        // nach echtem Restore: alles invalidieren
        qc.invalidateQueries();
      }
    } catch (e: unknown) {
      setRestoreError(extractErrorMessage(e, t("backupPanel.unknownError")));
    } finally {
      setRestoreBusy(null);
    }
  }

  // ====== Snapshots ======
  const snapshotsQ = useQuery({
    queryKey: ["snapshots"],
    queryFn: async () => (await api.get<SnapshotsResponse>("/backup/snapshots")).data,
  });
  const createSnapshotMut = useMutation({
    mutationFn: async () => (await api.post<SnapshotItem>("/backup/snapshots")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshots"] }),
  });
  const restoreSnapshotMut = useMutation({
    mutationFn: async (id: number) =>
      (await api.post<RestoreResult>(`/backup/snapshots/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries(),
  });
  const deleteSnapshotMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/backup/snapshots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshots"] }),
  });

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-semibold text-gray-100">
            {t("backupPanel.title")}
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">{t("backupPanel.title")}</p>
            <p>{t("backupPanel.infoBody")}</p>
          </InfoButton>
        </div>
        <p className="text-sm text-gray-400">{t("backupPanel.subtitle")}</p>
      </div>

      {/* ============================================================
          1. Voll-Export
          ============================================================ */}
      <section className="rounded border border-gray-700 bg-gray-800/40 p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-1">
          {t("backupPanel.section1Title")}
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          {t("backupPanel.section1Desc")}
        </p>
        <button
          onClick={downloadJson}
          disabled={exportBusy}
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {exportBusy
            ? t("backupPanel.exportBusy")
            : t("backupPanel.exportButton")}
        </button>
        {exportError && (
          <div className="mt-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {exportError}
          </div>
        )}
      </section>

      {/* ============================================================
          2. Restore aus Backup-Datei
          ============================================================ */}
      <section className="rounded border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
        <h3 className="text-lg font-semibold text-amber-200">
          {t("backupPanel.section2Title")}
        </h3>
        <p className="text-sm text-amber-200/80">
          {t("backupPanel.section2DescPrefix")}{" "}
          <strong>{t("backupPanel.section2DescMergeBold")}</strong>{" "}
          {t("backupPanel.section2DescMergeRest")}{" "}
          <strong>{t("backupPanel.section2DescReplaceBold")}</strong>{" "}
          {t("backupPanel.section2DescReplaceRest")}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setRestoreFile(f);
              setRestoreDryRun(null);
              setRestoreDone(null);
              setRestoreError(null);
            }}
            className="text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-purple-700"
          />
          <select
            value={restoreMode}
            onChange={(e) => {
              setRestoreMode(e.target.value as RestoreMode);
              setRestoreDryRun(null);
              setRestoreDone(null);
            }}
            className="rounded border border-gray-600 bg-gray-900 text-gray-100 text-sm px-2 py-1.5"
          >
            <option value="merge">{t("backupPanel.modeMerge")}</option>
            <option value="replace">{t("backupPanel.modeReplace")}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void runRestore(true)}
            disabled={!restoreFile || restoreBusy !== null}
            className="text-sm rounded border border-gray-600 px-3 py-1.5 text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            {restoreBusy === "dry"
              ? t("backupPanel.previewBusy")
              : t("backupPanel.previewButton")}
          </button>
          {restoreMode === "replace" && (
            <input
              type="text"
              placeholder={t("backupPanel.replaceConfirmPlaceholder", {
                magic: REPLACE_MAGIC,
              })}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="rounded border border-red-500/50 bg-red-500/5 px-3 py-1.5 text-sm text-red-200 placeholder-red-400/50 font-mono w-72"
            />
          )}
          <button
            onClick={() => void runRestore(false)}
            disabled={
              !restoreFile ||
              restoreBusy !== null ||
              (restoreMode === "replace" && confirmText !== REPLACE_MAGIC)
            }
            className={`text-sm rounded px-3 py-1.5 text-white disabled:opacity-50 ${
              restoreMode === "replace"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {restoreBusy === "real"
              ? t("backupPanel.restoreBusy")
              : restoreMode === "replace"
                ? t("backupPanel.restoreButtonReplace")
                : t("backupPanel.restoreButtonMerge")}
          </button>
        </div>

        {restoreDryRun && <RestoreResultBox r={restoreDryRun} kind="dry" />}
        {restoreDone && <RestoreResultBox r={restoreDone} kind="done" />}
        {restoreError && (
          <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {restoreError}
          </div>
        )}
      </section>

      {/* ============================================================
          3. Snapshots (Wiederherstellungspunkte)
          ============================================================ */}
      <section className="rounded border border-gray-700 bg-gray-800/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-0">
              {t("backupPanel.section3Title")}
            </h3>
            <p className="text-xs text-gray-500">
              {t("backupPanel.section3Subtitle", {
                count: snapshotsQ.data?.max_per_user ?? 2,
              })}
            </p>
          </div>
          <button
            onClick={() => createSnapshotMut.mutate()}
            disabled={createSnapshotMut.isPending}
            className="text-sm rounded bg-purple-600 px-3 py-1.5 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {createSnapshotMut.isPending
              ? t("backupPanel.snapshotCreateBusy")
              : t("backupPanel.snapshotCreateButton")}
          </button>
        </div>

        {snapshotsQ.isLoading && (
          <p className="text-sm text-gray-500">
            {t("backupPanel.snapshotsLoading")}
          </p>
        )}
        {snapshotsQ.data && snapshotsQ.data.snapshots.length === 0 && (
          <p className="text-sm text-gray-500">
            {t("backupPanel.snapshotsEmpty")}
          </p>
        )}
        {snapshotsQ.data && snapshotsQ.data.snapshots.length > 0 && (
          <ul className="divide-y divide-gray-700">
            {snapshotsQ.data.snapshots.map((s) => (
              <li
                key={s.id}
                className="py-2 flex items-center justify-between flex-wrap gap-2"
              >
                <div className="text-sm text-gray-300">
                  <span className="font-medium text-gray-100">
                    {t("backupPanel.snapshotId", { id: s.id })}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {formatDate(s.created_at, i18n.resolvedLanguage ?? "de")} ·{" "}
                    <span className="italic">{s.reason}</span>
                  </span>
                  <span className="text-gray-400 ml-2">
                    {t("backupPanel.snapshotCounts", {
                      solves: s.counts.solves,
                      sessions: s.counts.sessions,
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          t("backupPanel.snapshotRestoreConfirm", {
                            id: s.id,
                            date: formatDate(
                              s.created_at,
                              i18n.resolvedLanguage ?? "de",
                            ),
                          }),
                        )
                      ) {
                        restoreSnapshotMut.mutate(s.id);
                      }
                    }}
                    disabled={restoreSnapshotMut.isPending}
                    className="text-xs rounded bg-amber-600 px-2 py-1 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {t("backupPanel.snapshotRestoreButton")}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          t("backupPanel.snapshotDeleteConfirm", { id: s.id }),
                        )
                      ) {
                        deleteSnapshotMut.mutate(s.id);
                      }
                    }}
                    disabled={deleteSnapshotMut.isPending}
                    className="text-xs rounded border border-gray-600 px-2 py-1 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {t("backupPanel.snapshotDeleteButton")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RestoreResultBox({
  r,
  kind,
}: {
  r: RestoreResult;
  kind: "dry" | "done";
}) {
  const { t } = useTranslation();
  const color =
    kind === "dry"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

  function categoryLine(label: string, imported: number, dup: number) {
    return (
      <li>
        {label}: <strong>{imported}</strong> {t("backupPanel.rrImportedSuffix")}
        {dup > 0 && (
          <span>
            {" "}
            · {dup} {t("backupPanel.rrDuplicateSuffix")}
          </span>
        )}
      </li>
    );
  }

  return (
    <div className={`rounded border ${color} px-3 py-2 text-sm space-y-1`}>
      <div className="font-medium">
        {kind === "dry"
          ? t("backupPanel.restorePreviewTitle", { mode: r.mode })
          : t("backupPanel.restoreDoneTitle", { mode: r.mode })}
      </div>
      <ul className="text-xs space-y-0.5 opacity-90">
        {categoryLine(
          t("backupPanel.rrCategorySolves"),
          r.solves.imported,
          r.solves.skipped_duplicate,
        )}
        {categoryLine(
          t("backupPanel.rrCategorySessions"),
          r.sessions.imported,
          r.sessions.skipped_duplicate,
        )}
        {categoryLine(
          t("backupPanel.rrCategoryHardware"),
          r.hardware.imported,
          r.hardware.skipped_duplicate,
        )}
        {categoryLine(
          t("backupPanel.rrCategoryAchievements"),
          r.achievements.imported,
          r.achievements.skipped_duplicate,
        )}
        {r.snapshot_created !== null && (
          <li>
            {t("backupPanel.rrSnapshot", { id: r.snapshot_created })}
          </li>
        )}
        {r.newly_unlocked_achievements &&
          r.newly_unlocked_achievements.length > 0 && (
            <li>
              {t("backupPanel.rrNewlyUnlocked", {
                list: r.newly_unlocked_achievements.join(", "),
              })}
            </li>
          )}
      </ul>
    </div>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return fallback;
}

// (Download-Helper ausgelagert nach lib/backup.ts -> downloadFullBackup)

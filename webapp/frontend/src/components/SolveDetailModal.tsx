// SolveDetailModal: Vollbild-Detail beim Klick auf einen Solve in der
// SolveList. Zeigt was in der Tabelle nicht reinpasst:
//  - Scramble (komplett, monospace)
//  - Notiz (komplett, mehrzeilig)
//  - Hardware (Name + Cube-Type)
//  - Session (Name)
//  - rolling ao5/ao12 (vom Caller übergeben)
//  - Aktionen: +2/DNF/Löschen
//
// Schliessen: Klick auf Backdrop, Esc, X-Button oben rechts.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeleteSolve,
  useHardware,
  useSessions,
  useUpdateSolve,
} from "../lib/api";
import { formatDate, formatSolveTime, formatTime } from "../lib/format";
import type { Solve } from "../lib/types";

interface Props {
  solve: Solve;
  ao5: number | null;
  ao12: number | null;
  isPb: boolean;
  onClose: () => void;
}

export function SolveDetailModal({ solve, ao5, ao12, isPb, onClose }: Props) {
  const { t } = useTranslation();
  const update = useUpdateSolve();
  const del = useDeleteSolve();

  const { data: hardware } = useHardware();
  const { data: sessions } = useSessions();

  const hardwareName =
    solve.hardware_id !== null
      ? hardware?.find((h) => h.id === solve.hardware_id)?.name ?? "—"
      : null;
  const sessionName =
    solve.session_id !== null
      ? sessions?.find((s) => s.id === solve.session_id)?.name ?? "—"
      : null;

  // Esc-Key schliesst Modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-lg border border-gray-700 bg-gray-900 p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Zeit groß + Aktionen */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              {t("solveDetail.solveNumber", { id: solve.id })}
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className={`font-mono text-5xl ${
                  isPb ? "text-yellow-300 font-bold" : "text-gray-100"
                }`}
              >
                {formatSolveTime(solve)}
              </span>
              {isPb && (
                <span className="text-yellow-300 text-base font-semibold">
                  {t("solveDetail.pbBadge")}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {formatDate(solve.timestamp)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("solveDetail.closeAria")}
            className="rounded text-3xl text-gray-500 hover:text-gray-200 leading-none -mt-1"
          >
            ×
          </button>
        </div>

        {/* Kontext-Werte (rolling) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded bg-gray-800/50 px-3 py-2">
            <div className="text-xs text-gray-500">
              {t("solveDetail.ao5AtTime")}
            </div>
            <div className="font-mono text-xl text-gray-100">
              {ao5 !== null ? formatTime(ao5) : "–"}
            </div>
          </div>
          <div className="rounded bg-gray-800/50 px-3 py-2">
            <div className="text-xs text-gray-500">
              {t("solveDetail.ao12AtTime")}
            </div>
            <div className="font-mono text-xl text-gray-100">
              {ao12 !== null ? formatTime(ao12) : "–"}
            </div>
          </div>
        </div>

        {/* Meta */}
        <dl className="space-y-2 mb-5 text-sm">
          <MetaRow
            label={t("solveDetail.cubeTypeLabel")}
            value={solve.cube_type}
          />
          <MetaRow
            label={t("solveDetail.hardwareLabel")}
            value={hardwareName ?? <span className="text-gray-600 italic">—</span>}
          />
          <MetaRow
            label={t("solveDetail.sessionLabel")}
            value={sessionName ?? <span className="text-gray-600 italic">—</span>}
          />
          <MetaRow
            label={t("solveDetail.plusTwoLabel")}
            value={
              solve.plus_two ? (
                t("solveDetail.plusTwoYes")
              ) : (
                <span className="text-gray-600">{t("solveDetail.plusTwoNo")}</span>
              )
            }
          />
          <MetaRow
            label={t("solveDetail.dnfLabel")}
            value={
              solve.dnf ? (
                t("solveDetail.dnfYes")
              ) : (
                <span className="text-gray-600">{t("solveDetail.dnfNo")}</span>
              )
            }
          />
        </dl>

        {/* Scramble (full) */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            {t("solveDetail.scrambleLabel")}
          </div>
          <div
            className={`rounded bg-gray-800/50 px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words ${
              solve.scramble ? "text-gray-200" : "text-gray-600 italic"
            }`}
          >
            {solve.scramble || "—"}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            {t("solveDetail.notesLabel")}
          </div>
          <div
            className={`rounded bg-gray-800/50 px-3 py-2 text-sm whitespace-pre-wrap ${
              solve.notes ? "text-gray-200" : "text-gray-600 italic"
            }`}
          >
            {solve.notes || "—"}
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-800">
          {!solve.dnf && (
            <button
              onClick={() =>
                update.mutate({
                  id: solve.id,
                  payload: { plus_two: !solve.plus_two },
                })
              }
              className={`text-base rounded px-3 py-2 ${
                solve.plus_two
                  ? "bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {solve.plus_two
                ? t("solveDetail.plusTwoRemove")
                : t("solveDetail.plusTwoSet")}
            </button>
          )}
          <button
            onClick={() =>
              update.mutate({
                id: solve.id,
                payload: { dnf: !solve.dnf },
              })
            }
            className={`text-base rounded px-3 py-2 ${
              solve.dnf
                ? "bg-red-600/30 text-red-300 hover:bg-red-600/50"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {solve.dnf
              ? t("solveDetail.dnfRemove")
              : t("solveDetail.dnfSet")}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  t("solveDetail.deleteConfirm", {
                    time: formatSolveTime(solve),
                  }),
                )
              ) {
                del.mutate(solve.id, { onSuccess: onClose });
              }
            }}
            className="text-base rounded bg-gray-700 px-3 py-2 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
          >
            {t("solveDetail.deleteButton")}
          </button>
          <button
            onClick={onClose}
            className="ml-auto text-base rounded bg-gray-800 px-4 py-2 text-gray-300 hover:bg-gray-700"
          >
            {t("solveDetail.closeButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-800/60 py-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200 text-right">{value}</dd>
    </div>
  );
}

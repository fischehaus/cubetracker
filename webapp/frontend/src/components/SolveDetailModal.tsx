// SolveDetailModal: Vollbild-Detail beim Klick auf einen Solve in der
// SolveList. Zeigt was in der Tabelle nicht reinpasst:
//  - Scramble (komplett, monospace)
//  - Notiz (komplett, mehrzeilig)
//  - Hardware (Name + Cube-Type)
//  - Session (Name)
//  - rolling ao5/ao12 (vom Caller uebergeben)
//  - Aktionen: +2/DNF/Loeschen
//
// Schliessen: Klick auf Backdrop, Esc, X-Button oben rechts.

import { useEffect } from "react";
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
        {/* Header: Zeit gross + Aktionen */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              Solve #{solve.id}
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
                  ★ PB
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {formatDate(solve.timestamp)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Schliessen"
            className="rounded text-3xl text-gray-500 hover:text-gray-200 leading-none -mt-1"
          >
            ×
          </button>
        </div>

        {/* Kontext-Werte (rolling) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded bg-gray-800/50 px-3 py-2">
            <div className="text-xs text-gray-500">ao5 zu diesem Zeitpunkt</div>
            <div className="font-mono text-xl text-gray-100">
              {ao5 !== null ? formatTime(ao5) : "–"}
            </div>
          </div>
          <div className="rounded bg-gray-800/50 px-3 py-2">
            <div className="text-xs text-gray-500">ao12 zu diesem Zeitpunkt</div>
            <div className="font-mono text-xl text-gray-100">
              {ao12 !== null ? formatTime(ao12) : "–"}
            </div>
          </div>
        </div>

        {/* Meta */}
        <dl className="space-y-2 mb-5 text-sm">
          <MetaRow label="Cube-Type" value={solve.cube_type} />
          <MetaRow
            label="Hardware"
            value={hardwareName ?? <span className="text-gray-600 italic">—</span>}
          />
          <MetaRow
            label="Session"
            value={sessionName ?? <span className="text-gray-600 italic">—</span>}
          />
          <MetaRow
            label="+2-Strafe"
            value={solve.plus_two ? "ja (+2.00s)" : <span className="text-gray-600">nein</span>}
          />
          <MetaRow
            label="DNF"
            value={solve.dnf ? "ja" : <span className="text-gray-600">nein</span>}
          />
        </dl>

        {/* Scramble (full) */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Scramble
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
            Notiz
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
              {solve.plus_two ? "+2 entfernen" : "+2 setzen"}
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
            {solve.dnf ? "DNF entfernen" : "DNF setzen"}
          </button>
          <button
            onClick={() => {
              if (confirm(`Solve ${formatSolveTime(solve)} wirklich loeschen?`)) {
                del.mutate(solve.id, { onSuccess: onClose });
              }
            }}
            className="text-base rounded bg-gray-700 px-3 py-2 text-gray-300 hover:bg-red-700/50 hover:text-red-200"
          >
            🗑 Loeschen
          </button>
          <button
            onClick={onClose}
            className="ml-auto text-base rounded bg-gray-800 px-4 py-2 text-gray-300 hover:bg-gray-700"
          >
            Schliessen
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

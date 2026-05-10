/**
 * Solves-View — MVP. Eingabe per Form (kein Spacebar-Timer im MVP).
 * Liste zeigt letzte 100 Solves mit toggleable +2/DNF + Delete.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSolve,
  deleteSolve,
  listSolves,
  updateSolve,
  type Solve,
  type DbSession,
  type Hardware,
} from "../api/resources";

export function SolvesView({
  sessions,
  hardware,
}: {
  sessions: DbSession[];
  hardware: Hardware[];
}) {
  const qc = useQueryClient();
  const solvesQuery = useQuery({ queryKey: ["solves"], queryFn: () => listSolves({ limit: 100 }) });

  const [seconds, setSeconds] = useState("");
  const [cubeType, setCubeType] = useState("3x3");
  const [sessionId, setSessionId] = useState<string>("");
  const [hardwareId, setHardwareId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createSolve,
    onSuccess: () => {
      setSeconds("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["solves"] });
    },
    onError: (err: unknown) => setError(extractErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...patch }: { id: number } & Parameters<typeof updateSolve>[1]) =>
      updateSolve(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solves"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSolve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solves"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = parseFloat(seconds.replace(",", "."));
    if (!isFinite(s) || s < 0) {
      setError("Ungueltige Zeit.");
      return;
    }
    createMut.mutate({
      time_ms: Math.round(s * 1000),
      cube_type: cubeType.trim() || "3x3",
      session_id: sessionId ? Number(sessionId) : null,
      hardware_id: hardwareId ? Number(hardwareId) : null,
    });
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Neuer Solve</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Zeit in Sekunden (z.B. 12.34)"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Cube (z.B. 3x3)"
            value={cubeType}
            onChange={(e) => setCubeType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">— Session —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={hardwareId}
            onChange={(e) => setHardwareId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">— Hardware —</option>
            {hardware.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.primary_cube_type})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-blue-600 text-white font-medium py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? "…" : "Speichern"}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-700 mt-2 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Letzte Solves{" "}
          <span className="text-sm text-slate-400 font-normal">
            ({solvesQuery.data?.length ?? 0})
          </span>
        </h2>
        {solvesQuery.isLoading && <p className="text-slate-500">Laedt…</p>}
        {solvesQuery.data?.length === 0 && (
          <p className="text-slate-500">Noch keine Solves. Tipp deinen ersten oben ein.</p>
        )}
        {solvesQuery.data && solvesQuery.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1 pr-3">Zeit</th>
                  <th className="py-1 pr-3">Cube</th>
                  <th className="py-1 pr-3">Wann</th>
                  <th className="py-1 pr-3">Flags</th>
                  <th className="py-1 pr-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {solvesQuery.data.map((s) => (
                  <SolveRow
                    key={s.id}
                    solve={s}
                    onToggle={(patch) => updateMut.mutate({ id: s.id, ...patch })}
                    onDelete={() => {
                      if (window.confirm(`Solve ${s.id} loeschen?`)) deleteMut.mutate(s.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SolveRow({
  solve,
  onToggle,
  onDelete,
}: {
  solve: Solve;
  onToggle: (patch: { plus_two?: boolean; dnf?: boolean }) => void;
  onDelete: () => void;
}) {
  const eff = solve.effective_time_ms;
  return (
    <tr className="border-b border-slate-100">
      <td className="py-1 pr-3 font-mono">
        {solve.dnf ? <span className="text-red-600">DNF</span> : formatMs(eff ?? solve.time_ms)}
        {solve.plus_two && !solve.dnf && <span className="text-amber-600 ml-1">+2</span>}
      </td>
      <td className="py-1 pr-3">{solve.cube_type}</td>
      <td className="py-1 pr-3 text-slate-500">{formatTimestamp(solve.timestamp)}</td>
      <td className="py-1 pr-3">
        <button
          onClick={() => onToggle({ plus_two: !solve.plus_two })}
          className={`text-xs px-2 py-0.5 rounded mr-1 ${
            solve.plus_two ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
          }`}
        >
          +2
        </button>
        <button
          onClick={() => onToggle({ dnf: !solve.dnf })}
          className={`text-xs px-2 py-0.5 rounded ${
            solve.dnf ? "bg-red-200 text-red-900" : "bg-slate-100 text-slate-600"
          }`}
        >
          DNF
        </button>
      </td>
      <td className="py-1 pr-3 text-right">
        <button
          onClick={onDelete}
          className="text-xs text-red-600 hover:text-red-800"
          title="Loeschen"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function formatMs(ms: number): string {
  const s = ms / 1000;
  return s.toFixed(2);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return "Unbekannter Fehler.";
}

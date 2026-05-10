/**
 * Sessions-View — MVP. Liste + Anlegen + Loeschen.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSession, deleteSession, listSessions } from "../api/resources";

export function SessionsView() {
  const qc = useQueryClient();
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: listSessions });

  const [name, setName] = useState("");
  const [scrambleType, setScrambleType] = useState("3x3");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      setName("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err: unknown) => setError(extractErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }
    createMut.mutate({ name: name.trim(), scramble_type: scrambleType.trim() || null });
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Neue Session</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Name (z.B. Practice 3x3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Scramble-Type (z.B. 3x3)"
            value={scrambleType}
            onChange={(e) => setScrambleType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-blue-600 text-white font-medium py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? "…" : "Anlegen"}
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
          Sessions{" "}
          <span className="text-sm text-slate-400 font-normal">
            ({sessionsQuery.data?.length ?? 0})
          </span>
        </h2>
        {sessionsQuery.isLoading && <p className="text-slate-500">Laedt…</p>}
        {sessionsQuery.data?.length === 0 && (
          <p className="text-slate-500">Keine Sessions.</p>
        )}
        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {sessionsQuery.data.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900">{s.name}</span>
                  {s.scramble_type && (
                    <span className="text-slate-400 text-sm ml-2">({s.scramble_type})</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Session "${s.name}" loeschen?`)) deleteMut.mutate(s.id);
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Loeschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return "Unbekannter Fehler.";
}

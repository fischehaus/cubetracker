/**
 * Hardware-View — MVP. Liste + Anlegen + Loeschen.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHardware, deleteHardware, listHardware } from "../api/resources";

export function HardwareView() {
  const qc = useQueryClient();
  const hardwareQuery = useQuery({ queryKey: ["hardware"], queryFn: listHardware });

  const [name, setName] = useState("");
  const [cubeType, setCubeType] = useState("3x3");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createHardware,
    onSuccess: () => {
      setName("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["hardware"] });
    },
    onError: (err: unknown) => setError(extractErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHardware,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hardware"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }
    createMut.mutate({ name: name.trim(), primary_cube_type: cubeType.trim() || "3x3" });
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Neue Hardware</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Name (z.B. Weilong v11)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Primaerer Cube (z.B. 3x3)"
            value={cubeType}
            onChange={(e) => setCubeType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
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
          Hardware{" "}
          <span className="text-sm text-slate-400 font-normal">
            ({hardwareQuery.data?.length ?? 0})
          </span>
        </h2>
        {hardwareQuery.isLoading && <p className="text-slate-500">Laedt…</p>}
        {hardwareQuery.data?.length === 0 && (
          <p className="text-slate-500">Keine Hardware-Eintraege.</p>
        )}
        {hardwareQuery.data && hardwareQuery.data.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {hardwareQuery.data.map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900">{h.name}</span>
                  <span className="text-slate-400 text-sm ml-2">({h.primary_cube_type})</span>
                  {!h.is_active && (
                    <span className="text-xs text-slate-400 ml-2 italic">inaktiv</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Hardware "${h.name}" loeschen?`)) deleteMut.mutate(h.id);
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

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { ImportPanel } from "./components/ImportPanel";
import { SessionSwitcher } from "./components/SessionSwitcher";
import { SolveForm } from "./components/SolveForm";
import { SolveList } from "./components/SolveList";
import { StatsCard } from "./components/StatsCard";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
});

interface Health {
  app: string;
  version: string;
  status: string;
}

function HealthBadge() {
  const { data, error } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: async () => (await api.get<Health>("/")).data,
    refetchInterval: 30_000,
  });

  if (error) {
    return (
      <span className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
        Backend offline
      </span>
    );
  }
  if (!data) {
    return <span className="text-xs text-gray-500">…</span>;
  }
  return (
    <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1">
      Backend v{data.version}
    </span>
  );
}

function MainLayout() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  // Cube-Filter wird hier zentral verwaltet, damit SolveList + StatsCard auf
  // dieselbe Filter-Auswahl reagieren.
  const [cubeFilter, setCubeFilter] = useState<string>("");

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">cubetracker</h1>
            <p className="text-sm text-gray-400">
              Speedcubing-Solve-Tracking, lokal.
            </p>
          </div>
          <HealthBadge />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          <aside className="space-y-6">
            <SessionSwitcher value={sessionId} onChange={setSessionId} />
            <SolveForm />
            <ImportPanel />
            <StatsCard
              cubeType={cubeFilter || undefined}
              sessionId={sessionId}
            />
          </aside>

          <main>
            <SolveList
              sessionId={sessionId}
              cubeFilter={cubeFilter}
              onCubeFilterChange={setCubeFilter}
            />
          </main>
        </div>

        <footer className="mt-8 text-xs text-gray-500 text-center">
          Phase 1 MVP — F5 fertig (Basis-Stats + PB-Marker). v0.1.
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout />
    </QueryClientProvider>
  );
}

export default App;

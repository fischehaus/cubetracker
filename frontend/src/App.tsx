// App-Wurzel: TabBar oben, persistenter Header (Title + Session + Backend-Badge),
// dann die jeweils aktive Tab-Ansicht.
//
// Globale States, die ueber Tab-Wechsel persistieren:
// - sessionId  (welche csTimer-Session aktiv ist, gilt fuer alle Karten)
// - cubeFilter (welcher Cube-Type gefiltert ist; in TIMER bewusst ungenutzt)
// - tab        (aktueller Tab; in localStorage persistiert)

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { HistogramChart } from "./components/HistogramChart";
import { ImportPanel } from "./components/ImportPanel";
import { MultiCubeCompareCard } from "./components/MultiCubeCompareCard";
import { OutlierCard } from "./components/OutlierCard";
import { ReminderCard } from "./components/ReminderCard";
import { SessionSwitcher } from "./components/SessionSwitcher";
import { SolveForm } from "./components/SolveForm";
import { SolveList } from "./components/SolveList";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
import { TodayWeekCard } from "./components/TodayWeekCard";
import { TrendsChart } from "./components/TrendsChart";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
});

const TAB_STORAGE_KEY = "cubetracker.tab";

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

// ============================================================
// Tab-Inhalte — bewusst noch nahe am bisherigen Layout, weil das
// inhaltliche Redesign in Branch C/D/E folgt. B liefert nur die
// Routing-Struktur + Verteilung der existierenden Komponenten.
// ============================================================

function TimerTab({ sessionId }: { sessionId: number | null }) {
  // TIMER soll fokussiert sein: Eingabe + letzte paar Solves zur Kontrolle.
  // Keine Charts, keine Multi-Cube-Karten — die lenken beim Solven ab.
  // (Branch C wird die Eingabe gross + zentriert machen.)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <main>
        <SolveForm />
      </main>
      <aside className="space-y-6">
        <StatsCard cubeType={undefined} sessionId={sessionId} />
      </aside>
    </div>
  );
}

function DashboardTab({ sessionId }: { sessionId: number | null }) {
  // DASHBOARD = Live-Sicht beim Solven oder zwischendrin: heute + Woche,
  // welcher Cube laeuft gerade gut, was hab ich vergessen.
  // Bewusst keine schweren Charts — nur Karten zum Drueberblicken.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <main className="space-y-6">
        <TodayWeekCard sessionId={sessionId} />
        <MultiCubeCompareCard sessionId={sessionId} />
        <StatsCard cubeType={undefined} sessionId={sessionId} />
      </main>
      <aside className="space-y-6">
        <ReminderCard sessionId={sessionId} />
      </aside>
    </div>
  );
}

function AnalyseTab({
  sessionId,
  cubeFilter,
  setCubeFilter,
}: {
  sessionId: number | null;
  cubeFilter: string;
  setCubeFilter: (s: string) => void;
}) {
  // ANALYSE = Deep-Dive: alle Charts + Outlier-Pflege + volle editierbare Liste.
  // Cube-Filter wirkt hier auf alle Anzeigen.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <main className="space-y-6">
        <TrendsChart cubeType={cubeFilter || undefined} sessionId={sessionId} />
        <HistogramChart cubeType={cubeFilter || undefined} sessionId={sessionId} />
        <SolveList
          sessionId={sessionId}
          cubeFilter={cubeFilter}
          onCubeFilterChange={setCubeFilter}
        />
      </main>
      <aside className="space-y-6">
        <OutlierCard />
        <ImportPanel />
        <StatsCard cubeType={cubeFilter || undefined} sessionId={sessionId} />
      </aside>
    </div>
  );
}

// ============================================================
// MainLayout — TabBar + Tab-Content
// ============================================================

function loadInitialTab(): AppTab {
  if (typeof window === "undefined") return "dashboard";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  if (stored === "timer" || stored === "dashboard" || stored === "analyse") {
    return stored;
  }
  return "dashboard";
}

function MainLayout() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [cubeFilter, setCubeFilter] = useState<string>("");
  const [tab, setTab] = useState<AppTab>(loadInitialTab);

  // Tab-Wahl persistieren — Reload landet wieder auf demselben Tab.
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // localStorage kann blockiert sein (private mode, etc.) — egal.
    }
  }, [tab]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">cubetracker</h1>
            <p className="text-sm text-gray-400">
              Speedcubing-Solve-Tracking, lokal.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* SessionSwitcher ist global persistent — gilt fuer alle Tabs. */}
            <div className="min-w-[260px]">
              <SessionSwitcher value={sessionId} onChange={setSessionId} />
            </div>
            <HealthBadge />
          </div>
        </header>

        <TabBar current={tab} onChange={setTab} />

        {tab === "timer" && <TimerTab sessionId={sessionId} />}
        {tab === "dashboard" && <DashboardTab sessionId={sessionId} />}
        {tab === "analyse" && (
          <AnalyseTab
            sessionId={sessionId}
            cubeFilter={cubeFilter}
            setCubeFilter={setCubeFilter}
          />
        )}

        <footer className="mt-8 text-xs text-gray-500 text-center">
          Phase 3 fertig (v0.3) · Phase 4 in Vorbereitung — Tab-Routing aktiv.
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

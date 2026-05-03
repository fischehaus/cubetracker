// App-Wurzel: TabBar oben, persistente Header-Leiste, dann die jeweils
// aktive Tab-Ansicht.
//
// Phase L-2: Filter pro Bereich. Es gibt keinen globalen Filter mehr —
// jeder Tab hat seine eigene Filter-Bar, deren State in App.tsx
// lokalisiert ist (damit Tab-Wechsel den jeweiligen Filter erhaelt).
//
// Header zeigt nur noch Title + Backend-Badge.

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { ActivityCard } from "./components/ActivityCard";
import { ActivityChart } from "./components/ActivityChart";
import { AnalyseFilterBar } from "./components/AnalyseFilterBar";
import { BigTimerInput } from "./components/BigTimerInput";
import { DashboardFilterBar } from "./components/DashboardFilterBar";
import { HardwareCompareCard } from "./components/HardwareCompareCard";
import { HistogramChart } from "./components/HistogramChart";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCompareCard } from "./components/MultiCompareCard";
import { ReminderCard } from "./components/ReminderCard";
import { SolveList } from "./components/SolveList";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
import { TrendsChart } from "./components/TrendsChart";
import { VerwaltungTab } from "./components/VerwaltungTab";
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
      <span className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
        Backend offline
      </span>
    );
  }
  if (!data) {
    return <span className="text-sm text-gray-500">…</span>;
  }
  return (
    <span className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-1.5">
      Backend v{data.version}
    </span>
  );
}

// ============================================================
// Tab-Inhalte
// ============================================================

function TimerTab({
  timerCubeType,
  setTimerCubeType,
}: {
  timerCubeType: string;
  setTimerCubeType: (s: string) => void;
}) {
  // TIMER hat keine externe Filter-Leiste — Cube/Session/Hardware
  // werden im BigTimerInput gewaehlt.
  const [timerSessionId, setTimerSessionId] = useState<number | null>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <main>
        <BigTimerInput
          cubeType={timerCubeType}
          onCubeTypeChange={setTimerCubeType}
          sessionId={timerSessionId}
          onSessionIdChange={setTimerSessionId}
        />
      </main>
      <aside>
        <LastSolvesPreview cubeType={timerCubeType} sessionId={timerSessionId} />
      </aside>
    </div>
  );
}

function DashboardTab({
  sessionId,
  setSessionId,
}: {
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
}) {
  // DASHBOARD = Live-Sicht. Optionaler Session-Filter (default 'alle').
  // Cube-Filter bewusst NICHT — Dashboard vergleicht cube-uebergreifend.
  return (
    <div className="space-y-6">
      <DashboardFilterBar
        sessionId={sessionId}
        onSessionIdChange={setSessionId}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActivityCard sessionId={sessionId} slice="today" />
        <ActivityCard sessionId={sessionId} slice="week" />
        <ReminderCard sessionId={sessionId} emptyMode="visible" />
      </div>
      <MultiCompareCard sessionId={sessionId} />
      <StatsCard cubeType={undefined} sessionId={sessionId} />
    </div>
  );
}

function AnalyseTab({
  sessionId,
  setSessionId,
  cubeFilter,
  setCubeFilter,
}: {
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
  cubeFilter: string;
  setCubeFilter: (s: string) => void;
}) {
  // ANALYSE = NUR Auswertung. Filter-Bar managed Cube + Session.
  return (
    <div className="space-y-6">
      <AnalyseFilterBar
        cubeFilter={cubeFilter}
        onCubeFilterChange={setCubeFilter}
        sessionId={sessionId}
        onSessionIdChange={setSessionId}
      />

      <StatsCard cubeType={cubeFilter || undefined} sessionId={sessionId} />

      <TrendsChart cubeType={cubeFilter || undefined} sessionId={sessionId} />

      <ActivityChart cubeType={cubeFilter || undefined} sessionId={sessionId} />

      {cubeFilter ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HistogramChart
            cubeType={cubeFilter || undefined}
            sessionId={sessionId}
          />
          <HardwareCompareCard cubeType={cubeFilter} sessionId={sessionId} />
        </div>
      ) : (
        <HistogramChart
          cubeType={cubeFilter || undefined}
          sessionId={sessionId}
        />
      )}

      <SolveList
        sessionId={sessionId}
        cubeFilter={cubeFilter}
        onCubeFilterChange={setCubeFilter}
      />
    </div>
  );
}

// ============================================================
// MainLayout
// ============================================================

function loadInitialTab(): AppTab {
  if (typeof window === "undefined") return "dashboard";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  if (
    stored === "timer" ||
    stored === "dashboard" ||
    stored === "analyse" ||
    stored === "verwaltung"
  ) {
    return stored;
  }
  return "dashboard";
}

function MainLayout() {
  // Per-Tab-State, damit Tab-Wechsel den jeweiligen Filter NICHT verliert.
  // Bewusst NICHT geteilt zwischen Tabs (Dashboard- und Analyse-Filter
  // sind unabhaengig).
  const [timerCubeType, setTimerCubeType] = useState<string>("3x3");
  const [dashboardSessionId, setDashboardSessionId] = useState<number | null>(
    null
  );
  const [analyseSessionId, setAnalyseSessionId] = useState<number | null>(null);
  const [analyseCubeFilter, setAnalyseCubeFilter] = useState<string>("");
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
            <h1 className="text-4xl font-bold text-gray-100">cubetracker</h1>
            <p className="text-base text-gray-400">
              Speedcubing-Solve-Tracking, lokal.
            </p>
          </div>
          <HealthBadge />
        </header>

        <TabBar current={tab} onChange={setTab} />

        {tab === "timer" && (
          <TimerTab
            timerCubeType={timerCubeType}
            setTimerCubeType={setTimerCubeType}
          />
        )}
        {tab === "dashboard" && (
          <DashboardTab
            sessionId={dashboardSessionId}
            setSessionId={setDashboardSessionId}
          />
        )}
        {tab === "analyse" && (
          <AnalyseTab
            sessionId={analyseSessionId}
            setSessionId={setAnalyseSessionId}
            cubeFilter={analyseCubeFilter}
            setCubeFilter={setAnalyseCubeFilter}
          />
        )}
        {tab === "verwaltung" && <VerwaltungTab />}

        <footer className="mt-8 text-sm text-gray-500 text-center">
          v0.6 · L-2 Layout (4 Tabs · Filter pro Bereich)
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

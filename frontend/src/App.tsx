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
import { ActivityCard } from "./components/ActivityCard";
import { ActivityChart } from "./components/ActivityChart";
import { AnalyseFilterBar } from "./components/AnalyseFilterBar";
import { BigTimerInput } from "./components/BigTimerInput";
import { HardwareList } from "./components/HardwareList";
import { HistogramChart } from "./components/HistogramChart";
import { ImportPanel } from "./components/ImportPanel";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCubeCompareCard } from "./components/MultiCubeCompareCard";
import { OutlierCard } from "./components/OutlierCard";
import { ReminderCard } from "./components/ReminderCard";
import { SessionSwitcher } from "./components/SessionSwitcher";
import { SolveList } from "./components/SolveList";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
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
// Tab-Inhalte — bewusst noch nahe am bisherigen Layout, weil das
// inhaltliche Redesign in Branch C/D/E folgt. B liefert nur die
// Routing-Struktur + Verteilung der existierenden Komponenten.
// ============================================================

function TimerTab({
  sessionId,
  timerCubeType,
  setTimerCubeType,
}: {
  sessionId: number | null;
  timerCubeType: string;
  setTimerCubeType: (s: string) => void;
}) {
  // TIMER ist Solving-Modus: grosse zentrale Eingabe + Live-ao5/ao12 +
  // letzte 8 Solves zur Kontrolle. Keine Charts, kein Multi-Cube-Vergleich.
  // Cube-Type ist eigener State (nicht der globale cubeFilter), damit man
  // hier seinen Trainings-Cube waehlt ohne den Analyse-Filter zu beruehren.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <main>
        <BigTimerInput
          cubeType={timerCubeType}
          onCubeTypeChange={setTimerCubeType}
        />
      </main>
      <aside>
        <LastSolvesPreview cubeType={timerCubeType} sessionId={sessionId} />
      </aside>
    </div>
  );
}

function DashboardTab({ sessionId }: { sessionId: number | null }) {
  // DASHBOARD = Live-Sicht beim Solven oder zwischendrin. Layout:
  //  Top-Row: 3 Quick-Cards (Heute / Diese Woche / Reminders)
  //  Mitte:   MultiCube-Vergleich auf voller Breite
  //  Unten:   StatsCard kompakt
  // Bewusst keine Charts — die wohnen im ANALYSE-Tab.
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActivityCard sessionId={sessionId} slice="today" />
        <ActivityCard sessionId={sessionId} slice="week" />
        <ReminderCard sessionId={sessionId} emptyMode="visible" />
      </div>
      <MultiCubeCompareCard sessionId={sessionId} />
      <StatsCard cubeType={undefined} sessionId={sessionId} />
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
  // ANALYSE = Deep-Dive. Layout:
  //  Filter-Bar oben (cube zentral, session aus globalem header)
  //  Trends-Chart full-width gross
  //  Stats + Histogramm + Outlier in 3-spalten-grid
  //  Solves-Liste full-width unten
  //  Import-Panel ganz unten (admin-aktion)
  return (
    <div className="space-y-6">
      <AnalyseFilterBar
        cubeFilter={cubeFilter}
        onCubeFilterChange={setCubeFilter}
      />

      <TrendsChart cubeType={cubeFilter || undefined} sessionId={sessionId} />

      <ActivityChart cubeType={cubeFilter || undefined} sessionId={sessionId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HistogramChart
            cubeType={cubeFilter || undefined}
            sessionId={sessionId}
          />
        </div>
        <div>
          <OutlierCard sessionId={sessionId} />
        </div>
      </div>

      <SolveList
        sessionId={sessionId}
        cubeFilter={cubeFilter}
        onCubeFilterChange={setCubeFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsCard cubeType={cubeFilter || undefined} sessionId={sessionId} />
        <ImportPanel />
      </div>

      <HardwareList />
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
  // Cube-Type fuer den TIMER-Tab — bewusst getrennt vom analyse-cubeFilter,
  // damit eine 3x3-Trainings-Session nicht den Analyse-Filter „verbiegt".
  const [timerCubeType, setTimerCubeType] = useState<string>("3x3");
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
          <div className="flex items-center gap-3 flex-wrap">
            {/* SessionSwitcher ist global persistent — gilt fuer alle Tabs. */}
            <div className="min-w-[260px]">
              <SessionSwitcher value={sessionId} onChange={setSessionId} />
            </div>
            <HealthBadge />
          </div>
        </header>

        <TabBar current={tab} onChange={setTab} />

        {tab === "timer" && (
          <TimerTab
            sessionId={sessionId}
            timerCubeType={timerCubeType}
            setTimerCubeType={setTimerCubeType}
          />
        )}
        {tab === "dashboard" && <DashboardTab sessionId={sessionId} />}
        {tab === "analyse" && (
          <AnalyseTab
            sessionId={sessionId}
            cubeFilter={cubeFilter}
            setCubeFilter={setCubeFilter}
          />
        )}

        <footer className="mt-8 text-sm text-gray-500 text-center">
          Phase 4 fertig (v0.4) · Tab-Routing + UI-Refresh aktiv.
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

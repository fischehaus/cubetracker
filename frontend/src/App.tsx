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
import { HardwareCompareCard } from "./components/HardwareCompareCard";
import { HistogramChart } from "./components/HistogramChart";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCompareCard } from "./components/MultiCompareCard";
import { ReminderCard } from "./components/ReminderCard";
import { SessionSwitcher } from "./components/SessionSwitcher";
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
// Tab-Inhalte — bewusst noch nahe am bisherigen Layout, weil das
// inhaltliche Redesign in Branch C/D/E folgt. B liefert nur die
// Routing-Struktur + Verteilung der existierenden Komponenten.
// ============================================================

function TimerTab({
  timerCubeType,
  setTimerCubeType,
}: {
  timerCubeType: string;
  setTimerCubeType: (s: string) => void;
}) {
  // TIMER = Solving-Modus mit eigener Session/Hardware-Wahl pro Cube.
  // BigTimerInput managed sessionId/hardwareId intern und ruft onSessionChange,
  // damit LastSolvesPreview parallel auf dieselbe Session filtert (sonst
  // siehst du andere Solves als die, die du gerade speicherst).
  // Globaler Header-SessionSwitcher beeinflusst diesen Tab bewusst NICHT.
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
      <MultiCompareCard sessionId={sessionId} />
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
  // ANALYSE = NUR Auswertung (kein Datenpflege-Krempel mehr).
  // Layout:
  //  Filter-Bar oben
  //  Stats kompakt (eine Zeile, fasst den Filter zusammen)
  //  Trends-Chart (full-width)
  //  Activity-Chart (full-width)
  //  Histogramm + Hardware-Vergleich (2-spalten, Hardware nur bei
  //    aktivem cube-filter — sonst nimmt Histogramm volle Breite)
  //  Solveliste (mit Inline-Edit + Limit-Selektor)
  //
  // Sessions/Hardware/Import/Outliers sind in den VERWALTUNG-Tab
  // gewandert (Phase L-1).
  return (
    <div className="space-y-6">
      <AnalyseFilterBar
        cubeFilter={cubeFilter}
        onCubeFilterChange={setCubeFilter}
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
// MainLayout — TabBar + Tab-Content
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
        {tab === "verwaltung" && <VerwaltungTab sessionId={sessionId} />}

        <footer className="mt-8 text-sm text-gray-500 text-center">
          v0.6 · L-1 Layout (4 Tabs)
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

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
import { AchievementsMiniCard } from "./components/AchievementsMiniCard";
import { AchievementToaster } from "./components/AchievementToaster";
import { ActivityCard } from "./components/ActivityCard";
import { ActivityChart } from "./components/ActivityChart";
import { AnalyseFilterBar } from "./components/AnalyseFilterBar";
import { BigTimerInput } from "./components/BigTimerInput";
import { ChallengeCompletionToaster } from "./components/ChallengeCompletionToaster";
import { ChallengesMiniCard } from "./components/ChallengesMiniCard";
import { DashboardFilterBar } from "./components/DashboardFilterBar";
import { ScrambleCard } from "./components/ScrambleCard";
import { useSessions } from "./lib/api";
import { HardwareCompareCard } from "./components/HardwareCompareCard";
import { HistogramChart } from "./components/HistogramChart";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCompareCard } from "./components/MultiCompareCard";
import { OnboardingBanner } from "./components/OnboardingBanner";
import { ReminderCard } from "./components/ReminderCard";
import { SolveList } from "./components/SolveList";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
import { TrainerTab } from "./components/TrainerTab";
import { TrendsChart } from "./components/TrendsChart";
import { VerwaltungTab } from "./components/VerwaltungTab";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
});

const TAB_STORAGE_KEY = "cubetracker.tab";

// Hash-Routing fuer Tabs (Phase L-3c). URL-Hash <-> AppTab.
// Vorteile: Browser-Back, Bookmarks, Reload landet auf gleicher Sicht.
// Bewusst einfach via window.location.hash — keine Router-Lib noetig.
const VALID_TABS: AppTab[] = [
  "timer",
  "dashboard",
  "analyse",
  "verwaltung",
  "trainer",
];

function tabFromHash(): AppTab | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  return (VALID_TABS as string[]).includes(raw) ? (raw as AppTab) : null;
}

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

  // Phase 8a: Scramble-State im TimerTab orchestriert.
  // - currentScramble: aktueller String, an BigTimerInput fuer Save
  // - regenSeed: counter den BigTimerInput nach jedem Save bumpt,
  //              damit ScrambleCard re-generiert
  const [currentScramble, setCurrentScramble] = useState<string>("");
  const [regenSeed, setRegenSeed] = useState(0);

  // Session-Override: wenn die gewaehlte Session einen scramble_type
  // setzt (Phase 8b — z.B. "pll" oder "oll"), nutzt ScrambleCard den
  // statt cube_type. So kann man eine PLL-Trainings-Session anlegen.
  const { data: sessions } = useSessions();
  const activeSession = sessions?.find((s) => s.id === timerSessionId);
  const scrambleTypeOverride = activeSession?.scramble_type ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <main className="space-y-4">
        <ScrambleCard
          cubeType={timerCubeType}
          scrambleTypeOverride={scrambleTypeOverride}
          regenerationSeed={regenSeed}
          onScrambleGenerated={setCurrentScramble}
        />
        <BigTimerInput
          cubeType={timerCubeType}
          onCubeTypeChange={setTimerCubeType}
          sessionId={timerSessionId}
          onSessionIdChange={setTimerSessionId}
          scramble={currentScramble}
          onSolveSaved={() => setRegenSeed((s) => s + 1)}
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
  onSwitchTab,
}: {
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
  onSwitchTab: (tab: AppTab) => void;
}) {
  // DASHBOARD = Live-Sicht. Optionaler Session-Filter (default 'alle').
  // Cube-Filter bewusst NICHT — Dashboard vergleicht cube-uebergreifend.
  // Phase 7a: AchievementsMiniCard kompakt — Klick fuehrt zum Trainer-Tab.
  // Phase 7b: ChallengesMiniCard daneben, ebenfalls Klick → Trainer-Tab.
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChallengesMiniCard onSwitchTab={onSwitchTab} />
        <AchievementsMiniCard onSwitchTab={onSwitchTab} />
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
  // Prio 1: URL-Hash (z.B. #analyse) — Bookmark/Reload-Wahl
  const fromHash = tabFromHash();
  if (fromHash) return fromHash;
  // Prio 2: localStorage (zuletzt genutzt)
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  if ((VALID_TABS as string[]).includes(stored ?? "")) {
    return stored as AppTab;
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

  // Tab-Wahl persistieren — localStorage + URL-Hash, damit
  // Reload + Browser-Back beide funktionieren.
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // localStorage kann blockiert sein (private mode, etc.) — egal.
    }
    // URL-Hash setzen ohne page-reload. Nur wenn wirklich anders,
    // sonst gibt es overschuessige history-eintraege.
    const target = `#${tab}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [tab]);

  // Browser-Back/Forward: hash-aenderung von aussen reagieren.
  useEffect(() => {
    function onHashChange() {
      const t = tabFromHash();
      if (t && t !== tab) setTab(t);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
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

        <OnboardingBanner onSwitchTab={setTab} />

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
            onSwitchTab={setTab}
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
        {tab === "trainer" && <TrainerTab />}

        <footer className="mt-8 text-sm text-gray-500 text-center">
          v0.12 · Spacebar-Timer + WCA-Inspection + Multi-Phase-Splits + Settings
        </footer>
      </div>

      {/* Globale Toaster — bleiben auf jedem Tab sichtbar */}
      <AchievementToaster />
      <ChallengeCompletionToaster />
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

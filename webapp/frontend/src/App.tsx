// App-Wurzel: TabBar oben, persistente Header-Leiste, dann die jeweils
// aktive Tab-Ansicht.
//
// Phase L-2: Filter pro Bereich. Es gibt keinen globalen Filter mehr —
// jeder Tab hat seine eigene Filter-Bar, deren State in App.tsx
// lokalisiert ist (damit Tab-Wechsel den jeweiligen Filter erhält).
//
// Header zeigt nur noch Title + Backend-Badge.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ImpressumPage } from "./pages/ImpressumPage";
import { DatenschutzPage } from "./pages/DatenschutzPage";
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
import { PbConfettiOverlay } from "./components/PbConfettiOverlay";
import { ScrambleCard } from "./components/ScrambleCard";
import { SessionPlanCard } from "./components/SessionPlanCard";
import { TimerControlsCard } from "./components/TimerControlsCard";
import { TouchTimerPad } from "./components/TouchTimerPad";
import { useAppSettings } from "./lib/settings";
import { useSessions } from "./lib/api";
import { HardwareCompareCard } from "./components/HardwareCompareCard";
import { HistogramChart } from "./components/HistogramChart";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCompareCard } from "./components/MultiCompareCard";
import { RecentRecordsCard } from "./components/RecentRecordsCard";
import { NewsCard } from "./components/NewsCard";
import { FeatureListPanel } from "./components/FeatureListPanel";
import { FeedbackModal } from "./components/FeedbackModal";
import { RoadmapModal } from "./components/RoadmapModal";
import { OnboardingBanner } from "./components/OnboardingBanner";
import { PatchNotesPanel } from "./components/PatchNotesPanel";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { UserMenu } from "./components/UserMenu";
import { ReminderCard } from "./components/ReminderCard";
import { SolveList } from "./components/SolveList";
import { CommunityTab, type CommunitySection } from "./components/CommunityTab";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
import { TrainerTab } from "./components/TrainerTab";
import { TrendsChart } from "./components/TrendsChart";
import { PbProgressionCard } from "./components/PbProgressionCard";
import { VerwaltungTab } from "./components/VerwaltungTab";
import { WcaUpcomingCard } from "./components/WcaUpcomingCard";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
});

const TAB_STORAGE_KEY = "cubetracker.tab";

// Hash-Routing für Tabs (Phase L-3c). URL-Hash <-> AppTab.
// Vorteile: Browser-Back, Bookmarks, Reload landet auf gleicher Sicht.
// Bewusst einfach via window.location.hash — keine Router-Lib nötig.
const VALID_TABS: AppTab[] = [
  "timer",
  "dashboard",
  "analyse",
  "verwaltung",
  "trainer",
  "community",
];

// Backward-Compat: alte URL-Hashes (#friends, #leaderboard) mappen auf
// den neuen Community-Tab + setzen den passenden Sub-Tab. Damit landen
// User mit Bookmarks/History-Einträgen weiter sinnvoll.
const LEGACY_HASH_MAP: Record<string, { tab: AppTab; sub?: CommunitySection }> = {
  friends: { tab: "community", sub: "friends" },
  leaderboard: { tab: "community", sub: "leaderboard" },
};

function tabFromHash(): {
  tab: AppTab;
  communityInitial?: CommunitySection;
} | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  const legacy = LEGACY_HASH_MAP[raw];
  if (legacy) {
    return { tab: legacy.tab, communityInitial: legacy.sub };
  }
  if ((VALID_TABS as string[]).includes(raw)) {
    return { tab: raw as AppTab };
  }
  return null;
}

interface Health {
  app: string;
  version: string;
  status: string;
  mode?: "dev" | "prod"; // Phase 9 — neu, kann fehlen bei alten Backends
}

function HealthBadge({ onClick }: { onClick: () => void }) {
  // Version-Badge — Klick öffnet Patch-Notes-Modal (State lebt im
  // MainLayout, damit auch das UserMenu denselben Modal nutzen kann).
  const { t } = useTranslation();
  const { data, error } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: async () => {
      try {
        return (await api.get<Health>("/health")).data;
      } catch {
        return (await api.get<Health>("/")).data;
      }
    },
    refetchInterval: 30_000,
  });

  if (error) {
    return (
      <span className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
        {t("health.backendOffline")}
      </span>
    );
  }
  if (!data) {
    return <span className="text-sm text-gray-500">…</span>;
  }
  const isProd = data.mode === "prod";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isProd
          ? "text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-1.5 hover:bg-emerald-500/20 cursor-pointer transition-colors"
          : "text-sm text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded px-3 py-1.5 hover:bg-purple-500/20 cursor-pointer transition-colors"
      }
      title={t("health.patchNotesTitle")}
    >
      v{data.version}
      {data.mode && (
        <span className="ml-1 text-xs opacity-70">[{data.mode}]</span>
      )}
    </button>
  );
}

function PatchNotesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("health.closeAria")}
          >
            ×
          </button>
        </div>
        <PatchNotesPanel />
      </div>
    </div>
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
  // werden in der TimerControlsCard gewählt.
  // Welle 2 (2026-05-16): hardwareId aus BigTimerInput hochgezogen, damit
  // die Controls UNTER dem TouchPad als eigene Karte leben können ohne
  // dass die Hardware-Auswahl mit dem Save-Pfad in BigTimerInput auseinander
  // fallt.
  const [timerSessionId, setTimerSessionId] = useState<number | null>(null);
  const [timerHardwareId, setTimerHardwareId] = useState<number | null>(null);

  // Scramble-State im TimerTab orchestriert.
  // - currentScramble: aktueller String, an BigTimerInput für Save
  // - regenSeed: counter den BigTimerInput nach jedem Save bumpt,
  //              damit ScrambleCard re-generiert
  const [currentScramble, setCurrentScramble] = useState<string>("");
  const [regenSeed, setRegenSeed] = useState(0);

  // Session-Override: wenn die gewählte Session einen scramble_type
  // setzt (Phase 8b — z.B. "pll" oder "oll"), nutzt ScrambleCard den
  // statt cube_type. So kann man eine PLL-Trainings-Session anlegen.
  const { data: sessions } = useSessions();
  const activeSession = sessions?.find((s) => s.id === timerSessionId);
  const scrambleTypeOverride = activeSession?.scramble_type ?? null;

  // Settings nur für TouchPad-Sichtbarkeit — Tap-Pad nur im Spacebar-Modus,
  // sonst gibt es nichts zu „triggern" (Text-Mode = Soft-Tastatur).
  const [settings] = useAppSettings();
  const showTouchPad = settings.spacebar_enabled;

  // QA-Fix Welle 2 (2026-05-16): hardwareId bei Cube-Wechsel auf null
  // resetten. Sonst Race-Condition: useSuggestHardware in TimerControlsCard
  // braucht einen HTTP-Roundtrip um die passende Hardware für den neuen
  // Cube zu finden — wenn der User in der Latenz-Luecke Enter drückt,
  // wird die alte (cube-fremde) Hardware persistiert. Reset → worst case
  // = ohne Hardware (besser als = falsche Hardware). userPickedHardware-
  // Flag in TimerControlsCard greift weiterhin: wenn User selbst geklickt
  // hat, überschreibt der Auto-Suggest danach nicht mehr.
  // initialMountRef verhindert dass beim ersten Mount der Suggest geblockt
  // wird (initial gilt hardwareId === null sowieso → no-op).
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    setTimerHardwareId(null);
  }, [timerCubeType]);

  return (
    // Layout: Desktop = Live/Letzte-Solves links (420px), Solving rechts.
    // DOM-Reihenfolge im main = mobile-visuelle Reihenfolge (Welle 2,
    // 2026-05-16, User-Wunsch): Scramble direkt über Timer-Display,
    // dann TouchPad ("Tippen & halten"), erst danach die Selektoren —
    // weil man die nur selten während des Solvens braucht. SessionPlan
    // ganz oben weil's eine optionale Trainings-Karte ist.
    // Auf lg dreht `lg:order-1/2` nur die zwei Hauptspalten um (aside
    // links, main rechts) — die DOM-Reihenfolge bleibt a11y-korrekt.
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      <main className="lg:order-2 space-y-4">
        <SessionPlanCard cubeType={timerCubeType} sessionId={timerSessionId} />
        <ScrambleCard
          cubeType={timerCubeType}
          scrambleTypeOverride={scrambleTypeOverride}
          regenerationSeed={regenSeed}
          onScrambleGenerated={setCurrentScramble}
        />
        <BigTimerInput
          cubeType={timerCubeType}
          sessionId={timerSessionId}
          hardwareId={timerHardwareId}
          scramble={currentScramble}
          onSolveSaved={() => setRegenSeed((s) => s + 1)}
        />
        {/* TouchTimerPad rendert auf Desktop immer null — auf Phone nur
            sichtbar wenn Spacebar-Modus aktiv ist (Text-Mode = Soft-Tastatur,
            da gibt es nichts zu triggern). Lebt seit Welle 2 ausserhalb von
            BigTimerInput, damit der Selektor-Block in TimerControlsCard
            UNTER dem Pad scrollen kann. */}
        {showTouchPad && <TouchTimerPad />}
        <TimerControlsCard
          cubeType={timerCubeType}
          onCubeTypeChange={setTimerCubeType}
          sessionId={timerSessionId}
          onSessionIdChange={setTimerSessionId}
          hardwareId={timerHardwareId}
          onHardwareIdChange={setTimerHardwareId}
        />
      </main>
      <aside className="lg:order-1">
        <LastSolvesPreview cubeType={timerCubeType} sessionId={timerSessionId} />
      </aside>
    </div>
  );
}

function DashboardTab({
  sessionId,
  setSessionId,
  onSwitchTab,
  onSwitchToAnalyseCube,
}: {
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
  onSwitchTab: (tab: AppTab) => void;
  /** Klick auf einen "Letzten Rekord"-Eintrag: setze Cube-Filter im
   * Analyse-Tab und wechsle dort hin. */
  onSwitchToAnalyseCube: (cubeType: string) => void;
}) {
  const { t } = useTranslation();
  // DASHBOARD = Live-Sicht. Optionaler Session-Filter (default 'alle').
  // Cube-Filter bewusst NICHT — Dashboard vergleicht cube-übergreifend.
  //
  // Welle „W.dashboard-story" (2026-05-16): Big-Bang-Refactor mit Story-
  // Reihenfolge. Vier Sektionen mit semantischen <section>-Tags + sichtbaren
  // Mini-Headlines für Scan-Hilfe. Karten selbst unverändert, nur
  // Gruppierung + Reihenfolge neu.
  //
  // Story:
  //   1. HEUTE          — was hat heute/diese Woche stattgefunden, was muss erinnert werden
  //   2. DEINE PERFORMANCE — Vergleich + Gesamt-Stats
  //   3. TRAININGS-ANTRIEB — was treibt mich weiter (Challenges + Achievements)
  //   4. SPEEDCUBING-WELT — was passiert ausserhalb meiner App (Turniere + News)
  return (
    <div className="space-y-8">
      <DashboardFilterBar
        sessionId={sessionId}
        onSessionIdChange={setSessionId}
      />

      <DashboardSection title={t("dashboard.sectionToday")} id="dash-heute">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActivityCard sessionId={sessionId} slice="today" />
          <ActivityCard sessionId={sessionId} slice="week" />
          <ReminderCard sessionId={sessionId} emptyMode="visible" />
        </div>
      </DashboardSection>

      <DashboardSection title={t("dashboard.sectionPerformance")} id="dash-performance">
        <div className="space-y-4">
          <RecentRecordsCard onClickCube={onSwitchToAnalyseCube} />
          <MultiCompareCard sessionId={sessionId} />
          <StatsCard cubeType={undefined} sessionId={sessionId} />
        </div>
      </DashboardSection>

      <DashboardSection title={t("dashboard.sectionTraining")} id="dash-antrieb">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChallengesMiniCard onSwitchTab={onSwitchTab} />
          <AchievementsMiniCard onSwitchTab={onSwitchTab} />
        </div>
      </DashboardSection>

      <DashboardSection title={t("dashboard.sectionWorld")} id="dash-welt">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WcaUpcomingCard />
          <NewsCard />
        </div>
      </DashboardSection>
    </div>
  );
}

/**
 * Dashboard-Sektion: schmaler Header + Inhalts-Block. Semantisches
 * <section> mit aria-labelledby für Screenreader. Header ist visuell
 * dezent (kleine Schrift, hellerer Akzent), damit die Karten dominieren.
 */
function DashboardSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2
        id={id}
        className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-300/80"
      >
        {title}
      </h2>
      {children}
    </section>
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

      <PbProgressionCard cubeType={cubeFilter || undefined} sessionId={sessionId} />

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

function loadInitialTab(): {
  tab: AppTab;
  communityInitial?: CommunitySection;
} {
  if (typeof window === "undefined") return { tab: "dashboard" };
  // Prio 1: URL-Hash (z.B. #analyse) — Bookmark/Reload-Wahl
  const fromHash = tabFromHash();
  if (fromHash) return fromHash;
  // Prio 2: localStorage (zuletzt genutzt)
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  if ((VALID_TABS as string[]).includes(stored ?? "")) {
    return { tab: stored as AppTab };
  }
  return { tab: "dashboard" };
}

function MainLayout() {
  // Per-Tab-State, damit Tab-Wechsel den jeweiligen Filter NICHT verliert.
  // Bewusst NICHT geteilt zwischen Tabs (Dashboard- und Analyse-Filter
  // sind unabhängig).
  const [timerCubeType, setTimerCubeType] = useState<string>("3x3");
  const [dashboardSessionId, setDashboardSessionId] = useState<number | null>(
    null
  );
  const [analyseSessionId, setAnalyseSessionId] = useState<number | null>(null);
  const [analyseCubeFilter, setAnalyseCubeFilter] = useState<string>("");
  const initial = loadInitialTab();
  const [tab, setTab] = useState<AppTab>(initial.tab);
  // Modals für Patch-Notes + Features-Liste — State lebt hier zentral,
  // weil mehrere Trigger drauf zugreifen (Version-Badge, UserMenu, Footer).
  const [showPatches, setShowPatches] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  // Initial-Sub-Tab im Community-Tab — wird nur beim ersten Mount aus
  // dem URL-Hash gelesen (z.B. legacy #friends → friends). Spätere
  // Wechsel innerhalb des CommunityTabs leben in dessen lokalem state.
  const [communityInitial] = useState<CommunitySection | undefined>(
    initial.communityInitial,
  );

  // Tab-Wahl persistieren — localStorage + URL-Hash, damit
  // Reload + Browser-Back beide funktionieren.
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // localStorage kann blockiert sein (private mode, etc.) — egal.
    }
    // URL-Hash setzen ohne page-reload. Nur wenn wirklich anders,
    // sonst gibt es overschuessige history-einträge.
    const target = `#${tab}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [tab]);

  // Browser-Back/Forward: hash-änderung von aussen reagieren.
  useEffect(() => {
    function onHashChange() {
      const result = tabFromHash();
      if (result && result.tab !== tab) setTab(result.tab);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [tab]);

  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    // Container-Padding mobile-first: p-3 auf Phone (24px waren zu viel
    // auf 360px-Screens), p-6 ab md.
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          {/* Volles Logo (mit Schriftzug + Tagline) ersetzt den separaten
              H1+Untertitel. Klick führt zurück zum Default-Tab. Logo
              enthält den App-Namen, daher visuell-doppelt wenn man's
              danebenstellen würde. H1 mit sr-only für Screenreader + SEO.
              Höhe responsiv gestaffelt: das Logo ist ~2.56:1 breit, bei
              h-40 wären das 410px — sprengt jeden Phone-Screen. Daher
              h-16 (Phone) → h-28 (sm) → h-52 (md+, User-Wunsch 2.5x). */}
          <button
            type="button"
            onClick={() => setTab("dashboard")}
            className="flex items-center group focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg min-w-0"
            aria-label="cubetracker — Speedcubing-Solve-Tracking — zum Dashboard"
          >
            <h1 className="sr-only">cubetracker — Speedcubing-Solve-Tracking</h1>
            <img
              src="/cubetracker-logo.png"
              alt=""
              aria-hidden="true"
              className="h-16 sm:h-28 md:h-52 w-auto group-hover:opacity-90 transition-opacity"
            />
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <HealthBadge onClick={() => setShowPatches(true)} />
            {user && (
              <UserMenu
                email={user.email}
                displayName={user.display_name}
                isAdmin={user.is_admin}
                onOpenSettings={() => {
                  setTab("verwaltung");
                  // Event lässt VerwaltungTab zum Sub-Tab "settings" springen.
                  // Sub-Tab-State lebt lokal, daher kein direkter Set-Pfad —
                  // Event-Hook ist die kleinste invasive Lösung.
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent("cubetracker:goto-verwaltung-section", {
                        detail: { section: "settings" },
                      }),
                    );
                  }, 0);
                }}
                onOpenPatchNotes={() => setShowPatches(true)}
                onOpenRoadmap={() => setShowRoadmap(true)}
                onOpenFeatures={() => setShowFeatures(true)}
                onOpenFeedback={() => setShowFeedback(true)}
                onLogout={() => void logout()}
              />
            )}
          </div>
        </header>

        {user && !user.email_verified && (
          <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-200">
            ⚠ Deine Email-Adresse ist noch nicht bestätigt. Wir haben dir
            eine Verifikations-Mail geschickt — prüfe deinen Posteingang
            (auch Spam). Unter Verwaltung → Einstellungen kannst du die
            Mail erneut senden.
          </div>
        )}

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
            onSwitchToAnalyseCube={(cube) => {
              setAnalyseCubeFilter(cube);
              setTab("analyse");
            }}
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
        {tab === "community" && (
          <CommunityTab initialSection={communityInitial} />
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600">
          <span>
            {t("footer.appName")} — {t("footer.tagline")}
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setShowFeatures(true)}
            className="text-gray-500 hover:text-gray-200 underline"
          >
            {t("footer.featuresLink")}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setShowRoadmap(true)}
            className="text-gray-500 hover:text-gray-200 underline"
          >
            {t("footer.roadmapLink")}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="text-gray-500 hover:text-gray-200 underline"
          >
            {t("footer.feedbackLink")}
          </button>
          <span aria-hidden="true">·</span>
          <a
            href="/impressum"
            className="text-gray-500 hover:text-gray-200 underline"
          >
            {t("footer.imprint")}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="/datenschutz"
            className="text-gray-500 hover:text-gray-200 underline"
          >
            {t("footer.privacy")}
          </a>
          <span aria-hidden="true">·</span>
          <span>{t("footer.moreOptionsHint")}</span>
        </footer>
      </div>

      {/* Globale Toaster + Modals — bleiben auf jedem Tab sichtbar */}
      <AchievementToaster />
      <ChallengeCompletionToaster />
      <PbConfettiOverlay />
      {showPatches && <PatchNotesModal onClose={() => setShowPatches(false)} />}
      {showFeatures && (
        <FeaturesModal onClose={() => setShowFeatures(false)} />
      )}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
      {showRoadmap && (
        <RoadmapModal
          isAdmin={user?.is_admin ?? false}
          onClose={() => setShowRoadmap(false)}
        />
      )}
    </div>
  );
}

function FeaturesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            aria-label={t("health.closeAria")}
          >
            ×
          </button>
        </div>
        <FeatureListPanel />
      </div>
    </div>
  );
}

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  // W.8: spezielle URL-Routen, die OHNE Login erreichbar sein müssen
  // (Mail-Links: ResetPassword + VerifyEmail). Der Static-Host (nginx)
  // liefert index.html für alle Pfade aus (SPA-Fallback),
  // wir checken hier auf pathname.
  const pathname = window.location.pathname;
  if (pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }
  if (pathname === "/verify-email") {
    return <VerifyEmailPage />;
  }
  // Rechtsseiten — müssen OHNE Login erreichbar sein (gesetzliche Pflicht).
  if (pathname === "/impressum") {
    return <ImpressumPage />;
  }
  if (pathname === "/datenschutz") {
    return <DatenschutzPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Lädt…
      </div>
    );
  }
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  return <MainLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

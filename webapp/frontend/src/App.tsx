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
import { qk } from "./lib/queryKeys";
import { AchievementsMiniCard } from "./components/AchievementsMiniCard";
import { AchievementToaster } from "./components/AchievementToaster";
import { ActivityCard } from "./components/ActivityCard";
import { ActivityChart } from "./components/LazyCharts";
import { AnalyseFilterBar } from "./components/AnalyseFilterBar";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BigTimerInput } from "./components/BigTimerInput";
import { ChallengeCompletionToaster } from "./components/ChallengeCompletionToaster";
import { FeedbackUnreadToaster } from "./components/FeedbackUnreadToaster";
import { ToastHost } from "./components/ToastHost";
import { ChallengesMiniCard } from "./components/ChallengesMiniCard";
import { DashboardFilterBar } from "./components/DashboardFilterBar";
import { PbConfettiOverlay } from "./components/PbConfettiOverlay";
import { ScrambleCard } from "./components/ScrambleCard";
import { SessionPlanCard } from "./components/SessionPlanCard";
import { TimerControlsCard } from "./components/TimerControlsCard";
import { TouchTimerPad } from "./components/TouchTimerPad";
import { SmartCubeConnect } from "./components/SmartCubeConnect";
import { useSmartCube } from "./hooks/useSmartCube";
import { useAppSettings } from "./lib/settings";
import { useSessions } from "./lib/api";
import { HardwareCompareCard } from "./components/HardwareCompareCard";
import { HistogramChart } from "./components/LazyCharts";
import { LastSolvesPreview } from "./components/LastSolvesPreview";
import { MultiCompareCard } from "./components/MultiCompareCard";
import { RecentRecordsCard } from "./components/RecentRecordsCard";
import { NewsCard } from "./components/NewsCard";
import { FeatureListPanel } from "./components/FeatureListPanel";
import { FeedbackModal } from "./components/FeedbackModal";
import { RoadmapModal } from "./components/RoadmapModal";
import { OnboardingBanner } from "./components/OnboardingBanner";
import { WcaStatusBanner } from "./components/WcaStatusBanner";
import { PatchNotesPanel } from "./components/PatchNotesPanel";
import { UserMenu } from "./components/UserMenu";
import { ReminderCard } from "./components/ReminderCard";
import { SolveList } from "./components/SolveList";
import { CommunityTab, type CommunitySection } from "./components/CommunityTab";
import { StatsCard } from "./components/StatsCard";
import { TabBar, type AppTab } from "./components/TabBar";
import {
  ScrollableTabBar,
  type ScrollableTabItem,
} from "./components/ScrollableTabBar";
import { TrainerTab } from "./components/TrainerTab";
import { TrendsChart } from "./components/LazyCharts";
import { PbProgressionCard } from "./components/LazyCharts";
import { AdminPanel } from "./components/AdminPanel";
import { TesterPanel } from "./components/TesterPanel";
import {
  KontoDatenView,
  type KontoSection,
} from "./components/KontoDatenView";
import { WcaUpcomingCard } from "./components/WcaUpcomingCard";
import { ProfilView } from "./components/ProfilView";
import { EinstellungenView } from "./components/EinstellungenView";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
});

const TAB_STORAGE_KEY = "cubetracker.tab";

// Sub-Ansichten im Statistik-Tab (W.ia-statistik-merge, 2026-05-30):
// Übersicht = frühere Dashboard-Inhalte (Default), Detail = frühere Analyse
// (Charts + Solveliste). Drill-down von Übersicht → Detail.
export type StatistikSection = "overview" | "detail";

// Hash-Routing für Tabs (Phase L-3c). URL-Hash <-> AppTab.
// Vorteile: Browser-Back, Bookmarks, Reload landet auf gleicher Sicht.
// Bewusst einfach via window.location.hash — keine Router-Lib nötig.
const VALID_TABS: AppTab[] = [
  "timer",
  "statistik",
  "trainer",
  "community",
  // Pseudo-Tabs (über UserMenu): müssen gültige Hash-/localStorage-Werte
  // sein, damit Bookmarks (#admin) + Reload funktionieren. Der Rollen-Guard
  // in MainLayout leitet unberechtigte Zugriffe um.
  "konto",
  // profil (W.ia-profil-bereich): nach außen gerichtete Identität, auch nur
  // über das UserMenu erreichbar. Für alle User — kein Rollen-Guard nötig.
  "profil",
  // einstellungen (W.ia-einstellungen-bereich): geräte-spezifische App-
  // Präferenzen (Aussehen + Timer), eigener Bereich nur über UserMenu.
  "einstellungen",
  "admin",
  "tester",
  // verwaltung: toter Migrations-Durchgang (alter Bookmark/localStorage) —
  // der Guard leitet sofort auf admin/tester/konto um.
  "verwaltung",
];

// Backward-Compat: alte URL-Hashes mappen auf die neue Struktur + setzen
// den passenden Sub-Tab. Damit landen User mit Bookmarks/History-Einträgen
// weiter sinnvoll:
//   #friends / #leaderboard  → Community-Tab + Sub-Tab
//   #dashboard / #analyse    → Statistik-Tab (W.ia-statistik-merge):
//                              dashboard → Übersicht, analyse → Detail
const LEGACY_HASH_MAP: Record<
  string,
  { tab: AppTab; communitySub?: CommunitySection; statistikSub?: StatistikSection }
> = {
  friends: { tab: "community", communitySub: "friends" },
  leaderboard: { tab: "community", communitySub: "leaderboard" },
  dashboard: { tab: "statistik", statistikSub: "overview" },
  analyse: { tab: "statistik", statistikSub: "detail" },
};

function tabFromHash(): {
  tab: AppTab;
  communityInitial?: CommunitySection;
  statistikInitial?: StatistikSection;
} | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  // Legacy-Hashes (ganzer String, z.B. "analyse"/"friends") zuerst.
  const legacy = LEGACY_HASH_MAP[raw];
  if (legacy) {
    return {
      tab: legacy.tab,
      communityInitial: legacy.communitySub,
      statistikInitial: legacy.statistikSub,
    };
  }
  // Sub-Tab-Form #<tab>/<sub> (W.ia-subtab-routing): aktuell nur Statistik
  // (#statistik/detail). overview ist suffixlos (#statistik).
  const [top, sub] = raw.split("/");
  if (top === "statistik") {
    return {
      tab: "statistik",
      statistikInitial: sub === "detail" ? "detail" : "overview",
    };
  }
  if ((VALID_TABS as string[]).includes(top)) {
    return { tab: top as AppTab };
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
    queryKey: qk.health.all(),
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
        // W.skin-readability (2026-05-30): Opacity 10→25, Border 30→50,
        // backdrop-blur — Pill bleibt grün/violett, ist aber gegen helle
        // Skin-Hintergründe (Pixel Academy / Algorithm Lab) stabil lesbar.
        isProd
          ? "text-sm text-emerald-200 bg-emerald-500/25 border border-emerald-500/50 backdrop-blur-sm rounded px-3 py-1.5 hover:bg-emerald-500/35 cursor-pointer transition-colors"
          : "text-sm text-purple-200 bg-purple-500/25 border border-purple-500/50 backdrop-blur-sm rounded px-3 py-1.5 hover:bg-purple-500/35 cursor-pointer transition-colors"
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
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-4 md:p-6 mt-8 mb-8"
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

// W.timer-focus-mode (2026-05-28): localStorage-Key fuer den Fokus-
// Modus-Toggle. Default OFF (Bestands-User-Schutz) — wer Fokus mag,
// aktiviert es und es bleibt persistent.
const FOCUS_MODE_STORAGE_KEY = "cubetracker.timer_focus_mode";

// W.timer-display-size (2026-05-28): Reihenfolge fuer die A−/A+-
// Rotation im Fokus-Modus. Settings.timer_font_size ist eine Stufe,
// hier rotieren wir durch alle 7 Stufen.
// W.timer-display-size-v2 (2026-05-28): xxxl + xxxxl ergaenzt — User
// wollte „noch groesser", die alte XXL (8rem) reichte nicht aus.
const TIMER_FONT_SIZE_ORDER: (
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "xxl"
  | "xxxl"
  | "xxxxl"
)[] = ["sm", "md", "lg", "xl", "xxl", "xxxl", "xxxxl"];

function TimerTab({
  timerCubeType,
  setTimerCubeType,
}: {
  timerCubeType: string;
  setTimerCubeType: (s: string) => void;
}) {
  const { t } = useTranslation();
  // TIMER hat keine externe Filter-Leiste — Cube/Session/Hardware
  // werden in der TimerControlsCard gewählt.
  // Welle 2 (2026-05-16): hardwareId aus BigTimerInput hochgezogen, damit
  // die Controls UNTER dem TouchPad als eigene Karte leben können ohne
  // dass die Hardware-Auswahl mit dem Save-Pfad in BigTimerInput auseinander
  // fallt.
  const [timerSessionId, setTimerSessionId] = useState<number | null>(null);
  const [timerHardwareId, setTimerHardwareId] = useState<number | null>(null);
  // W.timer-focus-mode: blendet Live-/Letzte-Solves + SessionPlan +
  // TimerControlsCard aus, damit Scramble + Timer-Display den ganzen
  // Bildschirm nutzen. Persistent via localStorage.
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_MODE_STORAGE_KEY, focusMode ? "1" : "0");
    } catch {
      /* ignore — Private-Mode oder Quota voll */
    }
  }, [focusMode]);

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
  // W.timer-display-size: setSettings hochgezogen, damit die +/-Buttons
  // im Fokus-Modus die timer_font_size rotieren koennen.
  const [settings, setSettings] = useAppSettings();
  const showTouchPad = settings.spacebar_enabled;
  // Stufen-Rotation fuer A−/A+ im Fokus-Modus.
  const fontSizeIdx = TIMER_FONT_SIZE_ORDER.indexOf(settings.timer_font_size);
  const canShrink = fontSizeIdx > 0;
  const canGrow = fontSizeIdx < TIMER_FONT_SIZE_ORDER.length - 1;
  function bumpFontSize(direction: "up" | "down") {
    const nextIdx =
      direction === "up" ? fontSizeIdx + 1 : fontSizeIdx - 1;
    if (nextIdx < 0 || nextIdx >= TIMER_FONT_SIZE_ORDER.length) return;
    setSettings({
      ...settings,
      timer_font_size: TIMER_FONT_SIZE_ORDER[nextIdx],
    });
  }

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

  // W.timer-focus-mode: Toggle-Button rechtsbuendig ueber dem Layout.
  // Im Fokus-Modus: aside (Live/Letzte-Solves) + SessionPlanCard +
  // TimerControlsCard weg, Layout einspaltig — Scramble + Timer-Display
  // + (TouchPad) bekommen den ganzen Bildschirm.
  const focusToggle = (
    <div className="flex justify-end mb-2 gap-2 items-center">
      {/* W.timer-display-size: A−/A+ Buttons rotieren timer_font_size
          durch 7 Stufen (sm → 4XL). Eigene Card mit Border, Label-Pill
          in der Mitte. v3 (W.timer-polish-pbs 2026-05-28): jetzt auch
          in der vollen Ansicht sichtbar (vorher nur Fokus-Modus, User-
          Wunsch). */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-gray-900/60 p-1.5 shadow-sm">
          <span
            className="text-[11px] text-purple-300/80 uppercase tracking-wider px-2"
            aria-hidden="true"
          >
            {t("timerTab.fontSizeLabel")}
          </span>
          <button
            type="button"
            onClick={() => bumpFontSize("down")}
            disabled={!canShrink}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-700 bg-gray-800 text-base font-semibold text-gray-200 hover:bg-purple-700/40 hover:text-white hover:border-purple-500/60 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-200 disabled:hover:border-gray-700"
            title={t("timerTab.fontSizeShrinkTitle")}
            aria-label={t("timerTab.fontSizeShrinkAria")}
          >
            A−
          </button>
          <span
            className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-100 text-xs font-mono font-semibold min-w-[3.5rem] text-center"
            aria-live="polite"
          >
            {settings.timer_font_size.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => bumpFontSize("up")}
            disabled={!canGrow}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-700 bg-gray-800 text-base font-semibold text-gray-200 hover:bg-purple-700/40 hover:text-white hover:border-purple-500/60 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-200 disabled:hover:border-gray-700"
            title={t("timerTab.fontSizeGrowTitle")}
            aria-label={t("timerTab.fontSizeGrowAria")}
          >
            A+
          </button>
        </div>
      <button
        type="button"
        onClick={() => setFocusMode((v) => !v)}
        className={`text-xs rounded px-3 py-1.5 border transition-colors ${
          focusMode
            ? "border-purple-500/50 bg-purple-600/30 text-purple-100 hover:bg-purple-600/50"
            : "border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700/80 hover:text-gray-100"
        }`}
        title={
          focusMode
            ? t("timerTab.focusToggleOffTitle")
            : t("timerTab.focusToggleOnTitle")
        }
        aria-pressed={focusMode}
      >
        {focusMode
          ? t("timerTab.focusToggleOff")
          : t("timerTab.focusToggleOn")}
      </button>
    </div>
  );

  return (
    // Layout: Desktop = Live/Letzte-Solves links (420px), Solving rechts.
    // DOM-Reihenfolge im main = mobile-visuelle Reihenfolge (Welle 2,
    // 2026-05-16, User-Wunsch): Scramble direkt über Timer-Display,
    // dann TouchPad ("Tippen & halten"), erst danach die Selektoren —
    // weil man die nur selten während des Solvens braucht. SessionPlan
    // ganz oben weil's eine optionale Trainings-Karte ist.
    // Auf lg dreht `lg:order-1/2` nur die zwei Hauptspalten um (aside
    // links, main rechts) — die DOM-Reihenfolge bleibt a11y-korrekt.
    // W.timer-focus-mode: Wenn focusMode → einspaltig, aside + Sub-Cards
    // ausgeblendet.
    <div>
      {focusToggle}
      <div
        className={
          focusMode
            ? "grid grid-cols-1 gap-6"
            : "grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6"
        }
      >
        <main className={focusMode ? "space-y-4" : "lg:order-2 space-y-4"}>
          {!focusMode && (
            <SessionPlanCard
              cubeType={timerCubeType}
              sessionId={timerSessionId}
            />
          )}
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
          {/* W.pre-demo-fixes (2026-05-29): SmartCubeConnect-Block liegt
              direkt unter dem Timer-Display — auch im Fokus-Modus sichtbar.
              User-Wunsch: wer im Fokus solven will, soll den Verbindungs-
              Status + Move-Counter weiter sehen koennen. */}
          <SmartCubeConnectBlock />
          {/* TouchTimerPad rendert auf Desktop immer null — auf Phone nur
              sichtbar wenn Spacebar-Modus aktiv ist (Text-Mode = Soft-Tastatur,
              da gibt es nichts zu triggern). */}
          {showTouchPad && <TouchTimerPad />}
          {!focusMode && (
            <TimerControlsCard
              cubeType={timerCubeType}
              onCubeTypeChange={setTimerCubeType}
              sessionId={timerSessionId}
              onSessionIdChange={setTimerSessionId}
              hardwareId={timerHardwareId}
              onHardwareIdChange={setTimerHardwareId}
            />
          )}
        </main>
        {!focusMode && (
          <aside className="lg:order-1">
            <LastSolvesPreview
              cubeType={timerCubeType}
              sessionId={timerSessionId}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// W.gan-cube-auto-time-v2: Wrapper damit der useSmartCube-Hook in
// TimerTab nicht die ganze Card bei jedem MOVE-Event re-rendert —
// nur dieser Block re-rendert. W.smart-cube-position-restore
// (2026-05-28): Position wieder unter TimerControlsCard, im Fokus-
// Modus damit ausgeblendet (vor-Demo-Polish).
function SmartCubeConnectBlock() {
  const { state, connect, disconnect, prepareForSolve, stopSolve, isSupported } =
    useSmartCube();
  return (
    <SmartCubeConnect
      state={state}
      connect={connect}
      disconnect={disconnect}
      prepareForSolve={prepareForSolve}
      stopSolve={stopSolve}
      isSupported={isSupported}
    />
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
        {/* W.ia-profil-bereich: WcaProfileCard ist ins „Profil" (UserMenu)
            umgezogen — das offizielle WCA-Profil ist Identität, kein Dashboard-
            Inhalt. Hier bleiben die discover-orientierten Welt-Karten:
            kommende Turniere in der Nähe + News. */}
        <div className="space-y-4">
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
      {/* W.skin-readability-headings (2026-05-30): inline-Pille mit
          semi-deckendem bg + backdrop-blur, sodass das Heading auch auf
          hellen Skin-Bereichen (z.B. Codex Vitruvian Pergament) stabil
          lesbar ist. Pille bleibt dezent (text-xs, schmaler Pad), die
          Karten unten dominieren weiterhin. */}
      <h2
        id={id}
        className="inline-block rounded-md bg-gray-900/55 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-purple-200"
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
// StatistikTab — vereint Dashboard (Übersicht) + Analyse (Detail)
// ============================================================

/**
 * Statistik-Tab (W.ia-statistik-merge, 2026-05-30): führt die früheren
 * Tabs Dashboard + Analyse unter einem Dach zusammen. Sub-Nav schaltet
 * zwischen Übersicht (Tagesform + Stats, Default) und Detail (Charts +
 * volle Solveliste). Drill-down: ein Klick auf einen Cube in der Übersicht
 * springt direkt in die Detail-Ansicht mit gesetztem Cube-Filter (ersetzt
 * den früheren Tab-Sprung Dashboard → Analyse).
 *
 * State bleibt bewusst in MainLayout (durchgereicht) — so überlebt der
 * jeweilige Filter einen Tab-Wechsel; Übersicht- und Detail-Filter sind
 * unabhängig. Auch die Sub-Ansicht (section) ist seit W.ia-subtab-routing
 * controlled (in MainLayout), damit sie im URL-Hash #statistik/detail
 * bookmarkbar ist + auf Browser-Back reagiert.
 */
function StatistikTab({
  overviewSessionId,
  setOverviewSessionId,
  detailSessionId,
  setDetailSessionId,
  detailCubeFilter,
  setDetailCubeFilter,
  onSwitchTab,
  section,
  onSectionChange,
}: {
  overviewSessionId: number | null;
  setOverviewSessionId: (id: number | null) => void;
  detailSessionId: number | null;
  setDetailSessionId: (id: number | null) => void;
  detailCubeFilter: string;
  setDetailCubeFilter: (s: string) => void;
  onSwitchTab: (tab: AppTab) => void;
  section: StatistikSection;
  onSectionChange: (s: StatistikSection) => void;
}) {
  const { t } = useTranslation();

  const subTabs: ScrollableTabItem[] = [
    { id: "overview", label: t("statistikTab.subTabOverview"), icon: "📊" },
    { id: "detail", label: t("statistikTab.subTabDetail"), icon: "📈" },
  ];

  // Drill-down aus der Übersicht: Klick auf einen Cube → Detail mit Filter.
  const drillToDetail = (cube: string) => {
    setDetailCubeFilter(cube);
    onSectionChange("detail");
  };

  return (
    <div className="space-y-4">
      <ScrollableTabBar
        tabs={subTabs}
        current={section}
        onChange={(id) => onSectionChange(id as StatistikSection)}
        ariaLabel={t("statistikTab.ariaLabel")}
        size="md"
      />

      {section === "overview" ? (
        <DashboardTab
          sessionId={overviewSessionId}
          setSessionId={setOverviewSessionId}
          onSwitchTab={onSwitchTab}
          onSwitchToAnalyseCube={drillToDetail}
        />
      ) : (
        <AnalyseTab
          sessionId={detailSessionId}
          setSessionId={setDetailSessionId}
          cubeFilter={detailCubeFilter}
          setCubeFilter={setDetailCubeFilter}
        />
      )}
    </div>
  );
}

// ============================================================
// MainLayout
// ============================================================

function loadInitialTab(): {
  tab: AppTab;
  communityInitial?: CommunitySection;
  statistikInitial?: StatistikSection;
} {
  if (typeof window === "undefined") return { tab: "statistik" };
  // Prio 1: URL-Hash (z.B. #statistik) — Bookmark/Reload-Wahl
  const fromHash = tabFromHash();
  if (fromHash) return fromHash;
  // Prio 2: localStorage (zuletzt genutzt)
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  // localStorage-Migration (W.ia-statistik-merge): Bestands-User haben evtl.
  // noch die alten Tab-IDs gespeichert. Sauber auf den Statistik-Tab umleiten,
  // sonst landen sie auf einem toten Tab. dashboard → Übersicht, analyse →
  // Detail. Selbstheilend: beim nächsten Tab-Wechsel wird "statistik" persistiert.
  if (stored === "dashboard")
    return { tab: "statistik", statistikInitial: "overview" };
  if (stored === "analyse")
    return { tab: "statistik", statistikInitial: "detail" };
  if ((VALID_TABS as string[]).includes(stored ?? "")) {
    return { tab: stored as AppTab };
  }
  return { tab: "statistik" };
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
  // loadInitialTab einmalig beim Mount (lazy useState-Init) — liest
  // localStorage + URL-Hash. Bewusst NICHT im Render-Body aufrufen, sonst
  // läuft der I/O bei jedem Re-Render von MainLayout (QA W.ia-statistik-merge).
  const [initial] = useState(loadInitialTab);
  const [tab, setTab] = useState<AppTab>(initial.tab);
  // Ref auf den aktuellen Tab: (1) der hashchange-Listener liest ihn frisch
  // ohne Effect-Neuregistrierung (kein Stale-Closure-Race); (2) der Persist-
  // Effect erkennt damit Top- vs. Sub-Tab-Wechsel (Sub → pushState, Browser-
  // Back-fähig; Top → replaceState, kein History-Spam zwischen Haupt-Tabs).
  const tabRef = useRef(tab);
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
  // Aktive Sub-Ansicht im Statistik-Tab. CONTROLLED hier in MainLayout (wie
  // kontoSection), damit der URL-Hash #statistik/detail zentral synchron
  // bleibt (W.ia-subtab-routing) — bookmarkbar + Browser-Back. Initial aus
  // Hash bzw. localStorage-Migration (legacy #analyse → detail).
  const [statistikSection, setStatistikSection] = useState<StatistikSection>(
    initial.statistikInitial ?? "overview",
  );
  // Aktive Sektion der „Konto & Daten"-Ansicht (W.ia-konto-usermenu).
  // CONTROLLED hier in MainLayout, damit Direkt-Sprünge (UserMenu,
  // FeedbackUnreadToaster, OnboardingBanner) über den globalen
  // goto-konto-section-Listener sicher die richtige Sektion setzen.
  const [kontoSection, setKontoSection] = useState<KontoSection>("sessions");
  // Auth früh holen — steuert die rollensichtbaren UserMenu-Bereiche
  // (Admin/Tester) + die Migration eines alten "verwaltung"-Tab-Zustands.
  const { user, logout } = useAuth();

  // Tab-Wahl persistieren — localStorage + URL-Hash, damit
  // Reload + Browser-Back beide funktionieren.
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // localStorage kann blockiert sein (private mode, etc.) — egal.
    }
    // URL-Hash setzen ohne page-reload. Sub-Tab im Hash für Statistik
    // (W.ia-subtab-routing): #statistik/detail ist bookmarkbar; overview
    // bleibt suffixlos (#statistik).
    const target =
      tab === "statistik" && statistikSection === "detail"
        ? "#statistik/detail"
        : `#${tab}`;
    if (window.location.hash !== target) {
      // Sub-Tab-Wechsel (Top-Tab unverändert) → pushState, damit Browser-Back
      // zwischen Übersicht/Detail wechselt. Top-Tab-Wechsel → replaceState,
      // sonst sammeln sich überflüssige History-Einträge zwischen Haupt-Tabs.
      if (tabRef.current === tab) {
        window.history.pushState(null, "", target);
      } else {
        window.history.replaceState(null, "", target);
      }
    }
    tabRef.current = tab;
  }, [tab, statistikSection]);

  // Browser-Back/Forward: hash-änderung von aussen reagieren — inkl. Sub-Tab
  // (W.ia-subtab-routing). Behebt die frühere Grenze: ein Sprung zu
  // #statistik/detail während man schon auf Statistik ist, setzt jetzt die
  // Sub-Ansicht (vorher blieb sie stehen, weil statistikInitial nach dem
  // Mount eingefroren war).
  useEffect(() => {
    function onHashChange() {
      const result = tabFromHash();
      if (!result) return;
      // tabRef statt Closure-tab → frischer Wert, keine Stale-Closure-Race;
      // Listener wird nur einmal registriert (deps []).
      if (result.tab !== tabRef.current) setTab(result.tab);
      if (result.tab === "statistik" && result.statistikInitial) {
        setStatistikSection(result.statistikInitial);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // W.feedback-admin-tester-improvements (2026-05-28): globaler
  // Custom-Event-Listener fuer „+ Feedback"-Buttons im AdminFeedback-
  // InboxPanel und TesterPanel. So koennen tief verschachtelte
  // Komponenten das zentrale FeedbackModal triggern ohne Props-Drilling.
  // Pattern analog `cubetracker:goto-konto-section` (W.ia-konto-usermenu).
  useEffect(() => {
    function onOpenFeedback() {
      setShowFeedback(true);
    }
    window.addEventListener(
      "cubetracker:open-feedback-modal",
      onOpenFeedback,
    );
    return () =>
      window.removeEventListener(
        "cubetracker:open-feedback-modal",
        onOpenFeedback,
      );
  }, []);

  // W.ia-konto-usermenu (2026-05-31): globaler Listener für Sprünge in die
  // „Konto & Daten"-Ansicht. MainLayout ist immer gemountet → kein Event-
  // Timing-Problem (anders als beim früheren VerwaltungTab-lokalen Listener).
  // Quellen: FeedbackUnreadToaster (→ daten), OnboardingBanner (→ daten/
  // hardware), künftige Direkt-Links.
  useEffect(() => {
    function onGotoKonto(e: Event) {
      const target = (e as CustomEvent<{ section?: string }>).detail?.section;
      const valid: KontoSection[] = [
        "sessions",
        "hardware",
        "daten",
        "outliers",
        "sicherheit",
      ];
      setTab("konto");
      if (target && (valid as string[]).includes(target)) {
        setKontoSection(target as KontoSection);
      }
    }
    window.addEventListener("cubetracker:goto-konto-section", onGotoKonto);
    return () =>
      window.removeEventListener("cubetracker:goto-konto-section", onGotoKonto);
  }, []);

  // Tab-Zugriffs-Guards (W.ia-admin-bereich), greifen sobald user geladen ist:
  //  - "verwaltung" gibt es nicht mehr (Bestands-localStorage/Hash) → auf den
  //    passenden Bereich umleiten (Admin→admin, Tester→tester, sonst konto).
  //  - admin/tester sind rollengated → wer ohne Berechtigung dort landet
  //    (alter Bookmark, manueller #admin-Hash), wird auf statistik geleitet,
  //    sonst bliebe die Seite leer (kein Render-Block + TabBar ausgeblendet).
  useEffect(() => {
    if (!user) return;
    if (tab === "verwaltung") {
      if (user.is_admin) setTab("admin");
      else if (user.is_tester) setTab("tester");
      else setTab("konto");
    } else if (tab === "admin" && !user.is_admin) {
      setTab("statistik");
    } else if (tab === "tester" && !(user.is_tester && !user.is_admin)) {
      // Ein Admin mit altem #tester-Zustand gehört in den Admin-Bereich
      // (der die Tester-Werkzeuge mitenthält), nicht auf Statistik.
      setTab(user.is_admin ? "admin" : "statistik");
    }
  }, [tab, user]);

  const { t } = useTranslation();

  return (
    // Container-Padding mobile-first: p-3 auf Phone (24px waren zu viel
    // auf 360px-Screens), p-6 ab md.
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="cubetracker-app-header flex items-center justify-between mb-6 gap-4 flex-wrap">
          {/* Volles Logo (mit Schriftzug + Tagline) ersetzt den separaten
              H1+Untertitel. Klick führt zurück zum Default-Tab. Logo
              enthält den App-Namen, daher visuell-doppelt wenn man's
              danebenstellen würde. H1 mit sr-only für Screenreader + SEO.
              Höhe responsiv gestaffelt: das Logo ist ~2.56:1 breit, bei
              h-40 wären das 410px — sprengt jeden Phone-Screen. Daher
              h-16 (Phone) → h-28 (sm) → h-52 (md+, User-Wunsch 2.5x). */}
          <button
            type="button"
            onClick={() => setTab("statistik")}
            className="cubetracker-app-logo-button flex items-center group focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg min-w-0"
            aria-label="cubetracker — Speedcubing-Solve-Tracking — zur Statistik"
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
            {/* HealthBadge (Version + PatchNotes-Zugang) auf Phone
                ausblenden — PatchNotes ist dort via UserMenu erreichbar.
                Sprache + alle weiteren Optionen leben seit W.ia-nav-
                entdopplung kanonisch im UserMenu (keine Header-Dopplung mehr). */}
            <div className="hidden md:flex items-center gap-3">
              <HealthBadge onClick={() => setShowPatches(true)} />
            </div>
            {user && (
              <UserMenu
                email={user.email}
                displayName={user.display_name}
                isAdmin={user.is_admin}
                isTester={user.is_tester}
                onOpenProfil={() => setTab("profil")}
                onOpenKonto={() => setTab("konto")}
                onOpenSettings={() => setTab("einstellungen")}
                onOpenAdmin={() => setTab("admin")}
                onOpenTester={() => setTab("tester")}
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
            ⚠ {t("auth.emailNotVerifiedBanner")}
          </div>
        )}

        <WcaStatusBanner />

        <OnboardingBanner onSwitchTab={setTab} />

        {/* TabBar im „konto"-Pseudo-Tab ausblenden (W.ia-konto-usermenu):
            „konto" ist nicht in der Leiste, sonst wäre kein Tab aktiv
            hervorgehoben (verwirrend). KontoDatenView zeigt stattdessen
            einen eigenen Header mit Zurück-Button. */}
        {tab !== "konto" &&
          tab !== "profil" &&
          tab !== "einstellungen" &&
          tab !== "admin" &&
          tab !== "tester" && <TabBar current={tab} onChange={setTab} />}

        {tab === "timer" && (
          <TimerTab
            timerCubeType={timerCubeType}
            setTimerCubeType={setTimerCubeType}
          />
        )}
        {tab === "statistik" && (
          <StatistikTab
            overviewSessionId={dashboardSessionId}
            setOverviewSessionId={setDashboardSessionId}
            detailSessionId={analyseSessionId}
            setDetailSessionId={setAnalyseSessionId}
            detailCubeFilter={analyseCubeFilter}
            setDetailCubeFilter={setAnalyseCubeFilter}
            onSwitchTab={setTab}
            section={statistikSection}
            onSectionChange={setStatistikSection}
          />
        )}
        {tab === "konto" && (
          <KontoDatenView
            section={kontoSection}
            onSectionChange={setKontoSection}
            onBack={() => setTab("statistik")}
          />
        )}
        {tab === "profil" && <ProfilView onBack={() => setTab("statistik")} />}
        {tab === "einstellungen" && (
          <EinstellungenView onBack={() => setTab("statistik")} />
        )}
        {tab === "admin" && user?.is_admin && (
          <AdminPanel onBack={() => setTab("statistik")} />
        )}
        {tab === "tester" && user?.is_tester && !user?.is_admin && (
          <TesterPanel onBack={() => setTab("statistik")} />
        )}
        {tab === "trainer" && <TrainerTab />}
        {tab === "community" && (
          <CommunityTab initialSection={communityInitial} />
        )}

        {/* W.skin-readability (2026-05-30): text-gray-400/300 + drop-shadow
            damit der Footer auf hellen Skin-Bereichen (Pixel Academy,
            Algorithm Lab) lesbar bleibt. Pattern analog LoginPage-Footer
            (der hatte das schon). Punkte (·) bleiben gray-500 (zurueck-
            haltend, kein drop-shadow noetig — ist ein Glyph zwischen
            Links, nicht informativ). */}
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-200 drop-shadow-md">
          <span>
            {t("footer.appName")} — {t("footer.tagline")}
          </span>
          <span aria-hidden="true" className="text-gray-500">·</span>
          <a
            href="/impressum"
            className="text-gray-100 hover:text-white underline drop-shadow-sm"
          >
            {t("footer.imprint")}
          </a>
          <span aria-hidden="true" className="text-gray-500">·</span>
          <a
            href="/datenschutz"
            className="text-gray-100 hover:text-white underline drop-shadow-sm"
          >
            {t("footer.privacy")}
          </a>
          <span aria-hidden="true" className="text-gray-500">·</span>
          <span>{t("footer.moreOptionsHint")}</span>
        </footer>
      </div>

      {/* Globale Toaster + Modals — bleiben auf jedem Tab sichtbar.
          Die 3 Spezial-Toaster sind seit W.toast-manager (2026-05-30)
          pure Listener (null-rendering); der eigentliche Render-Layer
          ist <ToastHost />. */}
      <ToastHost />
      <AchievementToaster />
      <ChallengeCompletionToaster />
      <PbConfettiOverlay />
      <FeedbackUnreadToaster />
      {showPatches && <PatchNotesModal onClose={() => setShowPatches(false)} />}
      {showFeatures && (
        <FeaturesModal onClose={() => setShowFeatures(false)} />
      )}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
      {showRoadmap && (
        <RoadmapModal onClose={() => setShowRoadmap(false)} />
      )}
    </div>
  );
}

function FeaturesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  // W.feature-curation (2026-05-29): Toggle zwischen kuratierter
  // Public-Sicht (Default) und Expanded-Sicht (+ Detail-Bullets).
  const [showExpanded, setShowExpanded] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-purple-500/40 bg-gray-900 p-4 md:p-6 mt-8 mb-8"
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
        <FeatureListPanel
          audienceFilter={showExpanded ? "expanded" : "public"}
        />
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowExpanded((v) => !v)}
            className="text-sm text-purple-300 hover:text-purple-200 underline focus:outline-none focus:ring-2 focus:ring-purple-400 rounded px-2 py-1"
          >
            {showExpanded
              ? t("features.showFewer")
              : t("features.showMore")}
          </button>
        </div>
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
        {/* W.skin-cyberpunk-mvp: Background-Skin-Layer hinter App-Content.
         * Liegt VOR AuthGuard damit auch die LoginPage den Skin zeigt
         * (Wow-Moment fuer neue User die sich gerade registrieren).
         * Skin "none" (Default) rendert null — keine Kosten. */}
        <BackgroundLayer />
        <AuthGuard />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

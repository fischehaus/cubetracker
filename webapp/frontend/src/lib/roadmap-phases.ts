// Roadmap-Phase-Meta (Phase W.roadmap-modal-api, 2026-05-28).
//
// Phasen-Strukturen (P1..P6) sind stabil über lange Zeit — pflegen
// wir clientseitig als Konstante mit i18n-Keys statt jeden Phase-
// Titel in der DB zu haben.
//
// Items (innerhalb einer Phase) sind dynamisch und kommen aus der DB
// via useRoadmap-Hook (siehe lib/api.ts).
//
// Wenn eine neue Phase dazukommt: hier ergänzen + Locale-Keys in
// roadmap.phases.* ergänzen + Backend RoadmapPhaseIdLiteral
// (webapp/db/schemas.py) erweitern.

export type PhaseStatus = "active" | "planned" | "future" | "ongoing" | "done";

export interface RoadmapPhaseMeta {
  id: string; // "P1" - "P6"
  status: PhaseStatus;
  titleKey: string; // i18n key, z.B. "roadmap.phases.p1Title"
  summaryKey: string;
  timeframeKey: string;
}

export const ROADMAP_PHASES_META: RoadmapPhaseMeta[] = [
  {
    id: "P1",
    status: "active",
    titleKey: "roadmap.phases.p1Title",
    summaryKey: "roadmap.phases.p1Summary",
    timeframeKey: "roadmap.phases.p1Timeframe",
  },
  {
    id: "P2",
    status: "done",
    titleKey: "roadmap.phases.p2Title",
    summaryKey: "roadmap.phases.p2Summary",
    timeframeKey: "roadmap.phases.p2Timeframe",
  },
  {
    id: "P3",
    status: "future",
    titleKey: "roadmap.phases.p3Title",
    summaryKey: "roadmap.phases.p3Summary",
    timeframeKey: "roadmap.phases.p3Timeframe",
  },
  {
    id: "P4",
    status: "future",
    titleKey: "roadmap.phases.p4Title",
    summaryKey: "roadmap.phases.p4Summary",
    timeframeKey: "roadmap.phases.p4Timeframe",
  },
  {
    id: "P5",
    status: "future",
    titleKey: "roadmap.phases.p5Title",
    summaryKey: "roadmap.phases.p5Summary",
    timeframeKey: "roadmap.phases.p5Timeframe",
  },
  {
    id: "P6",
    status: "ongoing",
    titleKey: "roadmap.phases.p6Title",
    summaryKey: "roadmap.phases.p6Summary",
    timeframeKey: "roadmap.phases.p6Timeframe",
  },
];

// Farben pro Phase-Status für Badge + Border. UI-Convention,
// nicht i18n-relevant.
export const PHASE_STATUS_COLORS: Record<
  PhaseStatus,
  { border: string; badge: string }
> = {
  active: {
    border: "border-purple-500/40",
    badge: "bg-purple-600 text-white",
  },
  planned: {
    border: "border-amber-500/30",
    badge: "bg-amber-600/40 text-amber-100",
  },
  future: {
    border: "border-gray-700",
    badge: "bg-gray-700 text-gray-300",
  },
  ongoing: {
    border: "border-blue-500/30",
    badge: "bg-blue-600/40 text-blue-100",
  },
  done: {
    border: "border-emerald-500/30",
    badge: "bg-emerald-600/50 text-emerald-100",
  },
};

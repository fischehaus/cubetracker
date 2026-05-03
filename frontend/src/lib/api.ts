// API-Layer: axios-Setup + Tanstack-Query-Hooks fuer alle Solve+Session-Endpoints.

import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  AchievementItem,
  Hardware,
  HardwareCreate,
  HardwareUpdate,
  Session,
  SessionCreate,
  SessionUpdate,
  Solve,
  SolveCreate,
  SolveUpdate,
} from "./types";

export const api = axios.create({
  baseURL: "http://localhost:8000",
});

// ============================================================
// Achievement-Toast-Pub-Sub (Phase 7a)
// ============================================================
//
// Backend setzt nach Mutationen den Header X-Achievements-Unlocked
// mit kommagetrennten codes. Wir lesen das im response-interceptor
// und feuern an Listener (z.B. Toast-Provider).

type AchievementListener = (codes: string[]) => void;
const achievementListeners: Set<AchievementListener> = new Set();

export function onAchievementUnlocked(fn: AchievementListener): () => void {
  achievementListeners.add(fn);
  return () => achievementListeners.delete(fn);
}

api.interceptors.response.use((response) => {
  const header = response.headers["x-achievements-unlocked"] as
    | string
    | undefined;
  if (header) {
    const codes = header.split(",").map((c) => c.trim()).filter(Boolean);
    if (codes.length > 0) {
      achievementListeners.forEach((fn) => fn(codes));
    }
  }
  return response;
});

// ============================================================
// Solves
// ============================================================

export interface SolveListParams {
  cube_type?: string;
  session_id?: number;
  limit?: number;
  offset?: number;
}

export function useSolves(params: SolveListParams = {}): UseQueryResult<Solve[]> {
  return useQuery({
    queryKey: ["solves", params],
    queryFn: async (): Promise<Solve[]> => {
      const r = await api.get<Solve[]>("/solves", { params });
      return r.data;
    },
  });
}

export function useCreateSolve(): UseMutationResult<Solve, Error, SolveCreate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SolveCreate): Promise<Solve> => {
      const r = await api.post<Solve>("/solves", payload);
      return r.data;
    },
    onSuccess: () => {
      // Solves UND alle Stats-Varianten invalidieren — sonst zeigen
      // StatsCard, MultiCubeCompareCard, OutlierCard, ActivityCard,
      // ActivityChart veraltete Werte nach +2/DNF-Toggle, Create oder Delete.
      // Auch suggest-queries (most-used) sind betroffen.
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-by-session"] });
      qc.invalidateQueries({ queryKey: ["stats-by-hardware"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
      qc.invalidateQueries({ queryKey: ["sessions-suggest"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useUpdateSolve(): UseMutationResult<
  Solve,
  Error,
  { id: number; payload: SolveUpdate }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const r = await api.patch<Solve>(`/solves/${id}`, payload);
      return r.data;
    },
    onSuccess: () => {
      // Solves UND alle Stats-Varianten invalidieren — sonst zeigen
      // StatsCard, MultiCubeCompareCard, OutlierCard, ActivityCard,
      // ActivityChart veraltete Werte nach +2/DNF-Toggle, Create oder Delete.
      // Auch suggest-queries (most-used) sind betroffen.
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-by-session"] });
      qc.invalidateQueries({ queryKey: ["stats-by-hardware"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
      qc.invalidateQueries({ queryKey: ["sessions-suggest"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useDeleteSolve(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/solves/${id}`);
    },
    onSuccess: () => {
      // Solves UND alle Stats-Varianten invalidieren — sonst zeigen
      // StatsCard, MultiCubeCompareCard, OutlierCard, ActivityCard,
      // ActivityChart veraltete Werte nach +2/DNF-Toggle, Create oder Delete.
      // Auch suggest-queries (most-used) sind betroffen.
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-by-session"] });
      qc.invalidateQueries({ queryKey: ["stats-by-hardware"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
      qc.invalidateQueries({ queryKey: ["sessions-suggest"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

// ============================================================
// Stats
// ============================================================

export interface StatsResponse {
  count: number;
  count_valid: number;
  count_dnf: number;
  best_ms: number | null;
  best_solve_id: number | null;
  worst_ms: number | null;
  worst_solve_id: number | null;
  mean_ms: number | null;
  current_ao5: number | null;
  current_ao12: number | null;
  current_ao100: number | null;
  best_ao5: number | null;
  best_ao12: number | null;
  best_ao100: number | null;
  filter: { cube_type: string | null; session_id: number | null };
}

export interface StatsParams {
  cube_type?: string;
  session_id?: number;
}

export function useStats(params: StatsParams = {}): UseQueryResult<StatsResponse> {
  return useQuery({
    queryKey: ["stats", params],
    queryFn: async (): Promise<StatsResponse> => {
      const r = await api.get<StatsResponse>("/stats", { params });
      return r.data;
    },
  });
}

// ============================================================
// Stats by Cube (F11 — Multi-Cube-Vergleich)
// ============================================================

export interface CubeStats {
  cube_type: string;
  count: number;
  count_valid: number;
  current_ao5: number | null;
  mean_ms: number | null;
  best_ms: number | null;
  /** current_ao5 / mean_ms (lifetime) — verzerrt durch Lernkurve */
  form_factor: number | null;
  /** current_ao5 / mean(letzte 100) — Tagesform, ehrlicher */
  form_factor_recent: number | null;
  /** F12: Mittel(letzte 50) - Mittel(davor 50), in ms. Negativ = besser */
  improvement_ms: number | null;
  /** F12: relative Verbesserung (negativ = besser) */
  improvement_pct: number | null;
  /** F13: ISO-Timestamp des letzten Solves */
  last_solve_at: string | null;
  /** F13: Tage seit dem letzten Solve dieses Cubes */
  days_since_last: number | null;
}

export interface StatsByCubeResponse {
  cubes: CubeStats[];
  filter: { session_id: number | null };
}

// ============================================================
// Stats by Session (Phase 6 — Multi-Session-Vergleich)
// ============================================================

export interface SessionStats {
  session_id: number;
  session_name: string;
  count: number;
  count_valid: number;
  current_ao5: number | null;
  mean_ms: number | null;
  best_ms: number | null;
  form_factor: number | null;
  form_factor_recent: number | null;
  last_solve_at: string | null;
  days_since_last: number | null;
}

export interface StatsBySessionResponse {
  filter: { cube_type: string | null };
  sessions: SessionStats[];
}

export function useStatsBySession(
  cubeType: string | undefined
): UseQueryResult<StatsBySessionResponse> {
  const params: Record<string, string> = {};
  if (cubeType) params.cube_type = cubeType;
  return useQuery({
    queryKey: ["stats-by-session", params],
    queryFn: async (): Promise<StatsBySessionResponse> => {
      const r = await api.get<StatsBySessionResponse>("/stats/by-session", {
        params,
      });
      return r.data;
    },
  });
}

// ============================================================
// Stats by Hardware (Phase 5d — Hardware-Performance-Vergleich)
// ============================================================

export interface HardwareCubeStats {
  hardware_id: number | null;
  hardware_name: string;
  count: number;
  count_valid: number;
  mean_ms: number | null;
  best_ms: number | null;
  current_ao5: number | null;
  best_ao5: number | null;
  current_ao12: number | null;
  best_ao12: number | null;
}

export interface StatsByHardwareResponse {
  cube_type: string;
  filter: { session_id: number | null };
  hardware: HardwareCubeStats[];
}

export function useStatsByHardware(
  cubeType: string | undefined,
  sessionId: number | null
): UseQueryResult<StatsByHardwareResponse> {
  const params: Record<string, string | number> = {};
  if (cubeType) params.cube_type = cubeType;
  if (sessionId !== null) params.session_id = sessionId;
  return useQuery({
    queryKey: ["stats-by-hardware", params],
    queryFn: async (): Promise<StatsByHardwareResponse> => {
      const r = await api.get<StatsByHardwareResponse>("/stats/by-hardware", {
        params,
      });
      return r.data;
    },
    enabled: !!cubeType,
  });
}

export function useStatsByCube(
  sessionId: number | null
): UseQueryResult<StatsByCubeResponse> {
  const params: { session_id?: number } = {};
  if (sessionId !== null) params.session_id = sessionId;
  return useQuery({
    queryKey: ["stats-by-cube", params],
    queryFn: async (): Promise<StatsByCubeResponse> => {
      const r = await api.get<StatsByCubeResponse>("/stats/by-cube", { params });
      return r.data;
    },
  });
}

// ============================================================
// Temporal Stats (F15 — Tag/Wochen-Stats)
// ============================================================

export interface TemporalSlice {
  count: number;
  count_per_cube: Record<string, number>;
  mean_ms: number | null;
  current_ao5: number | null;
}

export interface TemporalResponse {
  today: TemporalSlice;
  week: TemporalSlice;
  filter: { session_id: number | null };
}

export function useTemporalStats(
  sessionId: number | null
): UseQueryResult<TemporalResponse> {
  const params: { session_id?: number } = {};
  if (sessionId !== null) params.session_id = sessionId;
  return useQuery({
    queryKey: ["stats-temporal", params],
    queryFn: async (): Promise<TemporalResponse> => {
      const r = await api.get<TemporalResponse>("/stats/temporal", { params });
      return r.data;
    },
  });
}

// ============================================================
// Activity (aggregierte Solve-Counts ueber Zeit, day/week/month)
// ============================================================

export type ActivityGranularity = "day" | "week" | "month";

export interface ActivityBucket {
  /** Label-String, je nach Granularitaet:
   *   day:   "YYYY-MM-DD"
   *   week:  "YYYY-Www"
   *   month: "YYYY-MM"
   */
  period: string;
  count: number;
  count_valid: number;
  count_dnf: number;
}

export interface ActivityResponse {
  granularity: ActivityGranularity;
  from: string; // ISO date
  to: string; // ISO date
  buckets: ActivityBucket[];
  total_count: number;
  filter: { cube_type: string | null; session_id: number | null };
}

export interface ActivityParams {
  granularity: ActivityGranularity;
  days: number;
  cube_type?: string;
  session_id?: number | null;
}

export function useActivity(p: ActivityParams): UseQueryResult<ActivityResponse> {
  const params: Record<string, string | number> = {
    granularity: p.granularity,
    days: p.days,
  };
  if (p.cube_type) params.cube_type = p.cube_type;
  if (p.session_id !== null && p.session_id !== undefined) {
    params.session_id = p.session_id;
  }
  return useQuery({
    queryKey: ["stats-activity", params],
    queryFn: async (): Promise<ActivityResponse> => {
      const r = await api.get<ActivityResponse>("/stats/activity", { params });
      return r.data;
    },
  });
}

// ============================================================
// Sessions
// ============================================================

export function useSessions(): UseQueryResult<Session[]> {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<Session[]> => {
      const r = await api.get<Session[]>("/sessions");
      return r.data;
    },
  });
}

export function useCreateSession(): UseMutationResult<
  Session,
  Error,
  SessionCreate
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const r = await api.post<Session>("/sessions", payload);
      return r.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useUpdateSession(): UseMutationResult<
  Session,
  Error,
  { id: number; payload: SessionUpdate }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const r = await api.patch<Session>(`/sessions/${id}`, payload);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      // Solves haengen am Session-Namen → invalidieren falls UI Name zeigt
      qc.invalidateQueries({ queryKey: ["solves"] });
    },
  });
}

export function useDeleteSession(): UseMutationResult<
  void,
  Error,
  { id: number; moveSolvesTo?: number | null }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moveSolvesTo }) => {
      const params: Record<string, number> = {};
      if (moveSolvesTo !== undefined && moveSolvesTo !== null) {
        params.move_solves_to = moveSolvesTo;
      }
      await api.delete(`/sessions/${id}`, { params });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      // Solves wandern oder verlieren ihre session_id
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
      qc.invalidateQueries({ queryKey: ["sessions-suggest"] });
    },
  });
}

/**
 * Mergt source-Session in target — Solves wandern, source wird geloescht,
 * Notes werden in target appended.
 */
export function useMergeSession(): UseMutationResult<
  Session,
  Error,
  { sourceId: number; targetId: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, targetId }) => {
      const r = await api.post<Session>(
        `/sessions/${sourceId}/merge`,
        null,
        { params: { target_id: targetId } }
      );
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
      qc.invalidateQueries({ queryKey: ["sessions-suggest"] });
    },
  });
}

export interface SessionSuggestion {
  session_id: number | null;
  count: number;
  cube_type: string;
}

/**
 * Empfohlene Session fuer einen Cube-Type (jene mit den meisten Solves).
 * Liefert session_id=null wenn es keinen passenden Solve gibt.
 */
export function useSuggestSession(
  cubeType: string | undefined
): UseQueryResult<SessionSuggestion> {
  return useQuery({
    queryKey: ["sessions-suggest", cubeType],
    queryFn: async (): Promise<SessionSuggestion> => {
      if (!cubeType) {
        return { session_id: null, count: 0, cube_type: "" };
      }
      const r = await api.get<SessionSuggestion>("/sessions/suggest", {
        params: { cube_type: cubeType },
      });
      return r.data;
    },
    enabled: !!cubeType,
  });
}

// ============================================================
// Hardware (Phase 5 / F16)
// ============================================================

export interface HardwareListParams {
  cube_type?: string;
  active_only?: boolean;
}

export function useHardware(
  params: HardwareListParams = {}
): UseQueryResult<Hardware[]> {
  return useQuery({
    queryKey: ["hardware", params],
    queryFn: async (): Promise<Hardware[]> => {
      const r = await api.get<Hardware[]>("/hardware", { params });
      return r.data;
    },
  });
}

export function useCreateHardware(): UseMutationResult<
  Hardware,
  Error,
  HardwareCreate
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const r = await api.post<Hardware>("/hardware", payload);
      return r.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hardware"] }),
  });
}

export function useUpdateHardware(): UseMutationResult<
  Hardware,
  Error,
  { id: number; payload: HardwareUpdate }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const r = await api.patch<Hardware>(`/hardware/${id}`, payload);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hardware"] });
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats-by-hardware"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useDeleteHardware(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/hardware/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hardware"] });
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats-by-hardware"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export interface SeedResult {
  loaded: number;
  skipped_because_not_empty: boolean;
  use_force_to_load_anyway?: boolean;
}

export function useSeedHardware(): UseMutationResult<SeedResult, Error, boolean> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (force: boolean) => {
      const r = await api.post<SeedResult>(`/hardware/seed`, null, {
        params: { force },
      });
      return r.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hardware"] }),
  });
}

export interface HardwareSuggestion {
  hardware_id: number | null;
  count: number;
  cube_type: string;
  /** "most_used" | "first_active" | "none" */
  reason: "most_used" | "first_active" | "none";
}

/**
 * Empfohlene Hardware fuer einen Cube-Type:
 * - meiste Solves dieses Cubes (most_used), oder
 * - erste aktive Hardware mit passendem primary_cube_type (first_active),
 *   wenn noch keine Solves vorliegen.
 */
export function useSuggestHardware(
  cubeType: string | undefined
): UseQueryResult<HardwareSuggestion> {
  return useQuery({
    queryKey: ["hardware-suggest", cubeType],
    queryFn: async (): Promise<HardwareSuggestion> => {
      if (!cubeType) {
        return { hardware_id: null, count: 0, cube_type: "", reason: "none" };
      }
      const r = await api.get<HardwareSuggestion>("/hardware/suggest", {
        params: { cube_type: cubeType },
      });
      return r.data;
    },
    enabled: !!cubeType,
  });
}

// ============================================================
// Achievements (Phase 7a)
// ============================================================

export function useAchievements(): UseQueryResult<AchievementItem[]> {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => (await api.get<AchievementItem[]>("/achievements")).data,
  });
}

export interface RecheckResult {
  newly_unlocked: string[];
  newly_unlocked_count: number;
  total_unlocked: number;
}

export function useRecheckAchievements(): UseMutationResult<
  RecheckResult,
  Error,
  void
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await api.post<RecheckResult>("/achievements/recheck");
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

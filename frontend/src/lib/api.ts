// API-Layer: axios-Setup + Tanstack-Query-Hooks fuer alle Solve+Session-Endpoints.

import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { Session, Solve, SolveCreate, SolveUpdate } from "./types";

export const api = axios.create({
  baseURL: "http://localhost:8000",
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
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
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
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
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
      qc.invalidateQueries({ queryKey: ["solves"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["stats-by-cube"] });
      qc.invalidateQueries({ queryKey: ["stats-temporal"] });
      qc.invalidateQueries({ queryKey: ["stats-activity"] });
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

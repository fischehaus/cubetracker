// API-Layer: axios-Setup + Tanstack-Query-Hooks fuer alle Solve+Session-Endpoints.
//
// Phase W (Multi-User-Web): umgebaut fuer Auth.
// - baseURL kommt aus VITE_API_BASE-Env (Render-Build) oder localhost:8000 (Dev)
// - Bearer-Token-Header automatisch via Request-Interceptor
// - 401 -> /auth/refresh -> Retry (Single-Flight via refreshPromise)
// - withCredentials: true damit der HttpOnly-Refresh-Cookie mitgeschickt wird
// - Stub-Helper `withStub` schluckt 404er von Endpoints, die im Webapp-
//   Backend (Phase W.3) noch nicht existieren (Stats/Achievements/
//   Challenges/Backup). UI zeigt dann leere Listen statt Errors.

import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  AchievementItem,
  ChallengeItem,
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

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const ACCESS_TOKEN_KEY = "cubetracker_access_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_BASE,
  // Sendet HttpOnly-Refresh-Cookie automatisch mit (Cookie-Path=/auth).
  withCredentials: true,
});

// Bearer-Token vor jedem Request injizieren.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401-Refresh-Interceptor (Single-Flight).
let refreshPromise: Promise<string | null> | null = null;
async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const r = await axios.post<{ access_token: string }>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(r.data.access_token);
      return r.data.access_token;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

type RetriedConfig = AxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriedConfig | undefined;
    if (!original || original._retried) return Promise.reject(error);
    if (error.response?.status !== 401) return Promise.reject(error);
    if (original.url?.startsWith("/auth/")) return Promise.reject(error);
    const newToken = await tryRefresh();
    if (!newToken) {
      window.dispatchEvent(new Event("cubetracker:logged-out"));
      return Promise.reject(error);
    }
    original._retried = true;
    if (!original.headers) original.headers = {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

// ============================================================
// Stub-Helper fuer Endpoints, die im Webapp-Backend (Phase W.3)
// noch nicht existieren — schluckt 404 + liefert default.
// ============================================================
async function withStub<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;
    if (status === 404 || status === 405) return fallback;
    throw err;
  }
}

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

// ============================================================
// Challenge-Completion-Pub-Sub (Phase 7b)
// ============================================================
//
// Backend setzt nach Solve-Mutationen den Header X-Challenges-Completed
// mit kommagetrennten challenge-IDs. Wir lesen das im response-interceptor
// und feuern an Listener (z.B. ChallengeCompletionToaster).

type ChallengeCompletionListener = (ids: number[]) => void;
const challengeListeners: Set<ChallengeCompletionListener> = new Set();

export function onChallengeCompleted(
  fn: ChallengeCompletionListener
): () => void {
  challengeListeners.add(fn);
  return () => challengeListeners.delete(fn);
}

// Phase 8.3: PB-Confetti-Pub-Sub
// Backend setzt X-PB-Achieved: "single,ao5,ao12" wenn der Solve einen
// neuen PB getriggert hat. Frontend feuert visuellen Konfetti-Effekt.

export type PbKind = "single" | "ao5" | "ao12";
type PbListener = (kinds: PbKind[]) => void;
const pbListeners: Set<PbListener> = new Set();

export function onPbAchieved(fn: PbListener): () => void {
  pbListeners.add(fn);
  return () => pbListeners.delete(fn);
}

api.interceptors.response.use((response) => {
  const achHeader = response.headers["x-achievements-unlocked"] as
    | string
    | undefined;
  if (achHeader) {
    const codes = achHeader.split(",").map((c) => c.trim()).filter(Boolean);
    if (codes.length > 0) {
      achievementListeners.forEach((fn) => fn(codes));
    }
  }
  const chHeader = response.headers["x-challenges-completed"] as
    | string
    | undefined;
  if (chHeader) {
    const ids = chHeader
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) {
      challengeListeners.forEach((fn) => fn(ids));
    }
  }
  const pbHeader = response.headers["x-pb-achieved"] as string | undefined;
  if (pbHeader) {
    const kinds = pbHeader
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is PbKind => s === "single" || s === "ao5" || s === "ao12");
    if (kinds.length > 0) {
      pbListeners.forEach((fn) => fn(kinds));
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
  /** Phase 8.1: Filter auf alg_case (z.B. "PLL-Tperm") fuer DrillCard-Liste */
  alg_case?: string;
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
      qc.invalidateQueries({ queryKey: ["challenges-today"] });
      qc.invalidateQueries({ queryKey: ["stats-by-alg-case"] });
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
      qc.invalidateQueries({ queryKey: ["challenges-today"] });
      qc.invalidateQueries({ queryKey: ["stats-by-alg-case"] });
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
      qc.invalidateQueries({ queryKey: ["challenges-today"] });
      qc.invalidateQueries({ queryKey: ["stats-by-alg-case"] });
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
  /** Phase 8.4: Anker-Solve-IDs + ISO-timestamps der besten Averages */
  best_ao5_solve_id: number | null;
  best_ao12_solve_id: number | null;
  best_ao100_solve_id: number | null;
  best_ao5_at: string | null;
  best_ao12_at: string | null;
  best_ao100_at: string | null;
  filter: { cube_type: string | null; session_id: number | null };
}

export interface StatsParams {
  cube_type?: string;
  session_id?: number;
}

const EMPTY_STATS: StatsResponse = {
  count: 0,
  count_valid: 0,
  count_dnf: 0,
  best_ms: null,
  best_solve_id: null,
  worst_ms: null,
  worst_solve_id: null,
  mean_ms: null,
  current_ao5: null,
  current_ao12: null,
  current_ao100: null,
  best_ao5: null,
  best_ao12: null,
  best_ao100: null,
  best_ao5_solve_id: null,
  best_ao12_solve_id: null,
  best_ao100_solve_id: null,
  best_ao5_at: null,
  best_ao12_at: null,
  best_ao100_at: null,
  filter: { cube_type: null, session_id: null },
};

export function useStats(params: StatsParams = {}): UseQueryResult<StatsResponse> {
  return useQuery({
    queryKey: ["stats", params],
    queryFn: () =>
      withStub(
        async () => (await api.get<StatsResponse>("/stats", { params })).data,
        EMPTY_STATS,
      ),
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
    queryFn: () =>
      withStub(
        async () =>
          (await api.get<StatsBySessionResponse>("/stats/by-session", { params })).data,
        { filter: { cube_type: cubeType ?? null }, sessions: [] } as StatsBySessionResponse,
      ),
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
    queryFn: () =>
      withStub(
        async () => (await api.get<StatsByHardwareResponse>("/stats/by-hardware", { params })).data,
        {
          cube_type: cubeType ?? "",
          filter: { session_id: sessionId },
          hardware: [],
        } as StatsByHardwareResponse,
      ),
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
    queryFn: () =>
      withStub(
        async () => (await api.get<StatsByCubeResponse>("/stats/by-cube", { params })).data,
        { cubes: [], filter: { session_id: sessionId } } as StatsByCubeResponse,
      ),
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
  const empty: TemporalSlice = {
    count: 0,
    count_per_cube: {},
    mean_ms: null,
    current_ao5: null,
  };
  return useQuery({
    queryKey: ["stats-temporal", params],
    queryFn: () =>
      withStub(
        async () => (await api.get<TemporalResponse>("/stats/temporal", { params })).data,
        { today: empty, week: empty, filter: { session_id: sessionId } } as TemporalResponse,
      ),
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
    queryFn: () =>
      withStub(
        async () => (await api.get<ActivityResponse>("/stats/activity", { params })).data,
        {
          granularity: p.granularity,
          from: new Date(Date.now() - p.days * 86400_000).toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
          buckets: [],
          total_count: 0,
          filter: { cube_type: p.cube_type ?? null, session_id: p.session_id ?? null },
        } as ActivityResponse,
      ),
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

// Bulk-Operations (W.hardware-auto-seed)

export function useBulkUpdateHardware(): UseMutationResult<
  { updated: number },
  Error,
  { ids: number[]; is_active: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, is_active }) => {
      const r = await api.post<{ updated: number }>("/hardware/bulk-update", {
        ids,
        is_active,
      });
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hardware"] });
      qc.invalidateQueries({ queryKey: ["hardware-suggest"] });
    },
  });
}

export function useBulkDeleteHardware(): UseMutationResult<
  { deleted: number },
  Error,
  { ids: number[] }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }) => {
      const r = await api.post<{ deleted: number }>("/hardware/bulk-delete", {
        ids,
      });
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
    queryFn: () =>
      withStub(
        async () => (await api.get<AchievementItem[]>("/achievements")).data,
        [] as AchievementItem[],
      ),
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

// ============================================================
// Stats by Alg-Case (Phase 8b — Algorithm-Trainer)
// ============================================================

export interface AlgCaseStats {
  alg_case: string;
  count: number;
  count_valid: number;
  mean_ms: number | null;
  best_ms: number | null;
  current_ao5: number | null;
  last_solve_at: string;
}

export interface StatsByAlgCaseResponse {
  filter: { subset: string };
  cases: AlgCaseStats[];
}

export function useStatsByAlgCase(
  subset: string
): UseQueryResult<StatsByAlgCaseResponse> {
  return useQuery({
    queryKey: ["stats-by-alg-case", subset],
    queryFn: () =>
      withStub(
        async () =>
          (await api.get<StatsByAlgCaseResponse>("/stats/by-alg-case", { params: { subset } }))
            .data,
        { filter: { subset }, cases: [] } as StatsByAlgCaseResponse,
      ),
  });
}

// ============================================================
// Daily Challenges (Phase 7b)
// ============================================================

export interface ChallengesTodayResponse {
  date: string; // ISO-Date
  challenges: ChallengeItem[];
}

export interface ChallengesHistoryResponse {
  from: string;
  to: string;
  challenges: ChallengeItem[];
}

export function useChallengesToday(): UseQueryResult<ChallengesTodayResponse> {
  return useQuery({
    queryKey: ["challenges-today"],
    queryFn: () =>
      withStub(
        async () => (await api.get<ChallengesTodayResponse>("/challenges/today")).data,
        { date: new Date().toISOString().slice(0, 10), challenges: [] } as ChallengesTodayResponse,
      ),
  });
}

export function useChallengesHistory(
  days: number = 30
): UseQueryResult<ChallengesHistoryResponse> {
  return useQuery({
    queryKey: ["challenges-history", days],
    queryFn: () =>
      withStub(
        async () =>
          (await api.get<ChallengesHistoryResponse>("/challenges/history", { params: { days } }))
            .data,
        {
          from: new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
          challenges: [],
        } as ChallengesHistoryResponse,
      ),
  });
}

export function useRegenerateChallenges(): UseMutationResult<
  ChallengesTodayResponse,
  Error,
  void
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await api.post<ChallengesTodayResponse>(
        "/challenges/today/regenerate"
      );
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges-today"] });
      qc.invalidateQueries({ queryKey: ["challenges-history"] });
    },
  });
}

export function useDismissChallenge(): UseMutationResult<
  ChallengeItem,
  Error,
  number
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await api.post<ChallengeItem>(`/challenges/${id}/dismiss`);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges-today"] });
      qc.invalidateQueries({ queryKey: ["challenges-history"] });
    },
  });
}

// ============================================================
// Admin (Phase W.admin) — Cluster-Statistiken fuer App-Betreiber
// ============================================================

export interface AdminTopCube {
  cube_type: string;
  solves: number;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    email_verified: number;
    recently_active_7d: number;
    recently_active_30d: number;
  };
  volume: {
    solves: number;
    sessions: number;
    hardware: number;
    achievements_unlocked: number;
  };
  top_cubes: AdminTopCube[];
  storage: {
    snapshots_count: number;
    snapshots_total_bytes: number;
    snapshots_total_mb: number;
  };
  as_of: string;
}

/**
 * Cluster-Statistiken — nur fuer Admins (ADMIN_EMAILS-Env-Var).
 * Backend liefert 404 fuer Non-Admins (kein Probing). Frontend
 * sollte den Hook nur enable'n wenn user.is_admin.
 */
export function useAdminStats(
  enabled: boolean,
): UseQueryResult<AdminStats> {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const r = await api.get<AdminStats>("/admin/stats");
      return r.data;
    },
    enabled,
    // Stats sind teuer (COUNT auf grossen Tabellen), Rate-Limit 30/min.
    // 60s staleTime ist mehr als genug fuer ein Admin-Dashboard.
    staleTime: 60_000,
  });
}

export interface AdminUser {
  id: number;
  email: string;
  display_name: string | null;
  is_active: boolean;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string | null;
  solve_count: number;
  last_solve_at: string | null;
}

interface AdminUsersResponse {
  users: AdminUser[];
  count: number;
}

export function useAdminUsers(enabled: boolean): UseQueryResult<AdminUsersResponse> {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUsersResponse> => {
      const r = await api.get<AdminUsersResponse>("/admin/users");
      return r.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export interface AdminUserPatch {
  is_active?: boolean;
  email_verified?: boolean;
}

export function useAdminPatchUser(): UseMutationResult<
  AdminUser,
  Error,
  { userId: number; patch: AdminUserPatch }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, patch }) => {
      const r = await api.patch<AdminUser>(`/admin/users/${userId}`, patch);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useAdminDeleteUser(): UseMutationResult<
  void,
  Error,
  { userId: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }) => {
      // Confirm-Param wird vom Backend exakt verglichen — Frontend baut ihn
      // genauso. Doppelter Schutz: der User muss den Text auch in der UI
      // tippen, dann waere er hier in einem zusaetzlichen state-Feld.
      await api.delete(`/admin/users/${userId}`, {
        params: { confirm: `DELETE_USER_${userId}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export interface AdminMailResult {
  success: boolean;
  message_id: string | null;
  error: string | null;
  recipient: string;
}

export function useAdminSendEmail(): UseMutationResult<
  AdminMailResult,
  Error,
  { userId: number; subject: string; body: string }
> {
  return useMutation({
    mutationFn: async ({ userId, subject, body }) => {
      const r = await api.post<AdminMailResult>(`/admin/users/${userId}/email`, {
        subject,
        body,
      });
      return r.data;
    },
  });
}

export interface AdminAnnouncementResult {
  dry_run: boolean;
  recipient_count: number;
  sent: number;
  failed: number;
  failures?: string[];
  /** Server-Cap fuer synchron-versendbare Empfaenger (M2-Fix). */
  max_recipients?: number;
  /** true wenn recipient_count > max_recipients — echter Send wuerde 400. */
  over_cap?: boolean;
}

export function useAdminAnnouncement(): UseMutationResult<
  AdminAnnouncementResult,
  Error,
  { subject: string; body: string; dry_run: boolean }
> {
  return useMutation({
    mutationFn: async ({ subject, body, dry_run }) => {
      const r = await api.post<AdminAnnouncementResult>("/admin/announcement", {
        subject,
        body,
        dry_run,
      });
      return r.data;
    },
  });
}

// ============================================================
// Friends (Phase W.9)
// ============================================================

export interface FriendUserBrief {
  id: number;
  display_name: string | null;
  /** Nur fuer accepted-Friends gesetzt. pending-Anfragen leaken keine Email. */
  email: string | null;
}

export type FriendshipStatus = "pending" | "accepted";
export type FriendshipDirection = "outgoing" | "incoming";

export interface Friendship {
  id: number;
  status: FriendshipStatus;
  direction: FriendshipDirection;
  other: FriendUserBrief;
  created_at: string;
  accepted_at: string | null;
}

export interface FriendsListResponse {
  friends: Friendship[];
  incoming_pending: Friendship[];
  outgoing_pending: Friendship[];
}

export type FriendRelationship =
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "accepted";

export interface FriendSearchResult {
  id: number;
  display_name: string | null;
  relationship: FriendRelationship;
  friendship_id: number | null;
}

interface FriendSearchResponse {
  results: FriendSearchResult[];
}

interface EmailLookupResponse {
  found: boolean;
  user: FriendSearchResult | null;
}

export function useFriendsList(
  enabled: boolean,
): UseQueryResult<FriendsListResponse> {
  return useQuery({
    queryKey: ["friends-list"],
    queryFn: async (): Promise<FriendsListResponse> => {
      const r = await api.get<FriendsListResponse>("/friends/list");
      return r.data;
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useFriendSearch(
  q: string,
): UseQueryResult<FriendSearchResponse> {
  return useQuery({
    queryKey: ["friend-search", q],
    queryFn: async (): Promise<FriendSearchResponse> => {
      const r = await api.get<FriendSearchResponse>("/friends/search", {
        params: { q },
      });
      return r.data;
    },
    // Erst ab 2 Zeichen feuern — sonst 422 vom Backend
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });
}

export function useEmailLookup(): UseMutationResult<
  EmailLookupResponse,
  Error,
  { email: string }
> {
  return useMutation({
    mutationFn: async ({ email }) => {
      const r = await api.post<EmailLookupResponse>("/friends/lookup-email", {
        email,
      });
      return r.data;
    },
  });
}

export function useSendFriendRequest(): UseMutationResult<
  Friendship,
  Error,
  { target_user_id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ target_user_id }) => {
      const r = await api.post<Friendship>("/friends/request", {
        target_user_id,
      });
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-search"] });
    },
  });
}

export function useAcceptFriend(): UseMutationResult<
  Friendship,
  Error,
  { friendship_id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendship_id }) => {
      const r = await api.post<Friendship>(`/friends/${friendship_id}/accept`);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-search"] });
    },
  });
}

export function useRemoveFriendship(): UseMutationResult<
  void,
  Error,
  { friendship_id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendship_id }) => {
      await api.delete(`/friends/${friendship_id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-search"] });
    },
  });
}

/** Toggle is_discoverable + display_name via PATCH /auth/me. Auch fuer
 *  Display-Name-Updates wiederverwendbar (existierender Endpoint). */
export function useUpdateProfile(): UseMutationResult<
  unknown,
  Error,
  { display_name?: string | null; is_discoverable?: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch) => {
      const r = await api.patch("/auth/me", patch);
      return r.data;
    },
    onSuccess: () => {
      // /auth/me liefert neuen User — AuthContext muss refreshen.
      // Wir feuern unser eigenes Event statt direkt im Hook auf
      // AuthContext zuzugreifen (zirkulaer waere doof).
      window.dispatchEvent(new Event("cubetracker:profile-updated"));
      qc.invalidateQueries({ queryKey: ["friends-list"] });
    },
  });
}

// ============================================================
// Leaderboard (Phase W.10)
// ============================================================

export interface LeaderboardEntry {
  user_id: number;
  display_name: string;
  is_me: boolean;
  cube_type: string;
  solve_count_total: number;
  solve_count_30d: number;
  best_ms: number | null;
  best_ao5: number | null;
  best_ao12: number | null;
  current_ao5: number | null;
  current_ao12: number | null;
  last_solve_at: string | null;
}

export interface LeaderboardResponse {
  cube_type: string;
  rows: LeaderboardEntry[];
  count: number;
}

interface CubeTypesResponse {
  cube_types: string[];
}

export function useLeaderboardCubeTypes(
  enabled: boolean,
): UseQueryResult<CubeTypesResponse> {
  return useQuery({
    queryKey: ["leaderboard-cube-types"],
    queryFn: async () => {
      const r = await api.get<CubeTypesResponse>("/leaderboard/cube-types");
      return r.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useLeaderboard(
  cubeType: string | null,
): UseQueryResult<LeaderboardResponse> {
  return useQuery({
    queryKey: ["leaderboard", cubeType],
    queryFn: async () => {
      const r = await api.get<LeaderboardResponse>("/leaderboard", {
        params: { cube_type: cubeType },
      });
      return r.data;
    },
    enabled: !!cubeType && cubeType.length >= 1,
    staleTime: 30_000,
  });
}

// ============================================================
// Patch Notes (Changelog)
// ============================================================

export interface PatchNote {
  version: string;
  released: string; // ISO-date "2026-05-14"
  title: string;
  highlights: string[];
  commit: string | null;
}

interface ChangelogResponse {
  patches: PatchNote[];
}

export function usePatchNotes(): UseQueryResult<ChangelogResponse> {
  return useQuery({
    queryKey: ["patch-notes"],
    queryFn: async () => {
      const r = await api.get<ChangelogResponse>("/api/changelog");
      return r.data;
    },
    // Patch-Notes aendern sich nur bei Deploy — 5min Cache reicht.
    staleTime: 5 * 60_000,
  });
}

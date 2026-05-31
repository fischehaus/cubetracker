// API-Layer: axios-Setup + Tanstack-Query-Hooks für alle Solve+Session-Endpoints.
//
// Phase W (Multi-User-Web): umgebaut für Auth.
// - baseURL kommt aus VITE_API_BASE-Env oder Default "/api" (Prod, eine Domain)
//   bzw. "http://localhost:8000/api" (Dev). Backend serviert alle Routen unter /api.
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
import { qk } from "./queryKeys";
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
  (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");

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
// Stub-Helper für Endpoints, die im Webapp-Backend (Phase W.3)
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
  /** Phase 8.1: Filter auf alg_case (z.B. "PLL-Tperm") für DrillCard-Liste */
  alg_case?: string;
  limit?: number;
  offset?: number;
}

export function useSolves(params: SolveListParams = {}): UseQueryResult<Solve[]> {
  return useQuery({
    queryKey: qk.solves.list(params),
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
      // Solve-Mutation → Domain-Prefix-Invalidation (W.cache-invalidation-prefix):
      //   qk.solves.all() deckt: list + alle Stats-Varianten (overall/by-cube/
      //   by-session/by-hardware/temporal/activity/by-alg-case) + pb-history +
      //   recent-pbs in einem Schlag ab. Neuer Stats-Key unter qk.solves wird
      //   automatisch mit-invalidiert — kein Drift mehr durch vergessene Listen.
      //   suggestAll() refresht "zuletzt benutzt"-Listen unabhängig vom cubeType.
      //   leaderboard.all() (🆕 vs. vor Refactor): ohne dies blieb das eigene
      //   Ranking nach Solve-Eintrag bis Tab-Wechsel stale.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.sessions.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.hardware.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });
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
      // Solve-Mutation → Domain-Prefix-Invalidation (W.cache-invalidation-prefix):
      //   qk.solves.all() deckt: list + alle Stats-Varianten (overall/by-cube/
      //   by-session/by-hardware/temporal/activity/by-alg-case) + pb-history +
      //   recent-pbs in einem Schlag ab. Neuer Stats-Key unter qk.solves wird
      //   automatisch mit-invalidiert — kein Drift mehr durch vergessene Listen.
      //   suggestAll() refresht "zuletzt benutzt"-Listen unabhängig vom cubeType.
      //   leaderboard.all() (🆕 vs. vor Refactor): ohne dies blieb das eigene
      //   Ranking nach Solve-Eintrag bis Tab-Wechsel stale.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.sessions.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.hardware.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });
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
      // Solve-Mutation → Domain-Prefix-Invalidation (W.cache-invalidation-prefix):
      //   qk.solves.all() deckt: list + alle Stats-Varianten (overall/by-cube/
      //   by-session/by-hardware/temporal/activity/by-alg-case) + pb-history +
      //   recent-pbs in einem Schlag ab. Neuer Stats-Key unter qk.solves wird
      //   automatisch mit-invalidiert — kein Drift mehr durch vergessene Listen.
      //   suggestAll() refresht "zuletzt benutzt"-Listen unabhängig vom cubeType.
      //   leaderboard.all() (🆕 vs. vor Refactor): ohne dies blieb das eigene
      //   Ranking nach Solve-Eintrag bis Tab-Wechsel stale.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.sessions.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.hardware.suggestAll() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });
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
  /** W.pb-history: IDs aller Solves die ein Single-PB waren (Listen-Marker) */
  pb_solve_ids: number[];
  /** W.avg-pb-dots: Anker-Solve-IDs aller ao5-PBs (chronologische Progression) */
  ao5_pb_solve_ids: number[];
  /** W.avg-pb-dots: Anker-Solve-IDs aller ao12-PBs */
  ao12_pb_solve_ids: number[];
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
  pb_solve_ids: [],
  ao5_pb_solve_ids: [],
  ao12_pb_solve_ids: [],
  filter: { cube_type: null, session_id: null },
};

export function useStats(params: StatsParams = {}): UseQueryResult<StatsResponse> {
  return useQuery({
    queryKey: qk.solves.statsOverall(params),
    queryFn: () =>
      withStub(
        async () => (await api.get<StatsResponse>("/stats", { params })).data,
        EMPTY_STATS,
      ),
  });
}

// ============================================================
// PB-History (W.pb-history) — PB-Progression fuer Chart im ANALYSE-Tab
// ============================================================

export interface PbHistoryPoint {
  solve_id: number;
  ms: number;
  at: string | null;
}

export interface PbHistoryResponse {
  single: PbHistoryPoint[];
  ao5: PbHistoryPoint[];
  ao12: PbHistoryPoint[];
  filter: { cube_type: string | null; session_id: number | null };
}

const EMPTY_PB_HISTORY: PbHistoryResponse = {
  single: [],
  ao5: [],
  ao12: [],
  filter: { cube_type: null, session_id: null },
};

export function usePbHistory(
  params: StatsParams = {},
): UseQueryResult<PbHistoryResponse> {
  return useQuery({
    queryKey: qk.solves.pbHistory(params),
    queryFn: () =>
      withStub(
        async () =>
          (await api.get<PbHistoryResponse>("/stats/pb-history", { params })).data,
        EMPTY_PB_HISTORY,
      ),
  });
}

// ============================================================
// Recent PBs (W.recent-pbs) — letzte PB-Ereignisse fuer Dashboard
// ============================================================

export type RecentPbKind = "single" | "ao5" | "ao12";

export interface RecentPbEvent {
  kind: RecentPbKind;
  cube_type: string;
  solve_id: number;
  ms: number;
  at: string | null;
  /** Verbesserung gegenueber dem vorherigen PB derselben Metrik+Cube
   * (in ms). Null beim ersten PB einer Metrik. */
  delta_ms_vs_prev: number | null;
}

export interface RecentPbsResponse {
  events: RecentPbEvent[];
  count: number;
  limit: number;
}

// QA-Fix W.recent-pbs-qa: Stub haengt am tatsaechlichen limit (vorher hartkodiert 5).
const emptyRecentPbs = (limit: number): RecentPbsResponse => ({
  events: [],
  count: 0,
  limit,
});

export function useRecentPbs(limit: number = 5): UseQueryResult<RecentPbsResponse> {
  return useQuery({
    queryKey: qk.solves.recentPbs(limit),
    queryFn: () =>
      withStub(
        async () =>
          (await api.get<RecentPbsResponse>("/stats/recent-pbs", { params: { limit } })).data,
        emptyRecentPbs(limit),
      ),
    staleTime: 60_000,
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
    queryKey: qk.solves.statsBySession(params),
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
    queryKey: qk.solves.statsByHardware(params),
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
    queryKey: qk.solves.statsByCube(params),
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
    queryKey: qk.solves.statsTemporal(params),
    queryFn: () =>
      withStub(
        async () => (await api.get<TemporalResponse>("/stats/temporal", { params })).data,
        { today: empty, week: empty, filter: { session_id: sessionId } } as TemporalResponse,
      ),
  });
}

// ============================================================
// Activity (aggregierte Solve-Counts über Zeit, day/week/month)
// ============================================================

export type ActivityGranularity = "day" | "week" | "month";

export interface ActivityBucket {
  /** Label-String, je nach Granularität:
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
    queryKey: qk.solves.statsActivity(params),
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
    queryKey: qk.sessions.list(),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions.all() }),
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
      qc.invalidateQueries({ queryKey: qk.sessions.all() });
      // Solves hängen am Session-Namen → invalidieren falls UI Name zeigt
      qc.invalidateQueries({ queryKey: qk.solves.all() });
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
      qc.invalidateQueries({ queryKey: qk.sessions.all() });
      // Solves wandern oder verlieren ihre session_id — qk.solves.all()
      // deckt list + alle Stats-Varianten + pb-history in einem Schlag ab.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });  // 🆕 Bug-Fix
    },
  });
}

/**
 * Mergt source-Session in target — Solves wandern, source wird gelöscht,
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
      qc.invalidateQueries({ queryKey: qk.sessions.all() });
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });  // 🆕 Bug-Fix
    },
  });
}

export interface SessionSuggestion {
  session_id: number | null;
  count: number;
  cube_type: string;
}

/**
 * Empfohlene Session für einen Cube-Type (jene mit den meisten Solves).
 * Liefert session_id=null wenn es keinen passenden Solve gibt.
 */
export function useSuggestSession(
  cubeType: string | undefined
): UseQueryResult<SessionSuggestion> {
  return useQuery({
    queryKey: qk.sessions.suggest(cubeType),
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
    queryKey: qk.hardware.list(params),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.hardware.all() }),
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
      qc.invalidateQueries({ queryKey: qk.hardware.all() });
      // qk.solves.all() schließt stats-by-hardware ein.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
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
      qc.invalidateQueries({ queryKey: qk.hardware.all() });
      // qk.solves.all() schließt stats-by-hardware ein.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
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
      qc.invalidateQueries({ queryKey: qk.hardware.all() });
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
      qc.invalidateQueries({ queryKey: qk.hardware.all() });
      // qk.solves.all() schließt stats-by-hardware ein.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.hardware.all() }),
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
 * Empfohlene Hardware für einen Cube-Type:
 * - meiste Solves dieses Cubes (most_used), oder
 * - erste aktive Hardware mit passendem primary_cube_type (first_active),
 *   wenn noch keine Solves vorliegen.
 */
export function useSuggestHardware(
  cubeType: string | undefined
): UseQueryResult<HardwareSuggestion> {
  return useQuery({
    queryKey: qk.hardware.suggest(cubeType),
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
    queryKey: qk.achievements.all(),
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
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
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
    queryKey: qk.solves.statsByAlgCase(subset),
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
    queryKey: qk.challenges.today(),
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
    queryKey: qk.challenges.history(days),
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
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
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
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
    },
  });
}

// ============================================================
// Admin (Phase W.admin) — Cluster-Statistiken für App-Betreiber
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
    snapshots_limit_mb: number;
    snapshots_used_pct: number;
  };
  as_of: string;
}

/**
 * Cluster-Statistiken — nur für Admins (ADMIN_EMAILS-Env-Var).
 * Backend liefert 404 für Non-Admins (kein Probing). Frontend
 * sollte den Hook nur enable'n wenn user.is_admin.
 */
export function useAdminStats(
  enabled: boolean,
): UseQueryResult<AdminStats> {
  return useQuery({
    queryKey: qk.admin.stats(),
    queryFn: async (): Promise<AdminStats> => {
      const r = await api.get<AdminStats>("/admin/stats");
      return r.data;
    },
    enabled,
    // Stats sind teuer (COUNT auf großen Tabellen), Rate-Limit 30/min.
    // 60s staleTime ist mehr als genug für ein Admin-Dashboard.
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
  // Phase W.tester-role-db: Tester-Rolle.
  is_tester: boolean;
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
    queryKey: qk.admin.users(),
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
  /** Phase W.admin-toggle (2026-05-17): is_admin toggle via Admin-UI.
   *  Backend safeguard "letzter Admin" -> 400. */
  is_admin?: boolean;
  /** Phase W.tester-tab-ui (2026-05-28): is_tester toggle via Admin-UI. */
  is_tester?: boolean;
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
      qc.invalidateQueries({ queryKey: qk.admin.all() });
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
      // tippen, dann wäre er hier in einem zusätzlichen state-Feld.
      await api.delete(`/admin/users/${userId}`, {
        params: { confirm: `DELETE_USER_${userId}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.all() });
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
  /** Server-Cap für synchron-versendbare Empfänger (M2-Fix). */
  max_recipients?: number;
  /** true wenn recipient_count > max_recipients — echter Send würde 400. */
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
  /** Nur für accepted-Friends gesetzt. pending-Anfragen leaken keine Email. */
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
    queryKey: qk.friends.list(),
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
    queryKey: qk.friends.search(q),
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
      qc.invalidateQueries({ queryKey: qk.friends.all() });
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
      qc.invalidateQueries({ queryKey: qk.friends.all() });
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
      qc.invalidateQueries({ queryKey: qk.friends.all() });
    },
  });
}

/** Toggle is_discoverable + display_name via PATCH /auth/me. Auch für
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
      // AuthContext zuzugreifen (zirkulaer wäre doof).
      window.dispatchEvent(new Event("cubetracker:profile-updated"));
      qc.invalidateQueries({ queryKey: qk.friends.all() });
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
    queryKey: qk.leaderboard.cubeTypes(),
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
    queryKey: qk.leaderboard.byCube(cubeType),
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
  // Nur fuer Admins gesetzt — Backend liefert das Feld nicht fuer Non-Admins.
  // True = rein technischer Eintrag (QA/Methodik/Tooling), wird im UI als
  // "intern"-Badge dargestellt.
  internal?: boolean;
}

interface ChangelogResponse {
  patches: PatchNote[];
}

// ============================================================
// Feedback (Phase W.feedback, 2026-05-17; umgebaut W.tester-role-db 2026-05-28)
// ============================================================
// Mail-Versand ist Geschichte. Feedback landet jetzt in der DB-
// Inbox (admin-sichtbar), Admin antwortet via Inbox-UI, User sieht
// die Antwort im „Mein Feedback"-Bereich.

export type FeedbackCategory = "general" | "bug" | "feature" | "other";
export type FeedbackStatus = "new" | "in_progress" | "done" | "archived";

export interface FeedbackMessage {
  id: number;
  user_id: number | null;
  category: FeedbackCategory;
  message: string;
  created_at: string;
  status: FeedbackStatus;
  admin_response: string | null;
  admin_response_at: string | null;
  admin_response_by_user_id: number | null;
  user_seen_response_at: string | null;
}

export interface FeedbackMessagesResponse {
  messages: FeedbackMessage[];
  count: number;
}

export interface FeedbackCreateInput {
  category: FeedbackCategory;
  message: string;
}

/**
 * User schickt Feedback → landet als FeedbackMessage in der Admin-
 * Inbox. Hartes Rate-Limit (3/h pro User) gegen Spam. Auth pflicht.
 * Invalidiert auf success die eigene Liste (Mein-Feedback-Bereich).
 */
export function useCreateFeedbackMessage(): UseMutationResult<
  FeedbackMessage,
  Error,
  FeedbackCreateInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const r = await api.post<FeedbackMessage>("/feedback/messages", input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedback.user.all() });
    },
  });
}

/** Eigene Feedback-Items des Users — für „Mein Feedback"-Bereich. */
export function useMyFeedback(
  enabled: boolean = true,
): UseQueryResult<FeedbackMessagesResponse> {
  return useQuery({
    queryKey: qk.feedback.user.list(),
    queryFn: async () => {
      const r = await api.get<FeedbackMessagesResponse>("/feedback/me/messages");
      return r.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

/** Anzahl ungelesener Admin-Antworten — Toast-Trigger beim Login. */
export function useMyFeedbackUnreadCount(
  enabled: boolean = true,
): UseQueryResult<{ unread_count: number }> {
  return useQuery({
    queryKey: qk.feedback.user.unread(),
    queryFn: async () => {
      const r = await api.get<{ unread_count: number }>(
        "/feedback/me/unread-count",
      );
      return r.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

/** User markiert eine Antwort als gelesen. */
export function useMarkFeedbackResponseSeen(): UseMutationResult<
  void,
  Error,
  { id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      await api.post(`/feedback/me/messages/${id}/seen`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedback.user.all() });
    },
  });
}

// ============================================================
// Admin: Feedback-Inbox (Phase W.tester-role-db, 2026-05-28)
// ============================================================

export interface FeedbackInboxStats {
  by_status: Record<string, number>;
  open_by_category: Record<string, number>;
  total_open: number;
}

export interface AdminFeedbackUpdateInput {
  status?: FeedbackStatus;
  admin_response?: string | null;
}

export function useAdminFeedbackMessages(
  enabled: boolean,
  filters?: { status?: FeedbackStatus | "all"; category?: FeedbackCategory | "all" },
): UseQueryResult<FeedbackMessagesResponse> {
  const status = filters?.status;
  const category = filters?.category;
  return useQuery({
    queryKey: qk.feedback.admin.list(status, category),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status && status !== "all") params.status = status;
      if (category && category !== "all") params.category = category;
      const r = await api.get<FeedbackMessagesResponse>(
        "/admin/feedback/messages",
        { params },
      );
      return r.data;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useAdminFeedbackStats(
  enabled: boolean,
): UseQueryResult<FeedbackInboxStats> {
  return useQuery({
    queryKey: qk.feedback.admin.stats(),
    queryFn: async () => {
      const r = await api.get<FeedbackInboxStats>("/admin/feedback/stats");
      return r.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminUpdateFeedback(): UseMutationResult<
  FeedbackMessage,
  Error,
  { id: number; patch: AdminFeedbackUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const r = await api.patch<FeedbackMessage>(
        `/admin/feedback/messages/${id}`,
        patch,
      );
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedback.admin.all() });
    },
  });
}

export function useAdminDeleteFeedback(): UseMutationResult<
  void,
  Error,
  { id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      await api.delete(`/admin/feedback/messages/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedback.admin.all() });
    },
  });
}

export function usePatchNotes(): UseQueryResult<ChangelogResponse> {
  return useQuery({
    queryKey: qk.patchNotes.all(),
    queryFn: async () => {
      const r = await api.get<ChangelogResponse>("/changelog");
      return r.data;
    },
    // Patch-Notes ändern sich nur bei Deploy — 5min Cache reicht.
    staleTime: 5 * 60_000,
  });
}

// ============================================================
// WCA-Turniere (Phase W.wca-comps)
// ============================================================

export interface WcaCompetition {
  id: string;
  name: string;
  city: string | null;
  country_iso2: string | null;
  venue: string | null;
  start_date: string;
  end_date: string;
  registration_open: string | null;
  registration_close: string | null;
  url: string;
  website: string | null;
  latitude_degrees: number | null;
  longitude_degrees: number | null;
  event_ids: string[];
  events_count: number;
  distance_km: number | null;
}

export interface UpcomingCompetitionsResponse {
  user_location: {
    postal_code: string;
    country_iso2: string | null;
    lat: number;
    lng: number;
    display_name: string | null;
  };
  filter: {
    max_distance_km: number | null;
    days_ahead: number;
    limit: number;
    countries_queried?: string[];
  };
  competitions: WcaCompetition[];
  total_found: number;
}

/**
 * WCA-Turniere in der Nähe des Users. Voraussetzung: User hat
 * postal_code im Profil — Backend antwortet sonst 422.
 *
 * Default: max 300km, 10 Einträge, 6 Monate Vorausschau.
 * Cache 30min (Liste ändert sich selten — WCA published Turniere
 * Wochen vorher).
 */

// ============================================================
// WCA-Profil-Light (Phase W.wca-profile-light, 2026-05-28)
// ============================================================

export interface WcaPersonalRecord {
  event: string;
  single: {
    best: number | null;
    world_rank: number | null;
    continental_rank: number | null;
    national_rank: number | null;
  } | null;
  average: {
    best: number | null;
    world_rank: number | null;
    continental_rank: number | null;
    national_rank: number | null;
  } | null;
}

export interface WcaPersonRecentComp {
  id: string;
  name: string;
  city: string | null;
  country_iso2: string | null;
  start_date: string;
  end_date: string;
  // WCA-API liefert in seltenen Fällen (manuell angelegte Comps) keine URL —
  // defensive nullable + Frontend-Guard beim Render. QA-Fix W.wca-profile-qa.
  url: string | null;
}

export interface WcaPersonProfile {
  wca_id: string;
  name: string | null;
  country_iso2: string | null;
  gender: string | null;
  delegate_status: string | null;
  url: string | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  competitions_count: number;
  medals: { gold: number; silver: number; bronze: number; total: number };
  records: { world: number; continental: number; national: number; total: number };
  personal_records: WcaPersonalRecord[];
  recent_competitions: WcaPersonRecentComp[];
}

/**
 * Holt das offizielle WCA-Profil des eingeloggten Users. Voraussetzung:
 * User.wca_id ist gesetzt. Bei 422 (keine WCA-ID) gibt React-Query den
 * Error zurück — Aufrufer prüft das selbst und rendert den entsprechenden
 * Empty-State.
 *
 * Cache 6h client-seitig (matched backend-side cache, der die WCA-API
 * sowieso entlastet).
 */
export function useMyWcaProfile(
  enabled: boolean = true,
): UseQueryResult<WcaPersonProfile> {
  return useQuery({
    queryKey: qk.wca.meProfile(),
    queryFn: async () => {
      const r = await api.get<WcaPersonProfile>("/wca/me/profile");
      return r.data;
    },
    enabled,
    staleTime: 6 * 60 * 60_000, // 6h
    retry: false, // 422/404 sollen sofort sichtbar werden
  });
}

// ============================================================
// Speedcubing-News (Phase W.news)
// ============================================================

export interface NewsItem {
  id: number;
  source: string;
  source_label: string;
  title: string;
  link: string;
  summary: string | null;
  published_at: string | null;
  fetched_at: string | null;
}

export interface NewsLatestResponse {
  items: NewsItem[];
  count: number;
  refreshed: boolean;
}

/**
 * Letzte Speedcubing-News (WCA-Announcements + r/Cubers).
 * Backend macht on-demand-Refresh wenn Items > 60min alt — daher
 * client-staleTime 30min reicht aus.
 */
export function useLatestNews(
  limit: number = 10,
): UseQueryResult<NewsLatestResponse> {
  return useQuery({
    queryKey: qk.news.latest(limit),
    queryFn: async () => {
      const r = await api.get<NewsLatestResponse>("/news/latest", {
        params: { limit },
      });
      return r.data;
    },
    staleTime: 30 * 60_000,
    retry: 1,
  });
}

export function useUpcomingCompetitions(
  opts?: {
    enabled?: boolean;
    maxDistanceKm?: number;
    limit?: number;
    daysAhead?: number;
  },
): UseQueryResult<UpcomingCompetitionsResponse> {
  const maxDistanceKm = opts?.maxDistanceKm ?? 300;
  const limit = opts?.limit ?? 10;
  const daysAhead = opts?.daysAhead ?? 180;
  return useQuery({
    queryKey: qk.wca.upcoming(maxDistanceKm, limit, daysAhead),
    queryFn: async () => {
      const r = await api.get<UpcomingCompetitionsResponse>(
        "/wca/competitions/upcoming",
        {
          params: {
            max_distance_km: maxDistanceKm,
            limit,
            days_ahead: daysAhead,
          },
        },
      );
      return r.data;
    },
    enabled: opts?.enabled ?? true,
    staleTime: 30 * 60_000,
    // Backend caching ist 1h, kein retry-spam bei externen API-Fails.
    retry: 1,
  });
}

// ============================================================
// Roadmap (Phase W.roadmap-db, 2026-05-28)
// ============================================================

export type RoadmapStatus = "active" | "done";

export interface RoadmapItem {
  id: number;
  phase_id: string;
  sort_order: number;
  title_de: string;
  title_en: string;
  note_de: string | null;
  note_en: string | null;
  effort: string | null;
  status: RoadmapStatus;
  internal: boolean;
  created_at: string;
  updated_at: string;
  /** W.feedback-roadmap-pipeline: Rücklink zum Ursprungs-Feedback (oder null). */
  source_feedback_id?: number | null;
}

export interface RoadmapResponse {
  items: RoadmapItem[];
  count: number;
  is_admin: boolean;
}

export interface RoadmapItemCreateInput {
  phase_id: string;
  title_de: string;
  title_en: string;
  note_de?: string | null;
  note_en?: string | null;
  effort?: string | null;
  status?: RoadmapStatus;
  internal?: boolean;
  sort_order?: number | null;
}

export interface RoadmapItemUpdateInput {
  phase_id?: string;
  title_de?: string;
  title_en?: string;
  note_de?: string | null;
  note_en?: string | null;
  effort?: string | null;
  status?: RoadmapStatus;
  internal?: boolean;
  sort_order?: number;
}

export function useRoadmap(enabled: boolean = true): UseQueryResult<RoadmapResponse> {
  return useQuery({
    queryKey: qk.roadmap.all(),
    queryFn: async () => {
      const r = await api.get<RoadmapResponse>("/roadmap");
      return r.data;
    },
    enabled,
    staleTime: 60_000, // 1min — Admin sieht Updates auch im Modal
  });
}

export function useAdminCreateRoadmapItem(): UseMutationResult<
  RoadmapItem,
  Error,
  RoadmapItemCreateInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const r = await api.post<RoadmapItem>("/admin/roadmap/items", input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roadmap.all() });
    },
  });
}

export function useAdminUpdateRoadmapItem(): UseMutationResult<
  RoadmapItem,
  Error,
  { id: number; patch: RoadmapItemUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const r = await api.patch<RoadmapItem>(`/admin/roadmap/items/${id}`, patch);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roadmap.all() });
    },
  });
}

export function useAdminDeleteRoadmapItem(): UseMutationResult<
  void,
  Error,
  { id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      await api.delete(`/admin/roadmap/items/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roadmap.all() });
    },
  });
}

export interface RoadmapReorderInput {
  phase_id: string;
  /** Item-IDs in gewünschter Reihenfolge (oben zuerst). */
  ordered_ids: number[];
}

/**
 * Atomares Reorder einer Phase (W.roadmap-admin-reorder). Backend vergibt
 * sort_order in 10er-Schritten anhand der Position in ordered_ids.
 */
export function useAdminReorderRoadmap(): UseMutationResult<
  { phase_id: string; reordered: number },
  Error,
  RoadmapReorderInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const r = await api.post<{ phase_id: string; reordered: number }>(
        "/admin/roadmap/reorder",
        input,
      );
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roadmap.all() });
    },
  });
}

// W.feedback-roadmap-pipeline (2026-05-31): aus einem Feedback-Item atomar
// ein Roadmap-Item erzeugen (+ Feedback-Status setzen + optionale Antwort).
export interface FeedbackToRoadmapInput {
  phase_id: string;
  title_de: string;
  title_en: string;
  note_de?: string | null;
  note_en?: string | null;
  effort?: string | null;
  internal?: boolean;
  sort_order?: number | null;
  feedback_status?: FeedbackStatus;
  admin_response?: string | null;
}

export function useAdminFeedbackToRoadmap(): UseMutationResult<
  RoadmapItem,
  Error,
  { feedbackId: number; input: FeedbackToRoadmapInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feedbackId, input }) => {
      const r = await api.post<RoadmapItem>(
        `/admin/feedback/${feedbackId}/to-roadmap`,
        input,
      );
      return r.data;
    },
    onSuccess: () => {
      // Beide Domains: Feedback-Liste (Status geändert) + Roadmap (neues Item).
      qc.invalidateQueries({ queryKey: qk.feedback.admin.all() });
      qc.invalidateQueries({ queryKey: qk.roadmap.all() });
    },
  });
}

// ============================================================
// Admin: Live-Tests (Phase W.live-tests, 2026-05-17)
// ============================================================

export type LiveTestStatus = "open" | "pass" | "fail" | "skip";

export interface LiveTest {
  id: number;
  title: string;
  description: string;
  related_phase: string | null;
  related_commit_sha: string | null;
  related_tag: string | null;
  status: LiveTestStatus;
  user_response: string | null;
  responded_at: string | null;
  responded_by_user_id: number | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  created_at: string;
  created_by_user_id: number | null;
}

export interface LiveTestsResponse {
  tests: LiveTest[];
  count: number;
}

export interface LiveTestCreateInput {
  title: string;
  description: string;
  related_phase?: string | null;
  related_commit_sha?: string | null;
  related_tag?: string | null;
}

export interface LiveTestUpdateInput {
  status?: LiveTestStatus;
  user_response?: string | null;
}

export function useAdminLiveTests(
  enabled: boolean,
  statusFilter?: LiveTestStatus | "all",
): UseQueryResult<LiveTestsResponse> {
  return useQuery({
    queryKey: qk.adminLiveTests.list(statusFilter),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const r = await api.get<LiveTestsResponse>("/admin/live-tests", { params });
      return r.data;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useAdminCreateLiveTest(): UseMutationResult<
  LiveTest,
  Error,
  LiveTestCreateInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const r = await api.post<LiveTest>("/admin/live-tests", input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminLiveTests.all() });
    },
  });
}

export function useAdminUpdateLiveTest(): UseMutationResult<
  LiveTest,
  Error,
  { id: number; patch: LiveTestUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const r = await api.patch<LiveTest>(`/admin/live-tests/${id}`, patch);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminLiveTests.all() });
    },
  });
}

export function useAdminDeleteLiveTest(): UseMutationResult<
  void,
  Error,
  { id: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      await api.delete(`/admin/live-tests/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminLiveTests.all() });
    },
  });
}

// ============================================================
// Danger-Zone (W.danger-zone) — abgestufte Reset-Aktionen unter
// "Meine Daten". Account-Loeschung ist auch hier sichtbar.
// ============================================================

export function useResetSolves(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/me/reset-solves", null, {
        params: { confirm: "RESET_SOLVES" },
      });
    },
    onSuccess: () => {
      // Alle solve-/stats-/sessions-bezogenen Queries refetchen.
      // QA-Fix W.danger-zone-qa: sessions + achievements zeigen sonst
      // veraltete Counts/Badges nach dem Reset bis zum Hard-Reload.
      // Wipe-Demo-Data → alles was sich durch Solve/Session-Reset ändert.
      // 🆕 Vor dem Refactor invalidierte dieser Block die Keys ["activity"],
      // ["temporal"], ["by-cube"] — die echten Stats-Keys haben aber das
      // "stats-"-Prefix, also waren das stille No-Ops und Stats-Karten
      // zeigten nach Wipe stale Werte bis Hard-Reload. Mit qk.solves.all()
      // sind alle Stats-Varianten automatisch dabei.
      qc.invalidateQueries({ queryKey: qk.solves.all() });
      qc.invalidateQueries({ queryKey: qk.sessions.all() });
      qc.invalidateQueries({ queryKey: qk.achievements.all() });
      qc.invalidateQueries({ queryKey: qk.challenges.all() });
      qc.invalidateQueries({ queryKey: qk.leaderboard.all() });
    },
  });
}

export function useResetTracking(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/me/reset-tracking", null, {
        params: { confirm: "RESET_TRACKING" },
      });
    },
    onSuccess: () => {
      // Total-Reset: alle Queries dropen, frische Welt.
      qc.invalidateQueries();
    },
  });
}

export function useDeleteAccount(): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      await api.delete("/auth/me");
      // Token rauswerfen + App neu laden, damit Auth-Check zur Login-Seite redirected.
      // QA-Fix W.danger-zone-qa: window.location.replace statt href —
      // History-Eintrag wird ersetzt, der User kann nicht via Back-Button
      // zur Old-Account-Seite zurueck.
      localStorage.removeItem("cubetracker_access_token");
      window.location.replace("/");
    },
  });
}

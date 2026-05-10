/**
 * Typen + thin wrappers fuer Solves/Sessions/Hardware-API.
 *
 * Alle Calls laufen automatisch mit Bearer-Token (siehe client.ts request-Interceptor).
 */
import { api } from "./client";

// ============================================================
// Solve
// ============================================================

export interface Solve {
  id: number;
  time_ms: number;
  cube_type: string;
  scramble: string | null;
  notes: string | null;
  plus_two: boolean;
  dnf: boolean;
  alg_case: string | null;
  split_times_ms: string | null;
  timestamp: string;
  session_id: number | null;
  hardware_id: number | null;
  effective_time_ms: number | null;
}

export interface SolveCreate {
  time_ms: number;
  cube_type: string;
  scramble?: string | null;
  notes?: string | null;
  plus_two?: boolean;
  dnf?: boolean;
  session_id?: number | null;
  hardware_id?: number | null;
}

export interface SolveUpdate {
  plus_two?: boolean;
  dnf?: boolean;
  notes?: string | null;
  session_id?: number | null;
  hardware_id?: number | null;
}

export async function listSolves(params: {
  cube_type?: string;
  session_id?: number;
  limit?: number;
} = {}): Promise<Solve[]> {
  const response = await api.get<Solve[]>("/solves", { params });
  return response.data;
}

export async function createSolve(payload: SolveCreate): Promise<Solve> {
  const response = await api.post<Solve>("/solves", payload);
  return response.data;
}

export async function updateSolve(id: number, payload: SolveUpdate): Promise<Solve> {
  const response = await api.patch<Solve>(`/solves/${id}`, payload);
  return response.data;
}

export async function deleteSolve(id: number): Promise<void> {
  await api.delete(`/solves/${id}`);
}

// ============================================================
// Session
// ============================================================

export interface DbSession {
  id: number;
  name: string;
  scramble_type: string | null;
  notes: string | null;
  cstimer_session_id: number | null;
  created_at: string;
}

export interface SessionCreate {
  name: string;
  scramble_type?: string | null;
  notes?: string | null;
}

export async function listSessions(): Promise<DbSession[]> {
  const response = await api.get<DbSession[]>("/sessions");
  return response.data;
}

export async function createSession(payload: SessionCreate): Promise<DbSession> {
  const response = await api.post<DbSession>("/sessions", payload);
  return response.data;
}

export async function deleteSession(id: number): Promise<void> {
  await api.delete(`/sessions/${id}`);
}

// ============================================================
// Hardware
// ============================================================

export interface Hardware {
  id: number;
  name: string;
  primary_cube_type: string;
  notes: string | null;
  is_active: boolean;
  acquired_at: string | null;
  created_at: string;
}

export interface HardwareCreate {
  name: string;
  primary_cube_type: string;
  notes?: string | null;
  is_active?: boolean;
}

export async function listHardware(): Promise<Hardware[]> {
  const response = await api.get<Hardware[]>("/hardware");
  return response.data;
}

export async function createHardware(payload: HardwareCreate): Promise<Hardware> {
  const response = await api.post<Hardware>("/hardware", payload);
  return response.data;
}

export async function deleteHardware(id: number): Promise<void> {
  await api.delete(`/hardware/${id}`);
}

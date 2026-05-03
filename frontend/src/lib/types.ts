// TypeScript-Types passend zu den Pydantic-Schemas im Backend (db/schemas.py).
// Bei Schema-Aenderungen im Backend hier mit-aktualisieren.

export interface Solve {
  id: number;
  time_ms: number;
  cube_type: string;
  scramble: string | null;
  notes: string | null;
  timestamp: string; // ISO-8601
  plus_two: boolean;
  dnf: boolean;
  session_id: number | null;
  hardware_id: number | null;
  effective_time_ms: number | null;
  alg_case: string | null;
  /** Phase 8.2: JSON-array string mit Phasen-Dauern in ms, z.B. "[1500,5000,1500,1000]" */
  split_times_ms: string | null;
}

export interface SolveCreate {
  time_ms: number;
  cube_type: string;
  scramble?: string | null;
  notes?: string | null;
  plus_two?: boolean;
  dnf?: boolean;
  timestamp?: string | null;
  session_id?: number | null;
  hardware_id?: number | null;
  alg_case?: string | null;
  split_times_ms?: string | null;
}

export interface SolveUpdate {
  time_ms?: number;
  cube_type?: string;
  scramble?: string | null;
  notes?: string | null;
  plus_two?: boolean;
  dnf?: boolean;
  session_id?: number | null;
  hardware_id?: number | null;
  alg_case?: string | null;
  split_times_ms?: string | null;
}

export interface Session {
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
  cstimer_session_id?: number | null;
}

export interface SessionUpdate {
  name?: string;
  scramble_type?: string | null;
  notes?: string | null;
}

export interface AchievementItem {
  code: string;
  name: string;
  description: string;
  category: "volume" | "speed" | "variety" | "hardware" | "consistency";
  icon: string;
  unlocked_at: string | null;
}

export type ChallengeKind = "volume" | "speed" | "comeback" | "diversity";

export interface ChallengeItem {
  id: number;
  kind: ChallengeKind;
  cube_type: string | null;
  target_value: number;
  progress: number;
  generated_for_date: string;
  completed_at: string | null;
  dismissed: boolean;
}

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
  acquired_at?: string | null;
}

export interface HardwareUpdate {
  name?: string;
  primary_cube_type?: string;
  notes?: string | null;
  is_active?: boolean;
  acquired_at?: string | null;
}

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
}

export interface Session {
  id: number;
  name: string;
  scramble_type: string | null;
  cstimer_session_id: number | null;
  created_at: string;
}

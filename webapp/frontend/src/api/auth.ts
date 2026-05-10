/**
 * Auth-API-Calls. Bewusst duenne Wrapper um axios — die ganze Logik
 * (Token-Storage, 401-Refresh) sitzt im client.ts.
 */
import { api, clearAccessToken, setAccessToken } from "./client";

export interface UserRead {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AccessTokenOnly {
  access_token: string;
  token_type: string;
}

export async function register(email: string, password: string): Promise<UserRead> {
  const response = await api.post<UserRead>("/auth/register", { email, password });
  return response.data;
}

export async function login(email: string, password: string): Promise<UserRead> {
  // Login setzt das Refresh-Cookie (HttpOnly, Browser uebernimmt) +
  // liefert Access-Token im Body. Den speichern wir in localStorage.
  const response = await api.post<AccessTokenOnly>("/auth/login", { email, password });
  setAccessToken(response.data.access_token);
  // /auth/me holen damit der UI direkt User-Info hat
  const me = await api.get<UserRead>("/auth/me");
  return me.data;
}

export async function fetchMe(): Promise<UserRead> {
  const response = await api.get<UserRead>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // 401/403 hier ignorieren — clientseitig wollen wir trotzdem ausloggen
  }
  clearAccessToken();
}

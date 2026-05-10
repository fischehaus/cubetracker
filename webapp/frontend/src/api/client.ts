/**
 * Zentraler axios-Client fuer cubetracker-webapp.
 *
 * Sicherheits-Architektur:
 * - Access-Token: in localStorage (kann von JS gelesen werden, aber lebt nur 15 Min).
 *   Wird vor jedem Request aus dem Storage geholt + im Authorization-Header gesetzt.
 * - Refresh-Token: in HttpOnly-Cookie, NICHT von JS lesbar — Browser sendet ihn
 *   automatisch bei `withCredentials: true`-Requests an die /auth/-Endpoints.
 * - Auf 401 vom Backend: einmal /auth/refresh probieren, neuen Access speichern,
 *   Original-Request wiederholen. Klappt das nicht: Logout (= Token leeren +
 *   App reagiert via AuthContext-State).
 *
 * Base-URL:
 * - Dev: leer / "" -> Vite-Dev-Server proxied auf das lokale FastAPI (CORS-frei wenn
 *   Frontend ueber denselben Vite-Server laeuft, aber wir brauchen explicit URL
 *   weil wir cross-origin gegen :8000 sprechen). Default = http://localhost:8000.
 * - Prod: VITE_API_BASE wird beim Build gesetzt (Render-Static-Site-Env-Var).
 */
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const ACCESS_TOKEN_KEY = "cubetracker_access_token";

// ============================================================
// Token-Storage
// ============================================================

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// ============================================================
// Axios-Instanz
// ============================================================

export const api = axios.create({
  baseURL: API_BASE,
  // withCredentials sendet das Refresh-Cookie automatisch mit (only-needed
  // bei /auth/refresh + /auth/logout, aber globals zu setzen ist safe weil
  // das Cookie path=/auth ist).
  withCredentials: true,
});

// Request-Interceptor: Bearer-Token vor jedem Call setzen
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// Refresh-Interceptor (401 -> Refresh -> Retry)
// ============================================================

// Ein einziger inflight Refresh damit parallele 401er nicht 5x refreshen.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      // Direkter axios-Call, NICHT api-Instanz (sonst Endlosschleife wenn
      // refresh selbst 401 wirft).
      const response = await axios.post<{ access_token: string }>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken = response.data.access_token;
      setAccessToken(newToken);
      return newToken;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// Eigener Marker-Header, damit wir Retries als solche erkennen + nicht
// in eine Endlosschleife rennen.
type RetriedConfig = AxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriedConfig | undefined;
    if (!original || original._retried) {
      return Promise.reject(error);
    }
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    // Auth-Endpoints selbst sollen NICHT refresh'n (Login/Register/Refresh)
    if (original.url?.startsWith("/auth/")) {
      return Promise.reject(error);
    }
    const newToken = await tryRefresh();
    if (!newToken) {
      // Refresh fehlgeschlagen -> User ist effektiv ausgeloggt.
      // AuthContext picked das auf via storage-event + isAuthenticated-Check.
      window.dispatchEvent(new Event("cubetracker:logged-out"));
      return Promise.reject(error);
    }
    original._retried = true;
    if (!original.headers) original.headers = {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

/**
 * AuthContext — global state fuer "wer ist eingeloggt".
 *
 * Bei App-Start probiert er /auth/me. Erfolg = noch eingeloggter
 * Access-Token im localStorage. 401 + erfolgreichem Refresh = auch
 * eingeloggt (apiClient retried automatisch). Beides daneben =
 * isAuthenticated wird false, App zeigt Login-Page.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearAccessToken, getAccessToken, setAccessToken } from "../lib/api";

export interface UserRead {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface AccessTokenOnly {
  access_token: string;
  token_type: string;
}

async function apiRegister(email: string, password: string): Promise<UserRead> {
  const r = await api.post<UserRead>("/auth/register", { email, password });
  return r.data;
}

async function apiLogin(email: string, password: string): Promise<UserRead> {
  const r = await api.post<AccessTokenOnly>("/auth/login", { email, password });
  setAccessToken(r.data.access_token);
  const me = await api.get<UserRead>("/auth/me");
  return me.data;
}

async function apiLogout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    /* ignore — wir loggen client-side trotzdem aus */
  }
  clearAccessToken();
}

async function apiMe(): Promise<UserRead> {
  const r = await api.get<UserRead>("/auth/me");
  return r.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Beim App-Start: wenn ein Access-Token im Storage liegt, /auth/me probieren.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // apiClient feuert "cubetracker:logged-out" wenn Refresh fehlschlaegt.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("cubetracker:logged-out", handler);
    return () => window.removeEventListener("cubetracker:logged-out", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await apiLogin(email, password);
    setUser(me);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password);
    const me = await apiLogin(email, password);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be inside <AuthProvider>");
  }
  return ctx;
}

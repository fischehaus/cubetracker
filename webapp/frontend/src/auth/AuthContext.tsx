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
import * as authApi from "../api/auth";
import { getAccessToken } from "../api/client";

export interface AuthState {
  user: authApi.UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.UserRead | null>(null);
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
        const me = await authApi.fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // Token kaputt/abgelaufen, refresh hat auch nicht geholfen
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

  // Wenn der apiClient feststellt dass der Refresh fehlgeschlagen ist
  // (Token revoked/abgelaufen), setzt er ein "cubetracker:logged-out"-Event.
  // Wir hoeren mit + setzen dann user=null -> AuthGuard zeigt Login.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("cubetracker:logged-out", handler);
    return () => window.removeEventListener("cubetracker:logged-out", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await authApi.login(email, password);
    setUser(me);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register(email, password);
    // Nach Register direkt einloggen (Render-Free hat Cold-Starts, schon mit
    // dem Register-Call ist der Container hot).
    const me = await authApi.login(email, password);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
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

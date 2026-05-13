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
import { useQueryClient } from "@tanstack/react-query";
import { api, clearAccessToken, getAccessToken, setAccessToken } from "../lib/api";

export interface UserRead {
  id: number;
  email: string;
  is_active: boolean;
  email_verified: boolean;
  display_name: string | null;
  created_at: string;
  /** Computed from ADMIN_EMAILS-Env-Var im Backend. Steuert ob die
   *  Admin-Card im VerwaltungTab sichtbar ist. */
  is_admin: boolean;
  /** Phase W.9: Opt-In fuer User-Suche per display_name. */
  is_discoverable: boolean;
}

export interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
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
  // QA-Finding (high): React-Query-Cache haelt die Antworten aller
  // /api-Calls bis zur Garbage-Collection. Bei Logout->Login von User A
  // zu User B im selben Browser sieht User B kurz Daten von User A bis
  // die Queries refetcht haben. qc.clear() bei Login/Logout schliesst
  // das. Quelle: Sub-Agent-QA-Review Admin-Card.
  const qc = useQueryClient();

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
  // Auch hier Cache leeren (s.o.) — Stale-Daten gehoeren keinem mehr.
  useEffect(() => {
    const handler = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener("cubetracker:logged-out", handler);
    return () => window.removeEventListener("cubetracker:logged-out", handler);
  }, [qc]);

  // Phase W.9: useUpdateProfile feuert "cubetracker:profile-updated" nach
  // erfolgreichem PATCH /auth/me — wir refetchen den User damit
  // display_name/is_discoverable im AuthState aktuell sind.
  useEffect(() => {
    const handler = () => {
      void apiMe()
        .then((u) => setUser(u))
        .catch(() => {
          // Ignorieren — wenn /auth/me 401 wirft, kuemmert sich der
          // logged-out-Handler. Hier nicht zusaetzlich loggen.
        });
    };
    window.addEventListener("cubetracker:profile-updated", handler);
    return () =>
      window.removeEventListener("cubetracker:profile-updated", handler);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      qc.clear();
      const me = await apiLogin(email, password);
      setUser(me);
    },
    [qc],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      qc.clear();
      await apiRegister(email, password);
      const me = await apiLogin(email, password);
      setUser(me);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    qc.clear();
  }, [qc]);

  // Nach Profil-Aenderungen via PATCH /me / verify-email etc: User reloaden.
  const refreshMe = useCallback(async () => {
    try {
      const me = await apiMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, isLoading, login, register, logout, refreshMe],
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

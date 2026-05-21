import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers as Record<string, string> },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    tryRefresh();
  }, []);

  async function tryRefresh() {
    try {
      const data = await apiFetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
      setAccessToken(data.accessToken);
      const me = await apiFetch<{ user: User }>("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      setUser(me.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiFetch<{ user: User; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const refreshUser = useCallback((user: User) => {
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

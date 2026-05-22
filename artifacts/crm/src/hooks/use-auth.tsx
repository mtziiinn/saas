"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
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
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do servidor (status ${res.status})`);
  }
  if (!res.ok) throw new Error(data?.error?.message || "Request failed");
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const tokenRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
  }, []);

  const updateAuth = (newUser: User | null, newAccessToken: string | null) => {
    tokenRef.current = newAccessToken;
    setAccessToken(newAccessToken);
    setUser(newUser);
    userRef.current = newUser;
  };

  useEffect(() => {
    tryRefresh();
    // Refresh slightly before expiry (14 minutes instead of 15)
    const interval = setInterval(tryRefresh, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function tryRefresh() {
    try {
      const data = await apiFetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
      tokenRef.current = data.accessToken;
      const me = await apiFetch<{ user: User }>("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      updateAuth(me.user, data.accessToken);
    } catch (err) {
      // If refresh fails and we were logged in, log out to be safe
      if (userRef.current) {
        updateAuth(null, null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    updateAuth(data.user, data.accessToken);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiFetch<{ user: User; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    updateAuth(data.user, data.accessToken);
  }, []);

  const refreshUser = useCallback((user: User) => {
    updateAuth(user, tokenRef.current);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
    } finally {
      updateAuth(null, null);
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

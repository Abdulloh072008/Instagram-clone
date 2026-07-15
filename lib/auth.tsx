"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken } from "./client";
import { profiles } from "./services";
import type { AuthUser, Envelope } from "./types";

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.sid ?? payload.sub ?? "",
      userName: payload.name ?? "",
      email: payload.email ?? "",
      role:
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
        payload.role ??
        "User",
    };
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<string>;
  logout: () => void;
  setUserImage: (image: string | null) => void;
}

export interface RegisterInput {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch the profile photo (not in the JWT) and merge it onto the user.
  const loadImage = useCallback(() => {
    profiles
      .me()
      .then((p) => setUser((cur) => (cur ? { ...cur, image: p.data.image } : cur)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setUser(decodeToken(token));
      loadImage();
    }
    setLoading(false);
  }, [loadImage]);

  const login = useCallback(
    async (userName: string, password: string) => {
      const res = await api.postJson<Envelope<string>>("/Account/login", { userName, password });
      const token = res.data;
      if (!token || typeof token !== "string") throw new Error("Логин ноком шуд");
      setToken(token);
      setUser(decodeToken(token));
      loadImage();
    },
    [loadImage],
  );

  const setUserImage = useCallback((image: string | null) => {
    setUser((u) => (u ? { ...u, image } : u));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.postJson<Envelope<string>>("/Account/register", input);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserImage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

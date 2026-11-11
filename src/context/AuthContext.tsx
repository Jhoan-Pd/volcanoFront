"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readToken, saveToken, SESSION_EXPIRED_EVENT } from "@/api/client";
import { authApi } from "@/api/services";
import type { Role, User } from "@/api/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On page load the stored token is validated against /auth/me
  useEffect(() => {
    if (!readToken()) {
      setLoading(false);
      return;
    }
    authApi.me().then(setUser).catch(() => saveToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: signedIn } = await authApi.login(email, password);
    saveToken(access_token);
    setUser(signedIn);
    return signedIn;
  }, []);

  const logout = useCallback(() => {
    saveToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(() => ({ user, loading, login, logout, hasRole }), [user, loading, login, logout, hasRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

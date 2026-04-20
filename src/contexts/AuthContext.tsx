import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { refreshAuthToken } from "../services/api";

type Role = "Admin" | "User";

type PersistedAuth = {
  accessToken: string;
  refreshToken: string;
  firmId: string;
  role: Role;
};

export interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  firmId: string | null;
  role: Role | null;
  login: (payload: PersistedAuth) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  auth: PersistedAuth | null;
}

const STORAGE_KEY = "efdconverter.auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(token?: string | null) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp ?? 0);
  if (!exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyAuth = (payload: PersistedAuth) => {
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setFirmId(payload.firmId);
    setRole(payload.role);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const clearAuth = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setFirmId(null);
    setRole(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshSession = async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      clearAuth();
      return false;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedAuth;
      if (!parsed.refreshToken) {
        clearAuth();
        return false;
      }

      const refreshed = await refreshAuthToken(parsed.refreshToken);
      applyAuth(refreshed);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function restoreAuth() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        if (!cancelled) setIsInitializing(false);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as PersistedAuth;

        if (!parsed.accessToken || !parsed.refreshToken || !parsed.firmId || !parsed.role) {
          clearAuth();
          return;
        }

        if (isTokenExpired(parsed.accessToken)) {
          const ok = await refreshSession();
          if (!ok && !cancelled) clearAuth();
        } else if (!cancelled) {
          applyAuth(parsed);
        }
      } catch {
        clearAuth();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    restoreAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = !!accessToken && !isTokenExpired(accessToken);

  const login = (payload: PersistedAuth) => {
    applyAuth(payload);
  };

  const logout = () => {
    clearAuth();
  };

  const value = useMemo<AuthContextValue>(
    () => {
      const auth =
        isAuthenticated && accessToken && refreshToken && firmId && role
          ? { accessToken, refreshToken, firmId, role }
          : null;
      return {
        isAuthenticated,
        isInitializing,
        accessToken,
        refreshToken,
        firmId,
        role,
        login,
        logout,
        refreshSession,
        auth,
      };
    },
    [isAuthenticated, isInitializing, accessToken, refreshToken, firmId, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

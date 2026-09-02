"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { authStore } from "@/lib/auth-store";
import { authService } from "@/services/auth-service";
import type { AuthUser } from "@/types/auth";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot
  );

  // getServerSnapshot always reports "logged out" to avoid a hydration
  // mismatch, so a redirect decision can't trust `session` until the first
  // client render has actually read localStorage. useSyncExternalStore
  // (never notifies, snapshot flips server->client) reports that instead
  // of useEffect+setState, avoiding a cascading-render lint violation.
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login(email, password);
    if (!next.user.roles.some((role) => ADMIN_ROLES.includes(role))) {
      throw new Error("Tu cuenta no tiene permisos de administrador.");
    }
    authStore.setSession(next);
  }, []);

  const logout = useCallback(() => authStore.clearSession(), []);

  const status: AuthStatus = !hasHydrated
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";

  return (
    <AuthContext.Provider
      value={{ status, user: session?.user ?? null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

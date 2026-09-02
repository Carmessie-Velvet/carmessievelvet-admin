import type { AuthSession } from "@/types/auth";

const STORAGE_KEY = "carmessie-admin-auth";

type Listener = () => void;

/**
 * External store for the admin session, backed by localStorage. Plain
 * functions (no React) so services like `api-client.ts` can read the
 * current token outside of a component, the same `useSyncExternalStore`
 * pattern the storefront uses for its cart (`carmessievelvet-web`).
 */
function createAuthStore() {
  let session: AuthSession | null = null;
  let loaded = false;
  const listeners = new Set<Listener>();

  function loadOnce() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      session = raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      session = null;
    }
  }

  function persist() {
    if (typeof window === "undefined") return;
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): AuthSession | null {
      loadOnce();
      return session;
    },
    getServerSnapshot(): AuthSession | null {
      return null;
    },
    setSession(next: AuthSession) {
      loaded = true;
      session = next;
      persist();
      emit();
    },
    clearSession() {
      loaded = true;
      session = null;
      persist();
      emit();
    },
    getAccessToken(): string | null {
      loadOnce();
      return session?.tokens.accessToken ?? null;
    },
  };
}

export const authStore = createAuthStore();

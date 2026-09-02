import { apiFetch } from "@/lib/api-client";
import type { AuthSession, AuthUser } from "@/types/auth";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthService {
  login(email: string, password: string): Promise<AuthSession>;
}

/**
 * Talks to the real API — there was never a login feature to mock, so
 * unlike `product-service.ts` there's no `MockAuthService` to swap out.
 */
export class RestAuthService implements AuthService {
  async login(email: string, password: string): Promise<AuthSession> {
    const data = await apiFetch<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });

    return {
      user: data.user,
      tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
    };
  }
}

export const authService: AuthService = new RestAuthService();

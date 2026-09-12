import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type { AdminUserQuery, ApiUser, CreateAdminPayload } from "@/types/users";

export interface UserService {
  getUsers(query?: AdminUserQuery): Promise<PaginatedResult<ApiUser>>;
  getUser(id: string): Promise<ApiUser>;
  /** `POST /users/admins` — ADMIN o SUPER_ADMIN. Nace sin verificar, como cualquier signup. */
  createAdmin(payload: CreateAdminPayload): Promise<ApiUser>;
  /** `POST /users/:id/promote-to-admin` — agrega ADMIN a los roles existentes, no los reemplaza. */
  promoteToAdmin(id: string): Promise<ApiUser>;
  /** `PATCH /users/:id/email` — SUPER_ADMIN únicamente (la API 403s a un ADMIN normal). Invalida todas las sesiones del usuario afectado. */
  changeUserEmail(id: string, email: string): Promise<ApiUser>;
}

export class RestUserService implements UserService {
  async getUsers(query: AdminUserQuery = {}): Promise<PaginatedResult<ApiUser>> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    const qs = params.toString();
    return apiFetch<PaginatedResult<ApiUser>>(`/v1/users${qs ? `?${qs}` : ""}`);
  }

  async getUser(id: string): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/v1/users/${id}`);
  }

  async createAdmin(payload: CreateAdminPayload): Promise<ApiUser> {
    return apiFetch<ApiUser>("/v1/users/admins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async promoteToAdmin(id: string): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/v1/users/${id}/promote-to-admin`, {
      method: "POST",
    });
  }

  async changeUserEmail(id: string, email: string): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/v1/users/${id}/email`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });
  }
}

export const userService: UserService = new RestUserService();

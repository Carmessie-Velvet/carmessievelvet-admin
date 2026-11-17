import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type { AdminUserQuery, ApiUser, CreateAdminPayload, UserRole } from "@/types/users";

export interface UserService {
  getUsers(query?: AdminUserQuery): Promise<PaginatedResult<ApiUser>>;
  getUser(id: string): Promise<ApiUser>;
  /** `POST /users/admins` — ADMIN o SUPER_ADMIN. Siempre crea con roles `["ADMIN"]` exactos (ni siquiera `USER`) — la API no acepta elegir el rol acá. Nace sin verificar, como cualquier signup. */
  createAdmin(payload: CreateAdminPayload): Promise<ApiUser>;
  /** `POST /users/:id/promote-to-admin` — agrega ADMIN a los roles existentes, no los reemplaza. */
  promoteToAdmin(id: string): Promise<ApiUser>;
  /**
   * `POST /roles/assign` — SUPER_ADMIN únicamente. ⚠️ **Reemplaza el arreglo
   * completo de roles**, no agrega uno — el caller siempre debe mandar la
   * lista final completa (ver `GRANTABLE_ROLES`/uso en `/usuarios`, que
   * arma esa lista a mano antes de llamar esto, nunca un solo rol suelto).
   */
  assignRoles(userId: string, roles: UserRole[]): Promise<UserRole[]>;
  /** `PATCH /users/:id/email` — SUPER_ADMIN únicamente (la API 403s a un ADMIN normal). Invalida todas las sesiones del usuario afectado. */
  changeUserEmail(id: string, email: string): Promise<ApiUser>;
  /**
   * `PATCH /users/:id/role` (ADMIN o SUPER_ADMIN) — cambia el rol de back-office
   * (`ADMIN`/`MARKETING`/`SALES`) de una cuenta de staff y conserva sus demás
   * roles; con `USER` le quita todos los de staff y la deja como cliente normal. A diferencia de `assignRoles`, no reemplaza el arreglo completo ni
   * pide SUPER_ADMIN. 409 si no tiene rol de staff, si es la propia cuenta o
   * un SUPER_ADMIN; 400 si ya tiene ese rol.
   */
  changeStaffRole(id: string, role: UserRole): Promise<ApiUser>;
  /**
   * `DELETE /users/:id` (ADMIN o SUPER_ADMIN) — borrado lógico de una cuenta
   * de staff creada por error: sale del listado, ya no puede entrar y su
   * correo queda libre. Solo cuentas solo-de-staff (sin rol `USER`); 409 para
   * un cliente, un SUPER_ADMIN o la propia cuenta.
   */
  deleteStaffAccount(id: string): Promise<boolean>;
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

  async assignRoles(userId: string, roles: UserRole[]): Promise<UserRole[]> {
    const result = await apiFetch<{ roles: UserRole[] }>("/v1/roles/assign", {
      method: "POST",
      body: JSON.stringify({ userId, roles }),
    });
    return result.roles;
  }

  async changeUserEmail(id: string, email: string): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/v1/users/${id}/email`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });
  }

  async changeStaffRole(id: string, role: UserRole): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/v1/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async deleteStaffAccount(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/users/${id}`, { method: "DELETE" });
  }
}

export const userService: UserService = new RestUserService();

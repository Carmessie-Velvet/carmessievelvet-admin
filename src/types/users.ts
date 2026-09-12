/**
 * `GET /api/v1/users` (paginado) y sus acciones — administración de cuentas
 * (`ADMIN`/`SUPER_ADMIN`), no el perfil propio del admin logueado (eso sigue
 * viviendo en `types/auth.ts`). Ver "User administration" en
 * `../carmessievelvet-api/src/modules/auth/CLAUDE.md`.
 */
export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  USER: "Cliente",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: UserRole[];
  enabled: boolean;
  /** `null` = todavía no verifica su correo. */
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface AdminUserQuery {
  page?: number;
  limit?: number;
  /** ILIKE sobre el email, del lado de la API. */
  search?: string;
  role?: UserRole;
}

/** `POST /users/admins` — mismo shape que el signup normal (`SignupDto`), la cuenta nace sin verificar. */
export interface CreateAdminPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

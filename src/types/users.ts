/**
 * `GET /api/v1/users` (paginado) y sus acciones — administración de cuentas
 * (`ADMIN`/`SUPER_ADMIN`), no el perfil propio del admin logueado (eso sigue
 * viviendo en `types/auth.ts`). Ver "User administration" en
 * `../carmessievelvet-api/src/modules/auth/CLAUDE.md`.
 */
export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN" | "MARKETING" | "SALES" | "SUPPORT";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  USER: "Cliente",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
  MARKETING: "Marketing",
  SALES: "Ventas",
  SUPPORT: "Atención al cliente",
};

/**
 * Roles que un SUPER_ADMIN puede otorgar desde `/usuarios` (crear cuenta o
 * asignar rol a una existente) — nunca incluye `SUPER_ADMIN` ni `USER` acá:
 * `SUPER_ADMIN` no se otorga desde esta pantalla (ver `POST /roles/assign`
 * directo si algún día hace falta) y `USER` es el rol base con el que ya
 * nace cualquier cuenta, no algo que se "otorgue".
 */
export const GRANTABLE_ROLES: UserRole[] = ["ADMIN", "MARKETING", "SALES", "SUPPORT"];

/**
 * Roles de back-office: los que, en la API, pueden **operar** órdenes (cambiar
 * estatus, cancelar/reembolsar, generar guías…) además de ver el catálogo, etc.
 * Mismo nombre/criterio que `BACKOFFICE_ROLES` en `carmessievelvet-api`.
 * **No incluye `SUPPORT`** (atención al cliente) a propósito: ese rol solo ve
 * órdenes, deja notas, reenvía el correo y descarga la guía — ver `PANEL_ROLES`.
 */
export const BACKOFFICE_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MARKETING", "SALES"];

/**
 * Todo rol con acceso a este panel: los de back-office más `SUPPORT`, que
 * entra pero solo ve «Órdenes» (y solo en lectura + notas/reenvío/guía — ver
 * `canOperateOrders` en `lib/nav-access.ts`). Es lo que decide si el login
 * acepta a la cuenta.
 */
export const PANEL_ROLES: readonly string[] = [...BACKOFFICE_ROLES, "SUPPORT"];

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

import type { UserRole } from "@/types/users";

/** Ven todo el panel — sin cambios respecto a como funcionaba antes de MARKETING/SALES. */
export const FULL_ACCESS_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

interface NavRoute {
  href: string;
  roles: UserRole[];
}

/**
 * Única fuente de verdad de "qué rol puede ver/entrar a qué pantalla" —
 * `AppSidebar.tsx` la usa para filtrar el menú y `AuthGuard.tsx` para
 * redirigir si alguien navega a mano a una ruta que su rol no puede ver,
 * así el menú y el acceso real nunca quedan desincronizados. Pedido
 * explícito de la clienta: MARKETING solo ve Productos/Cupones/Descuentos,
 * SALES solo ve Órdenes/Devoluciones — el resto del panel (Inicio,
 * Categorías, Tags, Métodos de envío, Envíos automatizados, Usuarios,
 * Configuración, y el Dashboard con cifras financieras) se queda
 * ADMIN/SUPER_ADMIN únicamente.
 *
 * ⚠️ Esto es solo la capa de UI/navegación de este admin — la API todavía
 * no separa el acceso de MARKETING/SALES por dominio a nivel de rutas
 * (ambos comparten `BACKOFFICE_ROLES`, con acceso real a todo el catálogo +
 * órdenes + envíos, ver `carmessievelvet-api`'s `role-groups.const.ts`), así
 * que esto no es la barrera de seguridad real, solo evita que alguien con
 * esos roles vea u opere por accidente pantallas que no le corresponden
 * desde este panel.
 */
const NAV_ROUTES: NavRoute[] = [
  { href: "/", roles: FULL_ACCESS_ROLES },
  { href: "/inicio", roles: FULL_ACCESS_ROLES },
  { href: "/productos", roles: [...FULL_ACCESS_ROLES, "MARKETING"] },
  { href: "/categorias", roles: FULL_ACCESS_ROLES },
  { href: "/ordenes", roles: [...FULL_ACCESS_ROLES, "SALES"] },
  { href: "/devoluciones", roles: [...FULL_ACCESS_ROLES, "SALES"] },
  { href: "/cupones", roles: [...FULL_ACCESS_ROLES, "MARKETING"] },
  { href: "/descuentos", roles: [...FULL_ACCESS_ROLES, "MARKETING"] },
  { href: "/tags", roles: FULL_ACCESS_ROLES },
  { href: "/metodos-envio", roles: FULL_ACCESS_ROLES },
  { href: "/envios-automatizados", roles: FULL_ACCESS_ROLES },
  { href: "/usuarios", roles: FULL_ACCESS_ROLES },
  { href: "/configuracion", roles: FULL_ACCESS_ROLES },
];

function matchRoute(pathname: string): NavRoute | undefined {
  // Coincidencia exacta para "/" (si no, cualquier ruta la matchearía por
  // el prefijo vacío), por prefijo para el resto — mismo criterio que ya
  // usa `AppSidebar.tsx` para resaltar el ítem activo.
  return NAV_ROUTES.find((r) =>
    r.href === "/" ? pathname === "/" : pathname.startsWith(r.href)
  );
}

export function canAccessRoute(pathname: string, roles: readonly string[]): boolean {
  const route = matchRoute(pathname);
  if (!route) return true; // ruta no listada (ej. /login) — no es de este set, no la bloquea este chequeo.
  return route.roles.some((r) => roles.includes(r));
}

/** El primer ítem del menú que ese conjunto de roles puede ver — a dónde mandarlo si cae en una ruta que no le corresponde. */
export function getDefaultRoute(roles: readonly string[]): string {
  const first = NAV_ROUTES.find((r) => r.roles.some((role) => roles.includes(role)));
  return first?.href ?? "/login";
}

export function isNavItemVisible(href: string, roles: readonly string[]): boolean {
  const route = NAV_ROUTES.find((r) => r.href === href);
  if (!route) return false;
  return route.roles.some((r) => roles.includes(r));
}

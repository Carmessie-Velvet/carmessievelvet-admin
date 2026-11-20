import { BACKOFFICE_ROLES, type UserRole } from "@/types/users";

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
 * ADMIN/SUPER_ADMIN únicamente. SUPPORT («Atención al cliente») solo ve
 * Órdenes — no Devoluciones: aprobar o rechazar una es una decisión de
 * operación, y a ellas solo les toca ver la orden, reenviar el correo, dejar
 * notas y descargar la guía (ver `canOperateOrders`).
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
  { href: "/banner", roles: FULL_ACCESS_ROLES },
  { href: "/testimonios", roles: FULL_ACCESS_ROLES },
  { href: "/productos", roles: [...FULL_ACCESS_ROLES, "MARKETING"] },
  { href: "/categorias", roles: FULL_ACCESS_ROLES },
  { href: "/ordenes", roles: [...FULL_ACCESS_ROLES, "SALES", "SUPPORT"] },
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

/**
 * ¿Puede **operar** órdenes (cambiar estatus, cancelar/reembolsar, cotizar y
 * generar guías, corregir tallas…)? Es lo que, en la API, abre `BACKOFFICE_ROLES`;
 * `SUPPORT` queda fuera. Con `false`, el detalle de una orden esconde todos
 * esos botones y no pide a la API lo que ese rol no puede ver. Solo para no
 * ofrecer de más: la autoridad real es el 403 de la API.
 */
export function canOperateOrders(roles: readonly string[]): boolean {
  return BACKOFFICE_ROLES.some((role) => roles.includes(role));
}

/**
 * `GET/PATCH /api/v1/settings` — configuración global de marca y calendario
 * de la tienda, fila única (singleton). `closedDays` son números de día
 * `0`-`6` (`0` = domingo … `6` = sábado, misma convención que
 * `Date.getUTCDay()`) en los que el storefront rechaza compras nuevas
 * (`403 STORE_CLOSED_TODAY` en `POST /orders`) — `[]` (default) es abierto
 * todos los días. No puede cubrir los 7 días a la vez (la API lo rechaza
 * con `400`).
 */
export interface ApiAppSettings {
  displayName: string;
  logoUrl: string | null;
  updatedAt: string;
  closedDays: number[];
}

/** `PATCH /api/v1/settings` — ambos campos opcionales; `logoUrl` no se manda acá, solo vía `POST /settings/logo`. */
export interface UpdateApiAppSettingsPayload {
  displayName?: string;
  closedDays?: number[];
}

export interface ApiStoreOpensIn {
  seconds: number;
  /** Ya viene en español, listo para mostrar directo (ej. "9 horas 30 minutos"). */
  human: string;
}

/**
 * `GET /api/v1/store/status` (público) — resuelve `closedDays` contra "hoy"
 * en la zona horaria de la tienda. `nextOpenAt`/`opensIn` solo vienen
 * presentes cuando `open: false`.
 */
export interface ApiStoreStatus {
  open: boolean;
  /** 0 = domingo … 6 = sábado. */
  today: number;
  todayLabel: string;
  closedDays: number[];
  timezone: string;
  nextOpenAt: string | null;
  opensIn: ApiStoreOpensIn | null;
}

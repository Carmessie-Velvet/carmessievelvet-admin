/**
 * Una ventana de cierre por día de la semana (2026-09-24) — antes
 * `closedDays` era un simple arreglo de números de día (día completo
 * cerrado); ahora cada día cerrado trae también la hora en la que empieza y
 * termina esa ventana, así una tienda puede cerrar solo parte del día en
 * vez de forzosamente el día completo. `day` sigue la convención de
 * `Date.getUTCDay()` (`0` = domingo … `6` = sábado); `startTime`/`endTime`
 * son `"HH:mm"` en 24h, hora de la tienda (`timezone` en `ApiStoreStatus`),
 * `endTime` inclusivo al minuto — `"00:00"`-`"23:59"` es el día completo
 * cerrado. Como máximo una entrada por día (la API la rechaza si hay dos
 * para el mismo `day`, o si `startTime` es después de `endTime`).
 */
export interface ClosedDaySchedule {
  day: number;
  startTime: string;
  endTime: string;
}

/**
 * `GET/PATCH /api/v1/settings` — configuración global de marca y calendario
 * de la tienda, fila única (singleton). `closedDays` son las ventanas de
 * cierre (`[]`, default, es abierto todos los días) en las que el
 * storefront rechaza compras nuevas (`403 STORE_CLOSED_TODAY` en
 * `POST /orders`). No puede cubrir los 7 días a la vez (la API lo rechaza
 * con `400`).
 */
export interface ApiAppSettings {
  displayName: string;
  logoUrl: string | null;
  updatedAt: string;
  closedDays: ClosedDaySchedule[];
}

/** `PATCH /api/v1/settings` — ambos campos opcionales; `logoUrl` no se manda acá, solo vía `POST /settings/logo`. */
export interface UpdateApiAppSettingsPayload {
  displayName?: string;
  closedDays?: ClosedDaySchedule[];
}

export interface ApiStoreOpensIn {
  seconds: number;
  /** Ya viene en español, listo para mostrar directo (ej. "9 horas 30 minutos"). */
  human: string;
}

/**
 * `GET /api/v1/store/status` (público) — resuelve `closedDays` contra "ahora
 * mismo" en la zona horaria de la tienda. `nextOpenAt`/`opensIn` solo vienen
 * presentes cuando `open: false`.
 */
export interface ApiStoreStatus {
  open: boolean;
  /** 0 = domingo … 6 = sábado. */
  today: number;
  todayLabel: string;
  closedDays: ClosedDaySchedule[];
  timezone: string;
  nextOpenAt: string | null;
  opensIn: ApiStoreOpensIn | null;
}

/**
 * Catálogo de métodos de envío (`/api/v1/shipping-methods`, ADMIN/SUPER_ADMIN).
 * `priceMinor` está en centavos (mismo formato que Stripe) — se convierte a
 * pesos solo para mostrarlo/editarlo en el form.
 */
export interface ApiShippingMethod {
  id: string;
  code: string;
  priceMinor: number;
  description?: string;
}

/**
 * `code` es inmutable una vez creado (la API no tiene un endpoint para
 * cambiarlo) — si quedó mal, se crea uno nuevo en vez de corregir este.
 */
export interface CreateApiShippingMethodPayload {
  code: string;
  priceMinor: number;
  description?: string;
}

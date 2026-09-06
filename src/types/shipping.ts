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

/** `GET /store/mx-states` (público) — catálogo de estados con el code que usa Enviatodo (no el de SEPOMEX/CFDI). */
export interface MxState {
  code: string;
  name: string;
}

/**
 * Dirección remitente/bodega (`GET`/`PUT /settings/shipping-origin`) que usa
 * la generación automática de guías — sin esto configurado, generar una
 * guía siempre da 400. Singleton: no tiene id, se reemplaza completo.
 */
export interface ApiShippingOrigin {
  name: string;
  company?: string;
  phone: string;
  email: string;
  street: string;
  extNumber: string;
  intNumber?: string;
  suburb: string;
  municipality: string;
  town: string;
  stateCode: string;
  postalCode: string;
  reference?: string;
}

/**
 * Catálogo de paquetes de Enviatodo (`GET /shipping/packages`) — dimensiones
 * y peso vienen tal cual las devuelve el proveedor, así que algunos campos
 * son opcionales (`EnviatodoPackageDto` del backend los marca así porque su
 * forma real no está 100% documentada). `isDefault` lo calcula la API
 * comparando contra `SHIPPING_ENVIATODO_DEFAULT_PACKAGE_ID`.
 */
export interface ApiEnviatodoPackage {
  id?: string;
  name?: string;
  package_content?: string;
  height?: number;
  width?: number;
  length?: number;
  weight?: number;
  isDefault: boolean;
}

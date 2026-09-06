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
 * Catálogo de paquetes de Enviatodo (`GET/POST /shipping/packages`) — es un
 * passthrough de lo que devuelve el proveedor, así que trae más campos de
 * los que el admin necesita mostrar y los que "deberían" ser número
 * (`height`/`width`/`length`/`weight`/etc.) llegan como **string**
 * (verificado contra sandbox, ver CLAUDE.md de la API) — nunca hacer
 * aritmética con ellos sin convertir primero. `isDefault` lo calcula la API
 * comparando contra `SHIPPING_ENVIATODO_DEFAULT_PACKAGE_ID` — ese paquete no
 * se puede borrar (`DELETE` responde 409).
 */
export interface ApiEnviatodoPackage {
  id?: string;
  name?: string;
  package_content?: string;
  height?: string;
  width?: string;
  length?: string;
  weight?: string;
  real_weight?: string;
  volumetric_weight?: string;
  bill_weight?: string;
  product_type?: string;
  unit_type?: string;
  amount_pkg?: string;
  default_pkg?: string;
  created_at?: string;
  updated_at?: string;
  isDefault: boolean;
}

/**
 * `POST /shipping/packages` — el admin solo manda las dimensiones físicas;
 * `real_weight`/`volumetric_weight`/`bill_weight` los calcula el backend.
 * No existe un `PATCH` (Enviatodo no lo expone de forma confiable) — "editar"
 * un paquete es crear uno nuevo con este payload y borrar el anterior.
 */
export interface CreateApiEnviatodoPackagePayload {
  name: string;
  packageContent: string;
  height: number;
  width: number;
  length: number;
  weight: number;
  amountPkg?: number;
}

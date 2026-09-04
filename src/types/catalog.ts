/**
 * Shapes returned by the real Carmessie API (`carmessievelvet-api`). Color
 * is a single free-text field per product (not a variant axis) — a product
 * that comes in two colors is modeled as two separate products/SKUs.
 */
export interface ApiCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ApiTag {
  id: string;
  name: string;
}

export interface ApiProductVariant {
  id: string;
  size: string;
  stock: number;
  /** Manual override — never purchasable while true, regardless of stock/madeToOrder. */
  soldOut: boolean;
  sku?: string;
}

export interface ApiAppliedDiscount {
  id: string;
  name?: string;
  percentage: number;
  endsAt?: string;
}

export interface ApiProduct {
  id: string;
  /** Also the identifier used in the product URL (`/products/:sku`). */
  sku: string;
  name: string;
  description?: string;
  price: number;
  color?: string;
  active: boolean;
  /**
   * Sobre pedido: no se rastrea inventario, se puede vender indefinidamente
   * hasta que una talla se marque `soldOut`.
   */
  madeToOrder: boolean;
  images: string[];
  category: ApiCategory;
  tags: ApiTag[];
  variants: ApiProductVariant[];
  /** Suma de stock por talla, o `null` si el producto es sobre pedido. */
  totalStock: number | null;
  finalPrice: number;
  appliedDiscount?: ApiAppliedDiscount;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateApiProductVariant {
  size: string;
  /** Se omite (en todas las variantes) para vender sobre pedido, sin stock. */
  stock?: number;
  /** Override manual: esta talla nunca se puede comprar mientras sea true. */
  soldOut?: boolean;
}

/**
 * `POST /api/v1/products` no longer accepts `images` in the body — images
 * are uploaded separately via `uploadProductImages` after creation, using
 * the created product's `sku` (not its `id`) in the URL.
 */
export interface CreateApiProductPayload {
  name: string;
  description?: string;
  price: number;
  /** Optional — the API auto-generates one (`SKU-XXXXXXXX`) if omitted. */
  sku?: string;
  color?: string;
  /**
   * Si se omite, la API lo infiere como `true` cuando ninguna variante trae
   * `stock`. Este admin siempre lo manda explícito para no depender de esa
   * inferencia.
   */
  madeToOrder?: boolean;
  categoryId: string;
  tagIds?: string[];
  variants: CreateApiProductVariant[];
}

/**
 * `PATCH /api/v1/products/:sku` — all fields optional, only sent ones are
 * changed. `variants` (like on create) replaces the full set: sizes left
 * out are soft-deleted. Images are never part of this payload — they go
 * through the separate `/products/:sku/images` endpoints below.
 */
export interface UpdateApiProductPayload {
  name?: string;
  description?: string;
  price?: number;
  sku?: string;
  color?: string;
  active?: boolean;
  /** A diferencia de create, nunca se infiere — solo cambia si se manda. */
  madeToOrder?: boolean;
  categoryId?: string;
  tagIds?: string[];
  variants?: CreateApiProductVariant[];
}

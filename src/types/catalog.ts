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
  images: string[];
  category: ApiCategory;
  tags: ApiTag[];
  variants: ApiProductVariant[];
  totalStock: number;
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
  stock: number;
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
  categoryId?: string;
  tagIds?: string[];
  variants?: CreateApiProductVariant[];
}

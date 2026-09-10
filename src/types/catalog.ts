/**
 * Shapes returned by the real Carmessie API (`carmessievelvet-api`). Color
 * es un campo libre — a nivel producto para uno `SIMPLE` (un color por
 * SKU, dos colores del mismo diseño son dos productos aparte), o a nivel
 * variante dentro de cada prenda para uno `SET` (ver `ApiProductComponent`).
 */
export type CategoryType = "SIMPLE" | "SET";

/**
 * `type` decide la forma de **todo** producto dentro de la categoría —
 * nunca el `name` de la categoría. `SIMPLE`: el producto manda `variants`
 * (una talla, un color propio). `SET`: el producto se compone de 2+
 * prendas (`components`), cada una con su propio color/stock por talla.
 */
export interface ApiCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  type: CategoryType;
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
  /**
   * Color de esta variante puntual — sólo tiene valor real dentro de
   * `ApiProductComponent.variants` (una prenda de un set). `null`/ausente
   * en una variante de producto `SIMPLE`, donde el color vive en
   * `ApiProduct.color` en su lugar.
   */
  color?: string | null;
}

/**
 * Una "prenda" de un producto `category.type: "SET"` (ej. "Top", "Panty")
 * — tiene sus propias variantes talla×color y su propio stock/agotado. El
 * precio sigue siendo uno solo, el del producto completo.
 */
export interface ApiProductComponent {
  id: string;
  name: string;
  position: number;
  variants: ApiProductVariant[];
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
  /** A lo más un video por producto — `null` si no tiene. Ver `uploadProductVideo`/`deleteProductVideo`. */
  videoUrl: string | null;
  category: ApiCategory;
  tags: ApiTag[];
  /** Vacío para un producto `category.type: "SET"` — ver `components`. */
  variants: ApiProductVariant[];
  /** Vacío para un producto `category.type: "SIMPLE"` — ver `variants`. */
  components: ApiProductComponent[];
  /**
   * Suma de stock por talla (incluye las variantes de cada prenda en un
   * set), o `null` si el producto es sobre pedido.
   */
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
  /** Solo tiene efecto dentro de `CreateApiProductComponent.variants` — ignorado a nivel producto. */
  color?: string;
}

/** Una prenda al crear/editar un producto `category.type: "SET"`. */
export interface CreateApiProductComponent {
  name: string;
  position?: number;
  variants: CreateApiProductVariant[];
}

/**
 * `POST /api/v1/products` no longer accepts `images` in the body — images
 * are uploaded separately via `uploadProductImages` after creation, using
 * the created product's `sku` (not its `id`) in the URL.
 *
 * Manda exactamente uno de `variants`/`components`, nunca ambos ni ninguno
 * — cuál corresponde lo decide el `type` de la categoría elegida
 * (`categoryId`), nunca su nombre.
 */
export interface CreateApiProductPayload {
  name: string;
  description?: string;
  price: number;
  /** Optional — the API auto-generates one (`SKU-XXXXXXXX`) if omitted. */
  sku?: string;
  /** Ignorado (la API lo rechaza) si la categoría es `SET` — el color vive por prenda ahí. */
  color?: string;
  /**
   * Si se omite, la API lo infiere como `true` cuando ninguna variante trae
   * `stock`. Este admin siempre lo manda explícito para no depender de esa
   * inferencia.
   */
  madeToOrder?: boolean;
  categoryId: string;
  tagIds?: string[];
  /** Requerido y el único válido si la categoría es `SIMPLE`. */
  variants?: CreateApiProductVariant[];
  /** Requerido (mín. 2) y el único válido si la categoría es `SET`. */
  components?: CreateApiProductComponent[];
}

/**
 * `PATCH /api/v1/products/:sku` — all fields optional, only sent ones are
 * changed. `variants`/`components` (like on create) replace the full set:
 * sizes/prendas left out are soft-deleted. Images are never part of this
 * payload — they go through the separate `/products/:sku/images` endpoints
 * below.
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
  components?: CreateApiProductComponent[];
}

/** `POST /api/v1/categories` — `type` default `SIMPLE` si se omite. */
export interface CreateApiCategoryPayload {
  name: string;
  description?: string;
  active?: boolean;
  type?: CategoryType;
}

/**
 * `PATCH /api/v1/categories/:id` — todos opcionales. Cambiar `type` (o
 * `DELETE`) da `409` mientras la categoría todavía tenga productos.
 */
export interface UpdateApiCategoryPayload {
  name?: string;
  description?: string;
  active?: boolean;
  type?: CategoryType;
}

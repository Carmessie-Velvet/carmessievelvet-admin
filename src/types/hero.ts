/**
 * `carmessievelvet-api`'s hero module (`GET/POST/PATCH/DELETE /v1/heroes`,
 * `POST/DELETE /v1/heroes/:id/image`). Naming carries over from the API
 * verbatim even though it reads oddly next to the storefront's own copy:
 * `title` is the small eyebrow label ("NUEVA COLECCIÓN"), `content` is the
 * big headline ("Vestir con la textura de lo memorable."). Kept as-is
 * instead of renaming on this side, so a `PATCH` body never needs a
 * translation layer.
 */
export interface ApiHero {
  id: string;
  title: string | null;
  content: string | null;
  buttonLabel: string | null;
  buttonPath: string | null;
  showTitle: boolean;
  showContent: boolean;
  showButton: boolean;
  /** Desktop, ~16:9. */
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** Mobile, ~4:5 — recorte independiente, no un crop CSS de `imageUrl`. Ambas imágenes son obligatorias para poder activar la portada. */
  imageMobileUrl: string | null;
  imageMobileWidth: number | null;
  imageMobileHeight: number | null;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

/** Cuál de las dos imágenes de la portada afecta `POST`/`DELETE /heroes/:id/image?variant=...`. */
export type HeroImageVariant = "desktop" | "mobile";

/**
 * Created with no image and `active: false` — the only way to set those is
 * the dedicated image-upload and status endpoints below.
 */
export interface CreateApiHeroPayload {
  title?: string;
  content?: string;
  buttonLabel?: string;
  buttonPath?: string;
  showTitle?: boolean;
  showContent?: boolean;
  showButton?: boolean;
  sortOrder?: number;
}

export type UpdateApiHeroPayload = CreateApiHeroPayload;

import { apiFetch } from "@/lib/api-client";
import type {
  ApiCategory,
  ApiProduct,
  ApiTag,
  CreateApiProductPayload,
  PaginatedResult,
  UpdateApiProductPayload,
} from "@/types/catalog";

/**
 * The real product catalog. `getProducts`/`getCategories` back the read-only
 * list at `/productos`; `createProduct`/`uploadProductImages` back the
 * "Nuevo producto" form; `getProduct`/`updateProduct`/`reorderProductImages`/
 * `deleteProductImage` back the edit form. Single-product routes are keyed
 * by `sku`, not `id` — the API switched to SKU as the URL identifier.
 */
export interface CatalogService {
  getProducts(): Promise<ApiProduct[]>;
  getProduct(sku: string): Promise<ApiProduct>;
  getCategories(): Promise<ApiCategory[]>;
  createProduct(payload: CreateApiProductPayload): Promise<ApiProduct>;
  updateProduct(
    sku: string,
    payload: UpdateApiProductPayload
  ): Promise<ApiProduct>;
  uploadProductImages(sku: string, files: File[]): Promise<string[]>;
  reorderProductImages(sku: string, images: string[]): Promise<string[]>;
  deleteProductImage(sku: string, url: string): Promise<string[]>;
  deleteProduct(sku: string): Promise<boolean>;
  getTags(): Promise<ApiTag[]>;
  createTag(name: string): Promise<ApiTag>;
  updateTag(id: string, name: string): Promise<ApiTag>;
  deleteTag(id: string): Promise<boolean>;
}

export class RestCatalogService implements CatalogService {
  async getProducts(): Promise<ApiProduct[]> {
    // Admin's catalog is small for now; one page of the API's max page
    // size (100) covers it without needing pagination UI yet.
    const result = await apiFetch<PaginatedResult<ApiProduct>>(
      "/v1/products?limit=100"
    );
    return result.items;
  }

  async getProduct(sku: string): Promise<ApiProduct> {
    return apiFetch<ApiProduct>(`/v1/products/${sku}`);
  }

  async getCategories(): Promise<ApiCategory[]> {
    return apiFetch<ApiCategory[]>("/v1/categories");
  }

  async createProduct(payload: CreateApiProductPayload): Promise<ApiProduct> {
    return apiFetch<ApiProduct>("/v1/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(
    sku: string,
    payload: UpdateApiProductPayload
  ): Promise<ApiProduct> {
    return apiFetch<ApiProduct>(`/v1/products/${sku}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async uploadProductImages(sku: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    const result = await apiFetch<{ productId: string; images: string[] }>(
      `/v1/products/${sku}/images`,
      { method: "POST", body: formData }
    );
    return result.images;
  }

  async reorderProductImages(sku: string, images: string[]): Promise<string[]> {
    const result = await apiFetch<{ productId: string; images: string[] }>(
      `/v1/products/${sku}/images`,
      { method: "PATCH", body: JSON.stringify({ images }) }
    );
    return result.images;
  }

  async deleteProductImage(sku: string, url: string): Promise<string[]> {
    const result = await apiFetch<{ productId: string; images: string[] }>(
      `/v1/products/${sku}/images?url=${encodeURIComponent(url)}`,
      { method: "DELETE" }
    );
    return result.images;
  }

  async deleteProduct(sku: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/products/${sku}`, { method: "DELETE" });
  }

  async getTags(): Promise<ApiTag[]> {
    return apiFetch<ApiTag[]>("/v1/tags");
  }

  async createTag(name: string): Promise<ApiTag> {
    return apiFetch<ApiTag>("/v1/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updateTag(id: string, name: string): Promise<ApiTag> {
    return apiFetch<ApiTag>(`/v1/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async deleteTag(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/tags/${id}`, { method: "DELETE" });
  }
}

export const catalogService: CatalogService = new RestCatalogService();

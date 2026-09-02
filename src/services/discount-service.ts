import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type {
  ApiProductDiscount,
  CreateProductDiscountPayload,
  UpdateProductDiscountPayload,
} from "@/types/discounts";

/**
 * Direct, code-free % discounts applied to a set of products — different
 * from coupons (which need a code entered at checkout). Reflected
 * immediately on `ApiProduct.finalPrice`/`appliedDiscount`, no checkout
 * step needed for it to take effect.
 */
export interface DiscountService {
  getDiscounts(): Promise<ApiProductDiscount[]>;
  createDiscount(
    payload: CreateProductDiscountPayload
  ): Promise<ApiProductDiscount>;
  updateDiscount(
    id: string,
    payload: UpdateProductDiscountPayload
  ): Promise<ApiProductDiscount>;
  setDiscountStatus(id: string, enabled: boolean): Promise<ApiProductDiscount>;
  deleteDiscount(id: string): Promise<boolean>;
}

export class RestDiscountService implements DiscountService {
  async getDiscounts(): Promise<ApiProductDiscount[]> {
    const result = await apiFetch<PaginatedResult<ApiProductDiscount>>(
      "/v1/product-discounts?limit=100"
    );
    return result.items;
  }

  async createDiscount(
    payload: CreateProductDiscountPayload
  ): Promise<ApiProductDiscount> {
    return apiFetch<ApiProductDiscount>("/v1/product-discounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateDiscount(
    id: string,
    payload: UpdateProductDiscountPayload
  ): Promise<ApiProductDiscount> {
    return apiFetch<ApiProductDiscount>(`/v1/product-discounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async setDiscountStatus(
    id: string,
    enabled: boolean
  ): Promise<ApiProductDiscount> {
    return apiFetch<ApiProductDiscount>(`/v1/product-discounts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  }

  async deleteDiscount(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/product-discounts/${id}`, {
      method: "DELETE",
    });
  }
}

export const discountService: DiscountService = new RestDiscountService();

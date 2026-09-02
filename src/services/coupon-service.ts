import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type {
  ApiCoupon,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "@/types/coupons";

/**
 * Coupons need a code entered at checkout (unlike product discounts, which
 * apply automatically) — see `discount-service.ts` for the code-free kind.
 */
export interface CouponService {
  getCoupons(): Promise<ApiCoupon[]>;
  createCoupon(payload: CreateCouponPayload): Promise<ApiCoupon>;
  updateCoupon(id: string, payload: UpdateCouponPayload): Promise<ApiCoupon>;
  setCouponStatus(id: string, enabled: boolean): Promise<ApiCoupon>;
  deleteCoupon(id: string): Promise<boolean>;
}

export class RestCouponService implements CouponService {
  async getCoupons(): Promise<ApiCoupon[]> {
    const result = await apiFetch<PaginatedResult<ApiCoupon>>(
      "/v1/coupons?limit=100"
    );
    return result.items;
  }

  async createCoupon(payload: CreateCouponPayload): Promise<ApiCoupon> {
    return apiFetch<ApiCoupon>("/v1/coupons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateCoupon(
    id: string,
    payload: UpdateCouponPayload
  ): Promise<ApiCoupon> {
    return apiFetch<ApiCoupon>(`/v1/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async setCouponStatus(id: string, enabled: boolean): Promise<ApiCoupon> {
    return apiFetch<ApiCoupon>(`/v1/coupons/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  }

  async deleteCoupon(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/coupons/${id}`, { method: "DELETE" });
  }
}

export const couponService: CouponService = new RestCouponService();

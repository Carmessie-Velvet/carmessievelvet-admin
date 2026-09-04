import { apiFetch } from "@/lib/api-client";
import type {
  ApiShippingMethod,
  CreateApiShippingMethodPayload,
} from "@/types/shipping";

export interface ShippingMethodService {
  getShippingMethods(): Promise<ApiShippingMethod[]>;
  createShippingMethod(
    payload: CreateApiShippingMethodPayload
  ): Promise<ApiShippingMethod>;
  updateShippingMethodPrice(
    id: string,
    priceMinor: number
  ): Promise<ApiShippingMethod>;
  deleteShippingMethod(id: string): Promise<boolean>;
}

export class RestShippingMethodService implements ShippingMethodService {
  async getShippingMethods(): Promise<ApiShippingMethod[]> {
    return apiFetch<ApiShippingMethod[]>("/v1/shipping-methods");
  }

  async createShippingMethod(
    payload: CreateApiShippingMethodPayload
  ): Promise<ApiShippingMethod> {
    return apiFetch<ApiShippingMethod>("/v1/shipping-methods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateShippingMethodPrice(
    id: string,
    priceMinor: number
  ): Promise<ApiShippingMethod> {
    return apiFetch<ApiShippingMethod>(`/v1/shipping-methods/${id}/price`, {
      method: "PATCH",
      body: JSON.stringify({ priceMinor }),
    });
  }

  async deleteShippingMethod(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/shipping-methods/${id}`, {
      method: "DELETE",
    });
  }
}

export const shippingMethodService: ShippingMethodService =
  new RestShippingMethodService();

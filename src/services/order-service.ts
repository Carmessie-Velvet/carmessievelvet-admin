import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type { ApiOrder, OrderStatus } from "@/types/orders";

export interface OrderService {
  getOrders(): Promise<ApiOrder[]>;
  getOrder(id: string): Promise<ApiOrder>;
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<ApiOrder>;
  cancelOrder(id: string, reason?: string): Promise<ApiOrder>;
}

export class RestOrderService implements OrderService {
  async getOrders(): Promise<ApiOrder[]> {
    // Filtering (status/email/orderNumber) is done client-side over this
    // list, same pattern as the product catalog — the store is small enough
    // that one page (max 100) covers it without a filtered-refetch flow.
    const result = await apiFetch<PaginatedResult<ApiOrder>>(
      "/v1/orders?limit=100"
    );
    return result.items;
  }

  async getOrder(id: string): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}`);
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, trackingNumber }),
    });
  }

  async cancelOrder(id: string, reason?: string): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }
}

export const orderService: OrderService = new RestOrderService();

import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type { ApiOrder, ApiOrderShipment, OrderStatus } from "@/types/orders";

export interface OrderService {
  getOrders(): Promise<ApiOrder[]>;
  getOrder(id: string): Promise<ApiOrder>;
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<ApiOrder>;
  cancelOrder(id: string, reason?: string): Promise<ApiOrder>;
  /**
   * Genera una guía automática Enviatodo/Estafeta. Solo aplica a órdenes
   * `PAID`/`PROCESSING` cuyo `shippingMethod` esté automatizado (`EXPRESS`
   * por defecto) — la API rechaza cualquier otro caso con un mensaje ya
   * pensado para mostrarse tal cual (ver `ApiError.message`).
   */
  createShipment(id: string, packageId?: string): Promise<ApiOrderShipment>;
  /** Descarga el PDF de la guía — se pide al proveedor en cada llamada, nunca queda cacheado. */
  downloadShipmentLabel(id: string): Promise<Blob>;
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

  async createShipment(
    id: string,
    packageId?: string
  ): Promise<ApiOrderShipment> {
    return apiFetch<ApiOrderShipment>(`/v1/orders/${id}/shipment`, {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });
  }

  async downloadShipmentLabel(id: string): Promise<Blob> {
    return apiFetchBlob(`/v1/orders/${id}/shipment/label`);
  }
}

export const orderService: OrderService = new RestOrderService();

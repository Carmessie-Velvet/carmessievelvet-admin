import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type {
  ApiOrder,
  ApiOrderShipment,
  OrderStatus,
  RefundMode,
  ReturnRequestStatus,
} from "@/types/orders";

export interface CancelOrderOptions {
  /** Default `FULL` — se ignora del todo si la orden nunca se pagó (`PENDING`). */
  refundMode?: RefundMode;
  /** Requerido (y solo usado) cuando `refundMode` es `PARTIAL` — decimal en pesos. */
  amount?: number;
}

export interface OrderService {
  getOrders(): Promise<ApiOrder[]>;
  getOrder(id: string): Promise<ApiOrder>;
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    trackingNumber?: string,
    /** Sobreescribe `ApiOrder.carrier` solo para esta orden — típicamente junto con `trackingNumber` al pasar a `SHIPPED`. */
    carrier?: string
  ): Promise<ApiOrder>;
  cancelOrder(id: string, reason: string, options?: CancelOrderOptions): Promise<ApiOrder>;
  /**
   * Genera una guía automática Enviatodo/Estafeta. Solo aplica a órdenes
   * `PAID`/`PROCESSING` cuyo `shippingMethod` esté automatizado (`EXPRESS`
   * por defecto) — la API rechaza cualquier otro caso con un mensaje ya
   * pensado para mostrarse tal cual (ver `ApiError.message`).
   */
  createShipment(id: string, packageId?: string): Promise<ApiOrderShipment>;
  /** Descarga el PDF de la guía — se pide al proveedor en cada llamada, nunca queda cacheado. */
  downloadShipmentLabel(id: string): Promise<Blob>;
  /** Órdenes con una solicitud de devolución en el estatus dado — típicamente `PENDING`, sin resolver. */
  getReturnRequests(status: ReturnRequestStatus): Promise<ApiOrder[]>;
  /** Rechaza la solicitud de devolución pendiente de la orden sin reembolsar nada. */
  rejectReturnRequest(id: string, reason: string): Promise<ApiOrder>;
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
    trackingNumber?: string,
    carrier?: string
  ): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, trackingNumber, carrier }),
    });
  }

  async cancelOrder(
    id: string,
    reason: string,
    options?: CancelOrderOptions
  ): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, ...options }),
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

  async getReturnRequests(status: ReturnRequestStatus): Promise<ApiOrder[]> {
    const result = await apiFetch<PaginatedResult<ApiOrder>>(
      `/v1/orders?returnRequestStatus=${status}&limit=100`
    );
    return result.items;
  }

  async rejectReturnRequest(id: string, reason: string): Promise<ApiOrder> {
    return apiFetch<ApiOrder>(`/v1/orders/${id}/return-request/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }
}

export const orderService: OrderService = new RestOrderService();

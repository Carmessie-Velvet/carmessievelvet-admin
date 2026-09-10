import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type {
  ApiAdminOrderShipment,
  ApiOrder,
  ApiOrderShipment,
  OrderStatus,
  RefundMode,
  ReturnRequestStatus,
} from "@/types/orders";
import type { ApiShipmentQuote } from "@/types/shipping";

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
   * Cotiza la orden contra todas las paqueterías/servicios habilitados en
   * la cuenta de Enviatodo, sin generar ni cobrar nada — para que el admin
   * elija antes de llamar `createShipment`. Ya viene ordenada de más
   * barata a más cara. Mismas reglas de elegibilidad que `createShipment`,
   * pero sí funciona aunque la orden ya tenga una guía activa.
   */
  quoteShipment(id: string, packageId?: string): Promise<ApiShipmentQuote[]>;
  /**
   * Genera una guía automática vía Enviatodo. Solo aplica a órdenes
   * `PAID`/`PROCESSING` cuyo `shippingMethod` esté automatizado (`EXPRESS`
   * por defecto) — la API rechaza cualquier otro caso con un mensaje ya
   * pensado para mostrarse tal cual (ver `ApiError.message`). `providerId`/
   * `providerServiceId` (de `quoteShipment`) eligen la paquetería — si se
   * omiten, la API usa la que tenga configurada por default.
   */
  createShipment(
    id: string,
    packageId?: string,
    providerId?: string,
    providerServiceId?: string
  ): Promise<ApiOrderShipment>;
  /** Descarga el PDF de la guía — se pide al proveedor en cada llamada, nunca queda cacheado. */
  downloadShipmentLabel(id: string): Promise<Blob>;
  /** Detalle admin de la guía activa (costo real y paquetería elegida) — más ancho que `ApiOrder.shipment`, que es lo que ve el comprador. */
  getAdminShipment(id: string): Promise<ApiAdminOrderShipment>;
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

  async quoteShipment(id: string, packageId?: string): Promise<ApiShipmentQuote[]> {
    const qs = packageId ? `?packageId=${encodeURIComponent(packageId)}` : "";
    return apiFetch<ApiShipmentQuote[]>(`/v1/orders/${id}/shipment/quotes${qs}`);
  }

  async createShipment(
    id: string,
    packageId?: string,
    providerId?: string,
    providerServiceId?: string
  ): Promise<ApiOrderShipment> {
    return apiFetch<ApiOrderShipment>(`/v1/orders/${id}/shipment`, {
      method: "POST",
      body: JSON.stringify({
        packageId,
        providerId: providerId ? Number(providerId) : undefined,
        providerServiceId: providerServiceId ? Number(providerServiceId) : undefined,
      }),
    });
  }

  async downloadShipmentLabel(id: string): Promise<Blob> {
    return apiFetchBlob(`/v1/orders/${id}/shipment/label`);
  }

  async getAdminShipment(id: string): Promise<ApiAdminOrderShipment> {
    return apiFetch<ApiAdminOrderShipment>(`/v1/orders/${id}/shipment`);
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

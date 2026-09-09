export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

/** `POST /orders/:id/cancel` — cuánto reembolsar. Ignorado si la orden es `PENDING` (nunca se cobró). */
export type RefundMode = "FULL" | "FULL_MINUS_SHIPPING" | "PARTIAL";

export type ReturnRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Solicitud de devolución que el comprador manda por su cuenta
 * (`POST /store/orders/return-request`, público) sobre una orden ya
 * `DELIVERED` — el admin la aprueba (reembolsando vía `/cancel`) o la
 * rechaza (`/return-request/reject`), nunca la crea. `resolvedAt`/
 * `resolutionNote`/`refundMode`/`refundedAmount` solo se llenan una vez
 * resuelta.
 */
export interface ApiReturnRequest {
  id: string;
  status: ReturnRequestStatus;
  reason: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  refundMode?: RefundMode;
  refundedAmount?: number;
}

/**
 * Dirección estructurada (reemplazó `line1`/`line2` cuando se agregó la
 * generación automática de guías Enviatodo/Estafeta, que necesita calle,
 * número y colonia por separado). `state` lo calcula la API a partir de
 * `stateCode` — nunca se manda, solo se lee.
 */
export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  extNumber: string;
  intNumber?: string;
  suburb: string;
  city: string;
  state?: string;
  stateCode: string;
  postalCode: string;
  country?: string;
  reference?: string;
}

/** `GET/POST /orders/:id/shipment` — estado público de una guía Enviatodo. */
export interface ApiOrderShipment {
  carrier: string;
  trackingId?: string;
  carrierStatus?: string;
  carrierStatusAt?: string;
  createdAt: string;
}

/**
 * `GET /orders/:id/shipment` (endpoint dedicado, no el `shipment` embebido
 * en `ApiOrder`) — mismo shape que `ApiOrderShipment` más el detalle de
 * costo/paquetería real que solo ve el admin, nunca el comprador.
 */
export interface ApiAdminOrderShipment extends ApiOrderShipment {
  providerId: number;
  providerServiceId: number;
  providerServiceName?: string;
  /** Lo que Enviatodo cobró de verdad por esta guía — no lo que pagó el comprador (`shippingTotal`, congelado desde la compra). */
  quotedAmount?: number;
}

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  size: string;
  quantity: number;
  /** El producto era sobre pedido al momento de la compra. */
  madeToOrder: boolean;
  unitPrice: number;
  discountPercentage: number;
  unitFinalPrice: number;
  lineTotal: number;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  userId?: string;
  email: string;
  shippingAddress: ShippingAddress;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  /** Código del método de envío elegido (catálogo en `/metodos-envio`). */
  shippingMethod: string;
  /** Snapshot de la descripción del método al momento de la compra. */
  shippingMethodDescription?: string;
  /**
   * Paquetería (ej. "Correos de México", "Estafeta") — snapshot del catálogo
   * de métodos de envío al momento de la compra, pero un admin puede
   * sobreescribirla para esta orden puntual vía `PATCH /orders/:id/status`
   * (típicamente junto con `trackingNumber` al pasar a `SHIPPED` en un envío
   * `STANDARD`, que siempre es manual). Ausente en órdenes viejas o si el
   * método de envío nunca tuvo `carrier` configurado.
   */
  carrier?: string;
  total: number;
  couponCode?: string;
  items: OrderItem[];
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  trackingNumber?: string;
  /**
   * Guía automática de Enviatodo/Estafeta, si ya se generó una — `undefined`
   * para órdenes `STANDARD` (siempre manuales) o `EXPRESS` sin guía todavía.
   */
  shipment?: ApiOrderShipment;
  /** Decimal en pesos, `0` hasta el primer reembolso (total o parcial). */
  refundedAmount: number;
  /** `undefined` salvo que el comprador haya mandado una solicitud de devolución post-entrega. */
  returnRequest?: ApiReturnRequest | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The only manual status an order can move to next, mirroring the API's
 * `ALLOWED_TRANSITIONS` intersected with `MANUAL_STATUSES`
 * (`order-status.util.ts`) — PAID only comes from the Stripe webhook,
 * CANCELLED/REFUNDED only from the cancel endpoint, so there's never more
 * than one manual next step to offer.
 */
export const NEXT_MANUAL_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING: null,
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
  REFUNDED: null,
  PARTIALLY_REFUNDED: null,
};

export const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

/**
 * Métodos de envío para los que el backend genera y da seguimiento a una
 * guía Enviatodo/Estafeta automáticamente (`SHIPPING_AUTOMATED_METHOD_CODES`,
 * default solo `EXPRESS`) — mirrored aquí únicamente para decidir qué
 * controles manuales mostrar en el detalle de la orden; la autoridad real
 * sigue siendo el rechazo del backend en `POST /orders/:id/shipment`.
 */
const AUTOMATED_SHIPPING_METHODS = ["EXPRESS"];

export function isAutomatedShipping(method: string): boolean {
  return AUTOMATED_SHIPPING_METHODS.includes(method.toUpperCase());
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  PROCESSING: "En proceso",
  SHIPPED: "Enviada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  REFUNDED: "Reembolsada",
  PARTIALLY_REFUNDED: "Reembolso parcial",
};

export const RETURN_REQUEST_STATUS_LABEL: Record<ReturnRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export const REFUND_MODE_LABEL: Record<RefundMode, string> = {
  FULL: "Total",
  FULL_MINUS_SHIPPING: "Total menos envío",
  PARTIAL: "Monto parcial",
};

/** Compartido entre las listas/detalle de órdenes y el dashboard — un solo lugar para el color de cada badge de estatus. */
export function statusBadgeVariant(status: OrderStatus): "default" | "secondary" | "destructive" {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PARTIALLY_REFUNDED") {
    return "destructive";
  }
  if (status === "PENDING") return "secondary";
  return "default";
}

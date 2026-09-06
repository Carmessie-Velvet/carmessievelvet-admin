export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

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
};

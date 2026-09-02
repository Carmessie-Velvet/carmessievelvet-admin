export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface ShippingAddress {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  size: string;
  quantity: number;
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
  total: number;
  couponCode?: string;
  items: OrderItem[];
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  trackingNumber?: string;
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

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  PROCESSING: "En proceso",
  SHIPPED: "Enviada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  REFUNDED: "Reembolsada",
};

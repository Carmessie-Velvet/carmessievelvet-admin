import type { OrderStatus } from "./orders";

/**
 * `GET /admin/stats/dashboard` — todos los montos vienen en pesos (no en
 * centavos). Ver `../carmessievelvet-api/docs/API-FRONTEND.md` §19 para el
 * contrato completo.
 */
export interface ApiMetric {
  value: number;
  previous: number;
  /** % de cambio vs. el periodo anterior; `null` si el periodo anterior fue 0. */
  changePct: number | null;
}

export interface ApiStatsPeriod {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  timezone: string;
}

/**
 * `scope: "items"` cuando se filtra por producto/categoría — en ese caso
 * `refundedTotal`/`shippingCharged`/`discountTotal` vienen `null` (no son
 * atribuibles a una sola línea del carrito).
 */
export interface ApiStatsSummary {
  scope: "orders" | "items";
  netRevenue: ApiMetric;
  orders: ApiMetric;
  averageOrderValue: ApiMetric;
  unitsSold: ApiMetric;
  refundedTotal: number | null;
  shippingCharged: number | null;
  discountTotal: number | null;
}

export interface ApiOrderStatusStats {
  status: OrderStatus;
  label: string;
  orders: number;
  amount: number;
}

export type StatsGranularity = "day" | "week" | "month";

export interface ApiSalesBucket {
  bucket: string;
  orders: number;
  revenue: number;
}

export interface ApiSalesTimeseries {
  granularity: StatsGranularity;
  timezone: string;
  buckets: ApiSalesBucket[];
}

export interface ApiStateStats {
  code: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface ApiCategoryStats {
  categoryId: string;
  name: string;
  orders: number;
  units: number;
  revenue: number;
}

export interface ApiTopProduct {
  productId: string | null;
  sku: string | null;
  name: string;
  orders: number;
  units: number;
  revenue: number;
}

export interface ApiShippingMethodStats {
  method: string;
  description: string | null;
  orders: number;
  charged: number;
}

export interface ApiCarrierStatusStats {
  status: string | null;
  label: string;
  shipments: number;
}

export interface ApiShippingStats {
  byMethod: ApiShippingMethodStats[];
  byCarrierStatus: ApiCarrierStatusStats[];
  withGuide: number;
  withoutGuide: number;
  /** Lo que se le cobró al comprador por envío (todas las órdenes del rango). */
  charged: number;
  /** Igual que `charged`, pero solo la porción de las órdenes con guía automática. */
  chargedWithGuide: number;
  /** Igual que `charged`, pero solo la porción de las órdenes sin guía automática. */
  chargedWithoutGuide: number;
  /** Lo que Estafeta cotizó — solo existe para órdenes con guía generada. */
  cost: number;
  /**
   * `chargedWithGuide - cost` — backend lo corrigió (antes comparaba
   * `charged` de TODAS las órdenes contra `cost` de solo las que tienen
   * guía, lo que inflaba el margen con envío STANDARD sin costo rastreado).
   * Ahora compara peras con peras: solo el subconjunto con guía automática.
   */
  margin: number;
}

export interface ApiPaymentMethodStats {
  type: string | null;
  brand: string | null;
  label: string;
  orders: number;
  amount: number;
}

export interface ApiPaymentStats {
  createdOrders: number;
  paidOrders: number;
  pendingOrders: number;
  pendingAmount: number;
  paidAmount: number;
  refundedAmount: number;
  conversionRate: number | null;
  byMethod: ApiPaymentMethodStats[];
}

export interface ApiCustomerStats {
  orders: number;
  guestOrders: number;
  userOrders: number;
  uniqueCustomers: number;
  newCustomers: number;
  recurringCustomers: number;
}

export interface ApiCouponStats {
  code: string;
  uses: number;
  discounted: number;
  revenue: number;
}

export interface ApiCouponSummary {
  discountTotal: number;
  ordersWithCoupon: number;
  usageRate: number | null;
  top: ApiCouponStats[];
}

export interface ApiEnviatodoBalance {
  available: boolean;
  balance: number | null;
  currency: string;
}

export interface ApiStatsDashboard {
  period: ApiStatsPeriod;
  summary: ApiStatsSummary;
  ordersByStatus: ApiOrderStatusStats[];
  sales: ApiSalesTimeseries;
  byState: ApiStateStats[];
  byCategory: ApiCategoryStats[];
  topProducts: ApiTopProduct[];
  shipping: ApiShippingStats;
  payments: ApiPaymentStats;
  customers: ApiCustomerStats;
  coupons: ApiCouponSummary;
  enviatodo: ApiEnviatodoBalance;
}

export interface StatsDashboardParams {
  from?: string;
  to?: string;
  granularity?: StatsGranularity;
  limit?: number;
}

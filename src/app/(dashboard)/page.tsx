"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgePercent,
  ChevronRight,
  CreditCard,
  Layers,
  Loader2,
  Minus,
  Package,
  Receipt,
  ShoppingBag,
  Tags,
  TrendingDown,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { statsService } from "@/services/stats-service";
import { orderService } from "@/services/order-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { useCountUp } from "@/hooks/use-count-up";
import { useCatalogStats } from "@/hooks/use-catalog-stats";
import { ORDER_STATUS_LABEL, statusBadgeVariant } from "@/types/orders";
import type { ApiMetric, ApiStatsDashboard } from "@/types/stats";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { SegmentedBar } from "@/components/dashboard/SegmentedBar";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { Reveal } from "@/components/dashboard/Reveal";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionIcon, SECTION_ICON_TINTS } from "@/components/ui/section-icon";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" },
];

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const isUp = changePct > 0;
  const isFlat = changePct === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isFlat
          ? "text-muted-foreground"
          : isUp
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-500"
      )}
    >
      {isFlat ? (
        <Minus className="size-3" />
      ) : isUp ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {Math.abs(changePct)}%
    </span>
  );
}

/**
 * `hero` marca la métrica principal (ingresos) con un degradado velvet ->
 * velvet-light — mismo tratamiento de "tarjeta destacada" que la
 * referencia, pero con los dos tonos reales de marca en vez de uno ajeno.
 */
function MetricTile({
  label,
  metric,
  money,
  icon: Icon,
  hero,
  tintIndex = 0,
}: {
  label: string;
  metric: ApiMetric;
  money?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  hero?: boolean;
  tintIndex?: number;
}) {
  const animated = useCountUp(metric.value);
  return (
    <Card
      className={cn(
        hero && "border-primary/30 bg-gradient-to-br from-primary/12 via-primary/5 to-velvet-light/10"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl",
              hero
                ? "bg-gradient-to-br from-primary to-velvet-light text-primary-foreground"
                : SECTION_ICON_TINTS[tintIndex % SECTION_ICON_TINTS.length]
            )}
          >
            <Icon className="size-4" />
          </span>
          <ChangeBadge changePct={metric.changePct} />
        </div>
        <div>
          <CardTitle className="text-3xl font-extrabold tracking-tight tabular-nums">
            {money ? formatCurrency(animated) : Math.round(animated)}
          </CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Chevron sutil en la esquina de una card-como-link — usa el mismo
 * group/card que ya trae `Card` (para el hover-lift) así que se mueve un
 * poco al pasar el mouse, como pista de que toda la tarjeta es clickeable.
 */
function CardLinkChevron() {
  return (
    <CardAction>
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/card:translate-x-0.5" />
    </CardAction>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { catalog, error: catalogError } = useCatalogStats(router);
  const [pendingReturns, setPendingReturns] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    orderService
      .getReturnRequests("PENDING")
      .then((data) => {
        if (!cancelled) setPendingReturns(data.length);
      })
      .catch(() => {
        // No es crítico para el resto del dashboard — si falla, el StatCard
        // se queda en "—" en vez de tumbar toda la pantalla.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [rangeDays, setRangeDays] = useState("30");
  const [dashboard, setDashboard] = useState<ApiStatsDashboard | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  // Starts true so the first load shows the spinner instead of an empty
  // dashboard; the range <Select>'s onValueChange re-arms it for later
  // refetches (setting it from the effect body itself would be a
  // synchronous setState-in-effect, which the lint rule flags).
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const days = Number(rangeDays);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    statsService
      .getDashboard({ from: from.toISOString(), to: to.toISOString() })
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
        setStatsError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setStatsError(
          err instanceof ApiError ? err.message : "No se pudieron cargar las estadísticas."
        );
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rangeDays, router]);

  const topStates = useMemo(() => dashboard?.byState.slice(0, 6) ?? [], [dashboard]);
  const totalStateRevenue = useMemo(
    () => dashboard?.byState.reduce((sum, s) => sum + s.revenue, 0) ?? 0,
    [dashboard]
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de administración de Carmessie Velvet.
          </p>
        </div>
        <Select
          value={rangeDays}
          onValueChange={(v) => {
            if (!v) return;
            setRefreshing(true);
            setRangeDays(v);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Rango">
              {(value: string) =>
                RANGE_OPTIONS.find((o) => o.value === value)?.label ?? "Rango"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {catalogError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {catalogError}
        </div>
      )}

      {/* Estadísticas de ventas — /admin/stats/dashboard */}
      {statsError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {statsError}
        </div>
      )}

      {!dashboard && !statsError && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {dashboard && (
        <div className={cn("flex flex-col gap-6", refreshing && "opacity-60 transition-opacity")}>
          {/* ---- KPIs: fila propia de 3, altura natural corta — separada
              del grid de gráficas para que ninguna se estire de más
              intentando igualar la altura de una tarjeta de chart. ---- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Reveal delayMs={0}>
              <MetricTile label="Ingresos netos" metric={dashboard.summary.netRevenue} money icon={Wallet} hero />
            </Reveal>
            <Reveal delayMs={60}>
              <MetricTile label="Órdenes pagadas" metric={dashboard.summary.orders} icon={Package} tintIndex={1} />
            </Reveal>
            <Reveal delayMs={120}>
              <MetricTile
                label="Ticket promedio"
                metric={dashboard.summary.averageOrderValue}
                money
                icon={Receipt}
                tintIndex={2}
              />
            </Reveal>
          </div>

          {/* ---- Catálogo: siempre disponible (no depende del rango de
              fechas), debajo de los KPIs de ventas — pesan menos. ---- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard icon={ShoppingBag} label="Productos" value={catalog?.totalProducts ?? null} tintIndex={0} />
            <StatCard icon={Layers} label="Activos" value={catalog?.activeProducts ?? null} tintIndex={1} />
            <StatCard
              icon={AlertTriangle}
              label="Sin stock"
              value={catalog?.outOfStock ?? null}
              tone={catalog && catalog.outOfStock > 0 ? "warning" : "default"}
            />
            <StatCard icon={Tags} label="Categorías" value={catalog?.categories ?? null} tintIndex={2} />
            <Link href="/devoluciones" className="block">
              <StatCard
                icon={Undo2}
                label="Devoluciones pendientes"
                value={pendingReturns}
                tone={pendingReturns !== null && pendingReturns > 0 ? "warning" : "default"}
              />
            </Link>
          </div>

          {/* ---- Fila de gráficas: 1+2+1, todas de altura de "chart" similar
              (nada de row-span que deje huecos ni tarjetas gigantes vacías). ---- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Reveal delayMs={180}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Tags} index={1} />
                    <div>
                      <CardTitle>Por categoría</CardTitle>
                      <CardDescription>Participación en ingresos.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 items-center">
                  <DonutChart
                    segments={dashboard.byCategory.map((c) => ({ label: c.name, value: c.revenue }))}
                    centerValue={formatCurrency(
                      dashboard.byCategory.reduce((sum, c) => sum + c.revenue, 0)
                    )}
                    centerLabel="Ingresos"
                    formatValue={(v) => formatCurrency(v)}
                  />
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delayMs={240} className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Wallet} index={0} />
                    <div>
                      <CardTitle>Ventas</CardTitle>
                      <CardDescription>
                        Ingresos y órdenes por{" "}
                        {dashboard.sales.granularity === "day"
                          ? "día"
                          : dashboard.sales.granularity === "week"
                            ? "semana"
                            : "mes"}{" "}
                        (fecha de pago).
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SalesChart buckets={dashboard.sales.buckets} granularity={dashboard.sales.granularity} />
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delayMs={300}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Users} index={0} />
                    <div>
                      <CardTitle>Por estado</CardTitle>
                      <CardDescription>Top {topStates.length} por ingresos.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {topStates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {topStates.map((s) => {
                        const pct = totalStateRevenue ? (s.revenue / totalStateRevenue) * 100 : 0;
                        return (
                          <div key={s.code} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{s.name}</span>
                              <span className="text-muted-foreground">{Math.round(pct)}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delayMs={360} className="lg:col-span-2">
              <Link href="/metodos-envio" className="block h-full">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={Truck} index={2} />
                      <div>
                        <CardTitle>Métodos de envío</CardTitle>
                        <CardDescription>Por número de órdenes.</CardDescription>
                      </div>
                    </div>
                    <CardLinkChevron />
                  </CardHeader>
                  <CardContent className="flex flex-1 items-center">
                    <SegmentedBar
                      segments={dashboard.shipping.byMethod.map((m) => ({
                        label: m.method,
                        value: m.orders,
                      }))}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </Link>
            </Reveal>

            <Reveal delayMs={420} className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={CreditCard} index={2} />
                    <div>
                      <CardTitle>Conversión de pago</CardTitle>
                      <CardDescription>Creadas vs. pagadas.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-wrap items-center justify-center gap-6 sm:justify-between">
                  <GaugeChart
                    percent={(dashboard.payments.conversionRate ?? 0) * 100}
                    valueLabel={`${dashboard.payments.paidOrders} pagadas`}
                    subLabel={`de ${dashboard.payments.createdOrders} creadas`}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:min-w-48">
                    <div className="rounded-lg bg-primary/5 px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Creadas</p>
                      <p className="text-sm font-semibold">{dashboard.payments.createdOrders}</p>
                    </div>
                    <div className="rounded-lg bg-velvet-light/10 px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Pagadas</p>
                      <p className="text-sm font-semibold">{dashboard.payments.paidOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          {/* ---- Detalle adicional (no está en la referencia, pero es
              información real que ya existía y no se quita) ---- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Link href="/ordenes" className="block h-full">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Package} index={0} />
                    <div>
                      <CardTitle>Órdenes por estatus</CardTitle>
                      <CardDescription>Fecha de creación.</CardDescription>
                    </div>
                  </div>
                  <CardLinkChevron />
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {dashboard.ordersByStatus
                    .filter((s) => s.orders > 0)
                    .map((s) => (
                      <div key={s.status} className="flex items-center justify-between text-sm">
                        <Badge variant={statusBadgeVariant(s.status)}>
                          {ORDER_STATUS_LABEL[s.status]}
                        </Badge>
                        <span className="text-muted-foreground">
                          {s.orders} · {formatCurrency(s.amount)}
                        </span>
                      </div>
                    ))}
                  {dashboard.ordersByStatus.every((s) => s.orders === 0) && (
                    <p className="text-sm text-muted-foreground">Sin órdenes en este periodo.</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/productos" className="block h-full">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={BadgePercent} index={1} />
                    <div>
                      <CardTitle>Productos más vendidos</CardTitle>
                      <CardDescription>
                        {dashboard.summary.unitsSold.value} unidades vendidas en el periodo.
                      </CardDescription>
                    </div>
                  </div>
                  <CardLinkChevron />
                </CardHeader>
                <CardContent>
                  {dashboard.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {dashboard.topProducts.slice(0, 6).map((p) => (
                        <div key={p.productId ?? p.sku ?? p.name} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                          </div>
                          <span className="shrink-0 text-muted-foreground">
                            {p.units} u · {formatCurrency(p.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          <Link href="/envios-automatizados" className="block">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionIcon icon={Truck} index={0} />
                  <div>
                    <CardTitle>Envíos</CardTitle>
                    <CardDescription>Fecha de creación de la orden.</CardDescription>
                  </div>
                </div>
                <CardLinkChevron />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Con guía</p>
                    <p className="text-lg font-semibold">{dashboard.shipping.withGuide}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sin guía</p>
                    <p className="text-lg font-semibold">{dashboard.shipping.withoutGuide}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cobrado (con guía)</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(dashboard.shipping.chargedWithGuide)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Costo (Estafeta)</p>
                    <p className="text-lg font-semibold">{formatCurrency(dashboard.shipping.cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margen</p>
                    <p className="text-lg font-semibold">{formatCurrency(dashboard.shipping.margin)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Margen = lo cobrado en órdenes con guía automática (Estafeta) menos su costo
                  real — no incluye el envío STANDARD (Correos de México), cuyo costo no se
                  rastrea por esta vía.
                </p>
              </CardContent>
            </Card>
          </Link>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionIcon icon={CreditCard} index={1} />
                  <div>
                    <CardTitle>Pagos por método</CardTitle>
                    <CardDescription>Fecha de pago.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 items-center">
                {dashboard.payments.byMethod.length > 0 ? (
                  <SegmentedBar
                    segments={dashboard.payments.byMethod.map((m) => ({
                      label: m.label,
                      value: m.amount,
                      sublabel: `${m.orders} orden${m.orders === 1 ? "" : "es"}`,
                    }))}
                    formatValue={(v) => formatCurrency(v)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sin pagos en este periodo.</p>
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionIcon icon={Users} index={2} />
                  <div>
                    <CardTitle>Clientes</CardTitle>
                    <CardDescription>{dashboard.customers.uniqueCustomers} únicos en el periodo.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Invitados vs. registrados</p>
                  <SegmentedBar
                    segments={[
                      { label: "Invitados", value: dashboard.customers.guestOrders },
                      { label: "Registrados", value: dashboard.customers.userOrders },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Nuevos vs. recurrentes</p>
                  <SegmentedBar
                    segments={[
                      { label: "Nuevos", value: dashboard.customers.newCustomers },
                      { label: "Recurrentes", value: dashboard.customers.recurringCustomers },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {(dashboard.coupons.ordersWithCoupon > 0 || dashboard.enviatodo.available) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dashboard.coupons.ordersWithCoupon > 0 && (
                <Link href="/cupones" className="block h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <SectionIcon icon={BadgePercent} index={0} />
                        <div>
                          <CardTitle>Cupones</CardTitle>
                          <CardDescription>
                            {formatCurrency(dashboard.coupons.discountTotal)} descontado ·{" "}
                            {dashboard.coupons.usageRate !== null
                              ? `${Math.round(dashboard.coupons.usageRate * 100)}% de las órdenes pagadas`
                              : "—"}
                          </CardDescription>
                        </div>
                      </div>
                      <CardLinkChevron />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {dashboard.coupons.top.map((c) => (
                        <div key={c.code} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.code}</span>
                          <span className="text-muted-foreground">
                            {c.uses} uso{c.uses === 1 ? "" : "s"} · -{formatCurrency(c.discounted)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </Link>
              )}

              <Link href="/envios-automatizados" className="block h-full">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={Wallet} index={1} />
                      <div>
                        <CardTitle>Saldo Enviatodo</CardTitle>
                        <CardDescription>Cuenta usada para generar guías de Estafeta.</CardDescription>
                      </div>
                    </div>
                    <CardLinkChevron />
                  </CardHeader>
                  <CardContent className="flex flex-1 items-center">
                    {dashboard.enviatodo.available ? (
                      <p className="text-3xl font-extrabold tracking-tight">
                        {formatCurrency(dashboard.enviatodo.balance ?? 0, dashboard.enviatodo.currency)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No se pudo consultar el saldo — Enviatodo no respondió.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Las métricas de catálogo vienen directo del inventario real. Las de ventas
        vienen de la API de estadísticas ({RANGE_OPTIONS.find((o) => o.value === rangeDays)?.label.toLowerCase()}).
      </p>
    </div>
  );
}

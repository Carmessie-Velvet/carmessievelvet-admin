"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  PackageSearch,
  Search,
  Wallet,
} from "lucide-react";
import { orderService } from "@/services/order-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiOrder, OrderStatus } from "@/types/orders";
import { ORDER_STATUS_LABEL, statusBadgeVariant } from "@/types/orders";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    orderService
      .getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las órdenes.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    if (!orders) return null;
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.shippingAddress.fullName.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    if (!orders) return null;
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      paid: orders.filter((o) => o.status === "PAID").length,
      cancelled: orders.filter((o) =>
        ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(o.status)
      ).length,
      refundedAmount: orders.reduce((sum, o) => sum + o.refundedAmount, 0),
    };
  }, [orders]);

  const pageCount = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  // El filtro/búsqueda puede dejar `page` apuntando a una página que ya no
  // existe (ej. se filtraba en la página 3 y el resultado nuevo solo tiene
  // 1) — se ajusta acá mismo en vez de un efecto aparte.
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Órdenes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders
            ? `${orders.length} orden${orders.length === 1 ? "" : "es"} en total.`
            : error
              ? "No se pudieron cargar las órdenes."
              : "Cargando órdenes desde la API..."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon={Package} label="Total" value={stats?.total ?? null} tintIndex={0} />
        <StatCard icon={Clock} label="Pendientes" value={stats?.pending ?? null} tintIndex={1} />
        <StatCard icon={Package} label="Pagadas" value={stats?.paid ?? null} tintIndex={2} />
        <StatCard
          icon={Ban}
          label="Canceladas/reembolsadas"
          value={stats?.cancelled ?? null}
          tone={stats && stats.cancelled > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={Wallet}
          label="Reembolsado"
          value={stats?.refundedAmount ?? null}
          money
          tone={stats && stats.refundedAmount > 0 ? "warning" : "default"}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!orders && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por # de orden, email o nombre..."
              className="pl-8"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter((v as OrderStatus | "ALL") ?? "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue>
                {(value: OrderStatus | "ALL") =>
                  value === "ALL" ? "Todos los estados" : ORDER_STATUS_LABEL[value]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {ORDER_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {orders && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PackageSearch className="size-5" />
          </span>
          <p className="text-sm font-medium">Todavía no hay órdenes</p>
          <p className="text-sm text-muted-foreground">
            Van a aparecer acá en cuanto alguien compre en la tienda.
          </p>
        </div>
      )}

      {filtered && filtered.length === 0 && orders && orders.length > 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Ninguna orden coincide con el filtro.
        </div>
      )}

      {filtered && filtered.length > 0 && paginated && (
        <>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <Link href={`/ordenes/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.shippingAddress.fullName}
                      <div className="text-xs">{order.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("es-MX")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Siguiente
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

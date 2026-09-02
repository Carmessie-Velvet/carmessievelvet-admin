"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MapPin, Package, Receipt } from "lucide-react";
import { orderService } from "@/services/order-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import {
  CANCELLABLE_STATUSES,
  NEXT_MANUAL_STATUS,
  ORDER_STATUS_LABEL,
  type ApiOrder,
} from "@/types/orders";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function statusBadgeVariant(status: ApiOrder["status"]): "default" | "secondary" | "destructive" {
  if (status === "CANCELLED" || status === "REFUNDED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "default";
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    orderService
      .getOrder(params.id)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setTrackingNumber(data.trackingNumber ?? "");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la orden.");
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  async function advanceStatus() {
    if (!order) return;
    const next = NEXT_MANUAL_STATUS[order.status];
    if (!next) return;

    setBusy(true);
    try {
      const updated = await orderService.updateOrderStatus(
        order.id,
        next,
        next === "SHIPPED" ? trackingNumber || undefined : undefined
      );
      setOrder(updated);
      toast.success(`Orden marcada como ${ORDER_STATUS_LABEL[next]}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    const reason = window.prompt(
      "¿Por qué se cancela esta orden? (opcional, dejar vacío para omitir)"
    );
    if (reason === null) return; // user pressed Cancel on the prompt

    setBusy(true);
    try {
      const updated = await orderService.cancelOrder(order.id, reason || undefined);
      setOrder(updated);
      toast.success("Orden cancelada.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cancelar la orden.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link
          href="/ordenes"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Volver a órdenes
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const next = NEXT_MANUAL_STATUS[order.status];
  const cancellable = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ordenes"
          aria-label="Volver a órdenes"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString("es-MX")}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(order.status)}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Package className="size-4" />
            </span>
            <div>
              <CardTitle>Estado del pedido</CardTitle>
              <CardDescription>
                {order.status === "PENDING"
                  ? "Todavía no se confirma el pago — no hay acciones manuales disponibles."
                  : "Avanza el estado a medida que se procesa el envío."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {next === "SHIPPED" && (
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de rastreo (opcional)"
              className="max-w-56"
            />
          )}
          {next && (
            <Button type="button" disabled={busy} onClick={advanceStatus}>
              Marcar como {ORDER_STATUS_LABEL[next]}
            </Button>
          )}
          {cancellable && (
            <Button type="button" variant="destructive" disabled={busy} onClick={handleCancel}>
              Cancelar orden
            </Button>
          )}
          {!next && !cancellable && (
            <p className="text-sm text-muted-foreground">
              Esta orden ya está en un estado final.
            </p>
          )}
          {order.trackingNumber && (
            <p className="w-full text-sm text-muted-foreground">
              Rastreo: <span className="font-medium text-foreground">{order.trackingNumber}</span>
            </p>
          )}
          {order.cancellationReason && (
            <p className="w-full text-sm text-muted-foreground">
              Motivo de cancelación: {order.cancellationReason}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </span>
            <div>
              <CardTitle>Cliente y envío</CardTitle>
              <CardDescription>{order.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p className="font-medium">{order.shippingAddress.fullName}</p>
          {order.shippingAddress.phone && (
            <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
          )}
          <p className="text-muted-foreground sm:col-span-2">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
          </p>
          <p className="text-muted-foreground sm:col-span-2">
            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
            {order.shippingAddress.postalCode}
            {order.shippingAddress.country ? `, ${order.shippingAddress.country}` : ""}
          </p>
          {order.notes && (
            <p className="mt-2 text-muted-foreground sm:col-span-2">Notas: {order.notes}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Receipt className="size-4" />
            </span>
            <div>
              <CardTitle>Artículos</CardTitle>
              <CardDescription>
                {order.couponCode ? `Cupón aplicado: ${order.couponCode}` : "Sin cupón aplicado."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                        {item.productImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.productName}
                      <div className="text-xs font-normal text-muted-foreground">
                        {item.productSku}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.size}</TableCell>
                    <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitFinalPrice)}</TableCell>
                    <TableCell>{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="ml-auto flex w-full max-w-56 flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span>
                <span>-{formatCurrency(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Envío</span>
              <span>{formatCurrency(order.shippingTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

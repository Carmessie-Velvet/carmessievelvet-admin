"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  Receipt,
  Truck,
} from "lucide-react";
import { orderService } from "@/services/order-service";
import { enviatodoService } from "@/services/enviatodo-service";
import { ApiError } from "@/lib/api-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/format-currency";
import {
  CANCELLABLE_STATUSES,
  isAutomatedShipping,
  NEXT_MANUAL_STATUS,
  ORDER_STATUS_LABEL,
  type ApiOrder,
} from "@/types/orders";
import type { ApiEnviatodoPackage } from "@/types/shipping";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionIcon } from "@/components/ui/section-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const SHIPMENT_ELIGIBLE_STATUSES: ApiOrder["status"][] = ["PAID", "PROCESSING"];

function packageLabel(pkg: ApiEnviatodoPackage): string {
  const dims =
    pkg.length && pkg.width && pkg.height
      ? `${pkg.length}×${pkg.width}×${pkg.height} cm`
      : null;
  const parts = [pkg.name ?? pkg.id ?? "Paquete", dims, pkg.weight ? `${pkg.weight} kg` : null]
    .filter(Boolean)
    .join(" — ");
  return pkg.isDefault ? `${parts} (default)` : parts;
}

function statusBadgeVariant(status: ApiOrder["status"]): "default" | "secondary" | "destructive" {
  if (status === "CANCELLED" || status === "REFUNDED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "default";
}

/**
 * Explicación en español llano de qué significa cada paso — tal como lo
 * describió el equipo de back (mensaje de Efren Almanza, 5/9/26): "en
 * preparación" es trabajo humano (buscar/empacar), generar la guía deja el
 * pedido listo para que Estafeta lo recolecte, y de ahí en adelante el
 * estatus avanza solo según lo que reporte la paquetería — todo esto solo
 * aplica a envíos EXPRESS, STANDARD sigue siendo 100% manual.
 */
const STATUS_GUIDE: { title: string; body: string }[] = [
  { title: "Pagada", body: "El cliente ya pagó. Es momento de empezar a preparar el pedido (todas las piezas son sobre pedido)." },
  {
    title: "En proceso",
    body: "Estás armando el pedido: buscas la prenda, la revisas y la empacas. Cuando esté lista: si el envío es EXPRESS, genera la guía (tarjeta de abajo) — la orden pasa sola a \"En proceso\". Si es STANDARD, avanza el estatus a mano con el botón de arriba.",
  },
  {
    title: "Guía generada (solo EXPRESS)",
    body: "Ya se creó la guía de Estafeta. Descarga el PDF, imprímelo y entrega el paquete cuando pasen a recolectarlo — de aquí en adelante ya no hay botones manuales para esta orden.",
  },
  {
    title: "Enviada / Entregada",
    body: "Para EXPRESS esto lo actualiza solo el sistema según lo que reporte Estafeta (puede tardar hasta 30 min) — no hace falta ni se puede tocar nada. Para STANDARD lo marcas tú a mano con el botón de arriba.",
  },
  {
    title: "Cancelada / Reembolsada",
    body: "Solo se llega aquí desde el botón \"Cancelar orden\" — nunca cambia sola.",
  },
];

function StatusGuideCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={HelpCircle} index={0} />
          <div>
            <CardTitle className="text-base">¿Qué significa cada paso?</CardTitle>
            <CardDescription>Guía rápida del ciclo de vida de una orden.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {STATUS_GUIDE.map((item) => (
          <div key={item.title}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const { prompt } = useConfirmDialog();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const [packages, setPackages] = useState<ApiEnviatodoPackage[] | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [shipmentBusy, setShipmentBusy] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);

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

  useEffect(() => {
    if (
      !order ||
      order.shipment ||
      !isAutomatedShipping(order.shippingMethod) ||
      !SHIPMENT_ELIGIBLE_STATUSES.includes(order.status)
    ) {
      return;
    }

    let cancelled = false;

    enviatodoService
      .getPackages()
      .then((data) => {
        if (cancelled) return;
        setPackages(data);
        const defaultPkg = data.find((p) => p.isDefault) ?? data[0];
        if (defaultPkg?.id) setSelectedPackageId(defaultPkg.id);
      })
      .catch(() => {
        if (!cancelled) toast.error("No se pudieron cargar los paquetes de Enviatodo.");
      });

    return () => {
      cancelled = true;
    };
    // Solo se necesita una vez, cuando la orden queda elegible para generar guía.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status, order?.shipment]);

  async function generateShipment() {
    if (!order) return;

    setShipmentBusy(true);
    try {
      await orderService.createShipment(order.id, selectedPackageId || undefined);
      const refreshed = await orderService.getOrder(order.id);
      setOrder(refreshed);
      setTrackingNumber(refreshed.trackingNumber ?? "");
      toast.success("Guía generada correctamente.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo generar la guía.");
    } finally {
      setShipmentBusy(false);
    }
  }

  async function downloadLabel() {
    if (!order) return;

    setLabelBusy(true);
    try {
      const blob = await orderService.downloadShipmentLabel(order.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `guia-${order.orderNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo descargar la guía.");
    } finally {
      setLabelBusy(false);
    }
  }

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
    const reason = await prompt({
      title: "Cancelar orden",
      description: "¿Por qué se cancela esta orden? (opcional, dejar vacío para omitir)",
      placeholder: "Motivo de la cancelación",
      confirmLabel: "Cancelar orden",
      cancelLabel: "Volver",
    });
    if (reason === null) return; // se cerró el diálogo sin confirmar

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

  const automated = isAutomatedShipping(order.shippingMethod);
  const next = NEXT_MANUAL_STATUS[order.status];
  const showManualAdvance = Boolean(next) && !automated;
  const cancellable = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={Package} index={0} />
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
          {showManualAdvance && next === "SHIPPED" && (
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de rastreo (opcional)"
              className="max-w-56"
            />
          )}
          {showManualAdvance && next && (
            <Button type="button" disabled={busy} onClick={advanceStatus}>
              Marcar como {ORDER_STATUS_LABEL[next]}
            </Button>
          )}
          {automated && order.status === "PAID" && (
            <p className="w-full text-sm text-muted-foreground">
              Genera la guía de envío (tarjeta de abajo) para iniciar el proceso — la orden pasará a
              &quot;En proceso&quot; automáticamente.
            </p>
          )}
          {automated && (order.status === "PROCESSING" || order.status === "SHIPPED") && (
            <p className="w-full text-sm text-muted-foreground">
              El estatus avanza automáticamente según Estafeta (se actualiza cada ~30 min) — no hay
              acción manual disponible.
            </p>
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
            <SectionIcon icon={MapPin} index={1} />
            <div>
              <CardTitle>Cliente y envío</CardTitle>
              <CardDescription>{order.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p className="font-medium">{order.shippingAddress.fullName}</p>
          <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
          <p className="text-muted-foreground sm:col-span-2">
            {order.shippingAddress.street} {order.shippingAddress.extNumber}
            {order.shippingAddress.intNumber ? `, Int. ${order.shippingAddress.intNumber}` : ""}
            , {order.shippingAddress.suburb}
          </p>
          <p className="text-muted-foreground sm:col-span-2">
            {order.shippingAddress.city}, {order.shippingAddress.state ?? order.shippingAddress.stateCode}{" "}
            {order.shippingAddress.postalCode}
            {order.shippingAddress.country ? `, ${order.shippingAddress.country}` : ""}
          </p>
          {order.shippingAddress.reference && (
            <p className="text-muted-foreground sm:col-span-2">
              Referencia: {order.shippingAddress.reference}
            </p>
          )}
          <p className="text-muted-foreground sm:col-span-2">
            Envío: <span className="font-medium text-foreground">{order.shippingMethod}</span>
            {order.shippingMethodDescription ? ` — ${order.shippingMethodDescription}` : ""}
          </p>
          {order.notes && (
            <p className="mt-2 text-muted-foreground sm:col-span-2">Notas: {order.notes}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={Truck} index={2} />
            <div>
              <CardTitle>Guía de envío</CardTitle>
              <CardDescription>
                {order.shipment
                  ? "Generada automáticamente vía Enviatodo/Estafeta."
                  : "Solo para métodos automatizados (ej. EXPRESS) — el estatus del proveedor se actualiza cada ~30 min."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.shipment ? (
            <>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Paquetería: <span className="font-medium text-foreground">{order.shipment.carrier}</span>
                </p>
                {order.shipment.trackingId && (
                  <p className="text-muted-foreground">
                    Guía: <span className="font-medium text-foreground">{order.shipment.trackingId}</span>
                  </p>
                )}
                <p className="text-muted-foreground sm:col-span-2">
                  Estatus de la paquetería:{" "}
                  {order.shipment.carrierStatus ? (
                    <Badge variant="secondary">{order.shipment.carrierStatus}</Badge>
                  ) : (
                    "Sin actualizaciones todavía"
                  )}
                  {order.shipment.carrierStatusAt &&
                    ` — ${new Date(order.shipment.carrierStatusAt).toLocaleString("es-MX")}`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-fit gap-1.5"
                disabled={labelBusy}
                onClick={downloadLabel}
              >
                <Download className="size-4" />
                {labelBusy ? "Descargando..." : "Descargar guía (PDF)"}
              </Button>
            </>
          ) : !automated ? (
            <p className="text-sm text-muted-foreground">
              El método de envío de esta orden ({order.shippingMethod}) se gestiona manualmente —
              no se genera guía automática.
            </p>
          ) : SHIPMENT_ELIGIBLE_STATUSES.includes(order.status) ? (
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedPackageId || null}
                onValueChange={(v) => setSelectedPackageId(v ?? "")}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Selecciona un paquete">
                    {(id: string) => {
                      const pkg = packages?.find((p) => p.id === id);
                      return pkg ? packageLabel(pkg) : "Selecciona un paquete";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(packages ?? []).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id ?? ""}>
                      {packageLabel(pkg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" disabled={shipmentBusy || !packages} onClick={generateShipment}>
                {shipmentBusy ? "Generando..." : "Generar guía"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Disponible una vez que la orden esté pagada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={Receipt} index={0} />
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
                      {item.madeToOrder && (
                        <Badge variant="secondary" className="ml-2 align-middle">
                          Sobre pedido
                        </Badge>
                      )}
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

      <aside className="lg:sticky lg:top-6">
        <StatusGuideCard />
      </aside>
      </div>
    </div>
  );
}

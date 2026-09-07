"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Undo2 } from "lucide-react";
import { orderService } from "@/services/order-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { RefundDialog, type RefundPayload } from "@/components/orders/RefundDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiOrder } from "@/types/orders";

/**
 * Cola de solicitudes de devolución sin resolver (`GET
 * /orders?returnRequestStatus=PENDING`) — el comprador las manda por su
 * cuenta desde el storefront sobre un pedido `DELIVERED`, este admin solo
 * las aprueba (reembolsa vía `/cancel`) o las rechaza. Sin fila de stats
 * arriba a propósito: la lista completa ya es la cola entera, un contador
 * no diría nada que el título de la página no diga ya (mismo criterio que
 * se usó para no agregársela a Cupones/Descuentos/Tags/Métodos de envío).
 */
export default function ReturnRequestsPage() {
  const router = useRouter();
  const { prompt } = useConfirmDialog();
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<ApiOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    orderService
      .getReturnRequests("PENDING")
      // `returnRequest` no viene poblado en el listado (ni siquiera filtrado
      // por returnRequestStatus) — solo en la lectura de una sola orden, ver
      // CLAUDE.md de la API — así que hay que volver a pedir cada una para
      // tener el motivo/fecha real que se muestra en la tabla.
      .then((list) => Promise.all(list.map((o) => orderService.getOrder(o.id))))
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las solicitudes de devolución.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleApprove({ reason, refundMode, amount }: RefundPayload) {
    if (!approveTarget) return;
    try {
      await orderService.cancelOrder(approveTarget.id, reason, { refundMode, amount });
      toast.success("Devolución aprobada y reembolsada.");
      setOrders((prev) => prev?.filter((o) => o.id !== approveTarget.id) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo aprobar la devolución.");
      throw err;
    }
  }

  async function handleReject(order: ApiOrder) {
    const reason = await prompt({
      title: "Rechazar devolución",
      description: `¿Por qué se rechaza la solicitud de ${order.orderNumber}? Se le avisa por correo al comprador.`,
      placeholder: "Motivo del rechazo",
      confirmLabel: "Rechazar solicitud",
      cancelLabel: "Volver",
    });
    if (reason === null || !reason.trim()) return;

    setBusyId(order.id);
    try {
      await orderService.rejectReturnRequest(order.id, reason.trim());
      toast.success("Solicitud de devolución rechazada.");
      setOrders((prev) => prev?.filter((o) => o.id !== order.id) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo rechazar la solicitud.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devoluciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders
            ? `${orders.length} solicitud${orders.length === 1 ? "" : "es"} pendiente${orders.length === 1 ? "" : "s"} de resolver.`
            : error
              ? "No se pudieron cargar las solicitudes."
              : "Cargando solicitudes desde la API..."}
        </p>
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

      {orders && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Undo2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">No hay solicitudes pendientes</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Van a aparecer acá en cuanto un comprador pida devolver un pedido ya entregado.
            </p>
          </div>
        </div>
      )}

      {orders && orders.length > 0 && (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Solicitada</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
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
                  <TableCell
                    className="max-w-64 truncate text-muted-foreground"
                    title={order.returnRequest?.reason}
                  >
                    {order.returnRequest?.reason}
                  </TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.returnRequest
                      ? new Date(order.returnRequest.createdAt).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === order.id}
                        onClick={() => setApproveTarget(order)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === order.id}
                        onClick={() => handleReject(order)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {approveTarget && (
        <RefundDialog
          open={Boolean(approveTarget)}
          onOpenChange={(open) => {
            if (!open) setApproveTarget(null);
          }}
          order={approveTarget}
          title={`Aprobar devolución — ${approveTarget.orderNumber}`}
          description="Se reembolsa vía Stripe y la solicitud queda marcada como aprobada."
          confirmLabel="Aprobar y reembolsar"
          defaultRefundMode="FULL_MINUS_SHIPPING"
          onConfirm={handleApprove}
        />
      )}
    </div>
  );
}

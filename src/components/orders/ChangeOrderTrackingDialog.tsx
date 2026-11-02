"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import { orderService } from "@/services/order-service";
import type { ApiOrder } from "@/types/orders";

interface ChangeOrderTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ApiOrder;
  onChanged: (order: ApiOrder) => void;
}

/**
 * Corrige el número de guía (y, si hace falta, la paquetería) de un envío
 * manual (`PATCH /orders/:id/tracking`). Ese número se captura una sola vez,
 * al marcar la orden como «Enviada», y esa acción no se puede repetir — sin
 * esto un error de dedo (o un número que se dejó en blanco) no tenía arreglo.
 * Solo se monta para órdenes `SHIPPED`/`DELIVERED` sin guía de Enviatodo y
 * roles de órdenes — la API lo exige igual (409/403), esto solo evita ofrecer
 * el botón de más. Pide el motivo (obligatorio). El checkbox de reenvío solo
 * existe mientras la orden sigue «Enviada»: ya entregada, un correo de «va en
 * camino» sería falso.
 */
export function ChangeOrderTrackingDialog({
  open,
  onOpenChange,
  order,
  onChanged,
}: ChangeOrderTrackingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ChangeOrderTrackingForm
            order={order}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeOrderTrackingForm({
  order,
  onClose,
  onChanged,
}: {
  order: ApiOrder;
  onClose: () => void;
  onChanged: (order: ApiOrder) => void;
}) {
  const hadTracking = Boolean(order.trackingNumber);
  const canResend = order.status === "SHIPPED";

  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [reason, setReason] = useState("");
  const [resendLastEmail, setResendLastEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const trimmedTracking = trackingNumber.trim();
  const trimmedCarrier = carrier.trim();
  // Igual que la API: la paquetería solo cuenta si cambió, y el número se
  // compara tal cual (corregir solo mayúsculas/minúsculas sí es un cambio).
  const trackingChanged = trimmedTracking !== (order.trackingNumber ?? "");
  const carrierChanged = trimmedCarrier.length > 0 && trimmedCarrier !== (order.carrier ?? "");
  const canSubmit =
    trimmedTracking.length > 0 &&
    (trackingChanged || carrierChanged) &&
    reason.trim().length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const updated = await orderService.changeOrderTracking(order.id, {
        trackingNumber: trimmedTracking,
        carrier: carrierChanged ? trimmedCarrier : undefined,
        reason: reason.trim(),
        resendLastEmail: canResend ? resendLastEmail : undefined,
      });
      toast.success(
        canResend && resendLastEmail
          ? "Guía corregida. Se reenvió el correo de envío al cliente."
          : "Guía corregida."
      );
      onChanged(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo corregir la guía.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{hadTracking ? "Corregir guía" : "Agregar guía"}</DialogTitle>
        <DialogDescription>
          Pedido {order.orderNumber}
          {hadTracking && (
            <>
              {" "}
              — guía actual:{" "}
              <span className="font-medium break-all text-foreground">{order.trackingNumber}</span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            El cliente verá la guía corregida al rastrear su pedido en la tienda. No cambia el pago,
            el inventario ni el estatus. Solo sirve para guías capturadas a mano: las que genera
            Enviatodo las lleva la paquetería y no se editan.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-tracking-number">Número de guía</Label>
          <Input
            id="order-tracking-number"
            required
            autoFocus
            autoComplete="off"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Ej. CM123456789MX"
            maxLength={100}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-tracking-carrier">Paquetería (opcional)</Label>
          <Input
            id="order-tracking-carrier"
            autoComplete="off"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Ej. Correos de México"
            maxLength={100}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-tracking-reason">Motivo del cambio</Label>
          <Textarea
            id="order-tracking-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Se tecleó un dígito de más al marcar el pedido como enviado."
            rows={3}
          />
        </div>

        {canResend && (
          <div className="flex flex-col gap-1.5">
            <Label className="font-normal">
              <Checkbox
                checked={resendLastEmail}
                onCheckedChange={(checked) => setResendLastEmail(checked === true)}
                aria-label="Reenviar el correo de envío con la guía corregida"
              />
              Reenviar el correo de envío con la guía corregida
            </Label>
            <p className="text-xs text-muted-foreground">
              El cliente ya recibió un correo de «tu pedido va en camino» con la guía anterior; este
              le manda uno nuevo con la correcta.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Guardando..." : hadTracking ? "Corregir guía" : "Agregar guía"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

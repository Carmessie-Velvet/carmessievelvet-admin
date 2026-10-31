"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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

const emailSchema = z.string().email();

interface ChangeOrderEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ApiOrder;
  onChanged: (order: ApiOrder) => void;
}

/**
 * Corrige el correo de una orden de invitado cuando el comprador lo escribió
 * mal en checkout y por eso no le llegan sus correos
 * (`PATCH /orders/:id/email`). Solo se monta para `SUPER_ADMIN` y órdenes sin
 * cuenta (`userId` vacío) — la API lo exige igual (403/409), esto solo evita
 * ofrecer el botón de más. Pide el motivo (obligatorio) y deja claro el
 * efecto: el comprador rastrea la orden con el correo nuevo, y al anterior no
 * se le avisa nada porque casi siempre es el de otra persona.
 */
export function ChangeOrderEmailDialog({
  open,
  onOpenChange,
  order,
  onChanged,
}: ChangeOrderEmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ChangeOrderEmailForm
            order={order}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeOrderEmailForm({
  order,
  onClose,
  onChanged,
}: {
  order: ApiOrder;
  onClose: () => void;
  onChanged: (order: ApiOrder) => void;
}) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [resendLastEmail, setResendLastEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const isValidEmail = emailSchema.safeParse(trimmedEmail).success;
  // La API ya normaliza a minúsculas, así que "A@x.com" y "a@x.com" son el
  // mismo correo — igual que ella, se rechaza antes de ir a la red.
  const isSameEmail = trimmedEmail.toLowerCase() === order.email.trim().toLowerCase();
  const canSubmit = isValidEmail && !isSameEmail && reason.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const updated = await orderService.changeOrderEmail(order.id, {
        email: trimmedEmail,
        reason: reason.trim(),
        resendLastEmail,
      });
      toast.success(
        resendLastEmail
          ? "Correo corregido. Se reenvió el último correo a la dirección nueva."
          : "Correo corregido."
      );
      onChanged(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo corregir el correo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Corregir correo</DialogTitle>
        <DialogDescription>
          Pedido {order.orderNumber} — correo actual:{" "}
          <span className="font-medium break-all text-foreground">{order.email}</span>
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
            Desde ahora el cliente tendrá que usar el correo nuevo (junto con el folio del pedido)
            para rastrear su orden en la tienda; el correo anterior dejará de funcionar. Al correo
            anterior no se le avisa nada. No cambia el pago, el inventario ni el estatus.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-email-new">Correo nuevo</Label>
          <Input
            id="order-email-new"
            type="email"
            required
            autoFocus
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nuevo@correo.com"
            aria-invalid={trimmedEmail.length > 0 && (!isValidEmail || isSameEmail)}
          />
          {isSameEmail && trimmedEmail.length > 0 && (
            <p className="text-xs text-destructive">Es el mismo correo que ya tiene la orden.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-email-reason">Motivo del cambio</Label>
          <Textarea
            id="order-email-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. El cliente escribió mal su correo y avisó por teléfono."
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="font-normal">
            <Checkbox
              checked={resendLastEmail}
              onCheckedChange={(checked) => setResendLastEmail(checked === true)}
              aria-label="Reenviar el último correo al nuevo correo"
            />
            Reenviar el último correo al nuevo correo
          </Label>
          <p className="text-xs text-muted-foreground">
            Se manda el correo que corresponde al estatus actual del pedido (por ejemplo, pedido
            recibido, pago confirmado o enviado).
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Guardando..." : "Corregir correo"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { REFUND_MODE_LABEL, type OrderStatus, type RefundMode } from "@/types/orders";

const REFUND_MODES: RefundMode[] = ["FULL", "FULL_MINUS_SHIPPING", "PARTIAL"];

export interface RefundPayload {
  reason: string;
  refundMode?: RefundMode;
  amount?: number;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: { status: OrderStatus; total: number; shippingTotal: number };
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  defaultRefundMode?: RefundMode;
  onConfirm: (payload: RefundPayload) => Promise<void>;
}

/**
 * Un solo diálogo para las dos acciones que terminan llamando
 * `POST /orders/:id/cancel` — cancelar una orden desde el detalle, o
 * aprobar (reembolsar) una solicitud de devolución desde `/devoluciones`.
 * `refundMode`/`amount` solo se piden si la orden ya se pagó — una orden
 * `PENDING` se cancela sin ningún reembolso, el backend los ignora en ese
 * caso.
 */
export function RefundDialog({
  open,
  onOpenChange,
  order,
  title,
  description,
  confirmLabel,
  destructive,
  defaultRefundMode = "FULL",
  onConfirm,
}: RefundDialogProps) {
  const [reason, setReason] = useState("");
  const [refundMode, setRefundMode] = useState<RefundMode>(defaultRefundMode);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const wasPaid = order.status !== "PENDING";

  function reset() {
    setReason("");
    setRefundMode(defaultRefundMode);
    setAmount("");
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Escribe un motivo.");
      return;
    }

    let parsedAmount: number | undefined;
    if (wasPaid && refundMode === "PARTIAL") {
      parsedAmount = Number(amount);
      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Ingresa un monto válido.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onConfirm({
        reason: reason.trim(),
        ...(wasPaid ? { refundMode, amount: parsedAmount } : {}),
      });
      reset();
      onOpenChange(false);
    } catch {
      // El caller ya mostró el error (toast) — solo evitamos cerrar el
      // diálogo para que el admin pueda corregir y reintentar.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-reason">Motivo</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="¿Por qué se cancela/reembolsa esta orden?"
              rows={3}
            />
          </div>

          {wasPaid ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Monto a reembolsar</Label>
                <Select
                  value={refundMode}
                  onValueChange={(v) => setRefundMode((v as RefundMode) ?? "FULL")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: RefundMode) => REFUND_MODE_LABEL[v]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {REFUND_MODE_LABEL[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {refundMode === "PARTIAL" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="refund-amount">Monto (MXN)</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="200.00"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Total de la orden: {formatCurrency(order.total)}
                {order.shippingTotal > 0 && ` (envío: ${formatCurrency(order.shippingTotal)})`}.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Esta orden nunca se pagó — se cancelará sin ningún reembolso.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api-client";
import { catalogService } from "@/services/catalog-service";
import { orderService } from "@/services/order-service";
import type { ApiProduct, ApiProductVariant } from "@/types/catalog";
import type { ApiOrder, ChangeOrderItemVariantPayload, OrderItem } from "@/types/orders";

interface Combo {
  key: string;
  size: string;
  color: string | null;
  soldOut: boolean;
}

const KEY_SEPARATOR = "\u0000";

function comboKey(size: string | null | undefined, color: string | null | undefined): string {
  return `${size ?? ""}${KEY_SEPARATOR}${color ?? ""}`;
}

function comboLabel(size: string, color: string | null | undefined): string {
  return color ? `${size} · ${color}` : size;
}

/** Combinaciones talla×color distintas que ofrece un producto (o una prenda de un set). */
function buildCombos(variants: ApiProductVariant[], fallbackColor?: string | null): Combo[] {
  const seen = new Set<string>();
  const combos: Combo[] = [];
  for (const variant of variants) {
    const color = variant.color ?? fallbackColor ?? null;
    const key = comboKey(variant.size, color);
    if (seen.has(key)) continue;
    seen.add(key);
    combos.push({ key, size: variant.size, color, soldOut: variant.soldOut });
  }
  return combos;
}

interface ChangeVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ApiOrder;
  item: OrderItem;
  onChanged: (order: ApiOrder) => void;
}

/**
 * Corrige la talla/color de una línea sobre pedido cuando el cliente se
 * equivocó y avisa (`PATCH /orders/:id/items/:itemId/variant`). Pide el
 * motivo (obligatorio) y, antes de llamar a la API, una confirmación
 * explícita con el "antes → después" — el cambio es visible para la
 * clienta y queda en la bitácora de la orden, así que no se hace de un clic.
 */
export function ChangeVariantDialog({
  open,
  onOpenChange,
  order,
  item,
  onChanged,
}: ChangeVariantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ChangeVariantForm
            order={order}
            item={item}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeVariantForm({
  order,
  item,
  onClose,
  onChanged,
}: {
  order: ApiOrder;
  item: OrderItem;
  onClose: () => void;
  onChanged: (order: ApiOrder) => void;
}) {
  const { confirm } = useConfirmDialog();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Elección por línea simple (`simpleKey`) o por prenda de un set
  // (`selectionKeys`, indexado por `OrderItemSelection.id`). Vacío = sin tocar.
  const [simpleKey, setSimpleKey] = useState<string | null>(null);
  const [selectionKeys, setSelectionKeys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSet = (item.selections?.length ?? 0) > 0;

  useEffect(() => {
    let cancelled = false;

    if (!item.productSku) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoadError("Este artículo no tiene SKU — no se puede consultar el catálogo.");
      });
      return () => {
        cancelled = true;
      };
    }

    catalogService
      .getProduct(item.productSku)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "El producto ya no existe en el catálogo, no hay contra qué validar el cambio."
            : err instanceof ApiError
              ? err.message
              : "No se pudo cargar el producto."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [item.productSku]);

  const currentSimpleKey = comboKey(item.size, item.color);
  const simpleCombos = product ? buildCombos(product.variants, product.color) : [];
  const effectiveSimpleKey = simpleKey ?? currentSimpleKey;

  const changedSelections = (item.selections ?? []).filter((selection) => {
    const chosen = selectionKeys[selection.id];
    return chosen !== undefined && chosen !== comboKey(selection.size, selection.color);
  });

  const hasChange = isSet ? changedSelections.length > 0 : effectiveSimpleKey !== currentSimpleKey;
  const canSubmit = hasChange && reason.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!product) return;
    if (!reason.trim()) {
      toast.error("Escribe un motivo.");
      return;
    }

    const payload: ChangeOrderItemVariantPayload = { reason: reason.trim() };
    const summary: string[] = [];

    if (isSet) {
      payload.selections = [];
      for (const selection of changedSelections) {
        const component = product.components.find((c) => c.name === selection.componentName);
        const combo = component
          ? buildCombos(component.variants).find((c) => c.key === selectionKeys[selection.id])
          : undefined;
        if (!component || !combo) {
          toast.error(`No se encontró la prenda "${selection.componentName}" en el catálogo.`);
          return;
        }
        payload.selections.push({
          componentId: component.id,
          size: combo.size,
          ...(combo.color ? { color: combo.color } : {}),
        });
        summary.push(
          `${selection.componentName}: ${comboLabel(selection.size, selection.color)} → ${comboLabel(combo.size, combo.color)}`
        );
      }
    } else {
      const combo = simpleCombos.find((c) => c.key === effectiveSimpleKey);
      if (!combo) {
        toast.error("Elige una talla válida.");
        return;
      }
      payload.size = combo.size;
      if (combo.color) payload.color = combo.color;
      summary.push(
        `${comboLabel(item.size ?? "", item.color)} → ${comboLabel(combo.size, combo.color)}`
      );
    }

    const confirmed = await confirm({
      title: "¿Confirmar el cambio de talla?",
      description:
        `${item.productName} (pedido ${order.orderNumber}): ${summary.join("; ")}. ` +
        "La clienta verá la talla corregida en su pedido y el cambio quedará registrado en la bitácora. " +
        "No cambia el precio ni el inventario, y no se le envía ningún correo.",
      confirmLabel: "Sí, cambiar talla",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const updated = await orderService.changeItemVariant(order.id, item.id, payload);
      toast.success("Talla actualizada.");
      onChanged(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar la talla.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambiar talla o color</DialogTitle>
        <DialogDescription>
          {item.productName} — solo para pedidos sobre pedido que aún no se envían. El precio no cambia.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {!product && !loadError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando tallas disponibles...
          </div>
        )}

        {loadError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        )}

        {product && !isSet && (
          <div className="flex flex-col gap-1.5">
            <Label>Talla / color</Label>
            <p className="text-xs text-muted-foreground">
              Actual: {comboLabel(item.size ?? "—", item.color)}
            </p>
            <Select value={effectiveSimpleKey} onValueChange={(v) => setSimpleKey(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => {
                    const combo = simpleCombos.find((c) => c.key === v);
                    return combo ? comboLabel(combo.size, combo.color) : comboLabel(item.size ?? "—", item.color);
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {simpleCombos.map((combo) => (
                  <SelectItem
                    key={combo.key}
                    value={combo.key}
                    disabled={combo.soldOut && combo.key !== currentSimpleKey}
                  >
                    {comboLabel(combo.size, combo.color)}
                    {combo.key === currentSimpleKey ? " (actual)" : ""}
                    {combo.soldOut ? " — agotada" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {product &&
          isSet &&
          (item.selections ?? []).map((selection) => {
            const component = product.components.find((c) => c.name === selection.componentName);
            const combos = component ? buildCombos(component.variants) : [];
            const currentKey = comboKey(selection.size, selection.color);
            const value = selectionKeys[selection.id] ?? currentKey;
            return (
              <div key={selection.id} className="flex flex-col gap-1.5">
                <Label>{selection.componentName}</Label>
                <p className="text-xs text-muted-foreground">
                  Actual: {comboLabel(selection.size, selection.color)}
                </p>
                {component ? (
                  <Select
                    value={value}
                    onValueChange={(v) =>
                      setSelectionKeys((prev) => ({ ...prev, [selection.id]: v as string }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => {
                          const combo = combos.find((c) => c.key === v);
                          return combo
                            ? comboLabel(combo.size, combo.color)
                            : comboLabel(selection.size, selection.color);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {combos.map((combo) => (
                        <SelectItem
                          key={combo.key}
                          value={combo.key}
                          disabled={combo.soldOut && combo.key !== currentKey}
                        >
                          {comboLabel(combo.size, combo.color)}
                          {combo.key === currentKey ? " (actual)" : ""}
                          {combo.soldOut ? " — agotada" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-destructive">
                    Esta prenda ya no existe en el catálogo — no se puede cambiar.
                  </p>
                )}
              </div>
            );
          })}

        {product && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="variant-change-reason">Motivo del cambio</Label>
            <Textarea
              id="variant-change-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. El cliente llamó para cambiar de talla M a S."
              rows={3}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit || !product}>
          {submitting ? "Guardando..." : "Guardar cambio"}
        </Button>
      </DialogFooter>
    </>
  );
}

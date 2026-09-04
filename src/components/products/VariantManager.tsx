"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Variant {
  size: string;
  stock: number;
  soldOut: boolean;
}

interface VariantManagerProps {
  value: Variant[];
  onChange: (variants: Variant[]) => void;
  sizes: string[];
  /**
   * Sobre pedido: el stock no determina si se puede comprar, así que el
   * input queda deshabilitado (se conserva el valor por si algún día vuelve
   * a venderse con inventario) — solo `soldOut` importa mientras esté activo.
   */
  madeToOrder: boolean;
}

/**
 * Un campo de stock + un check de "Agotado" por talla — el tamaño de la
 * grilla es fijo (XS/S/M/L), así que no hace falta agregar/quitar filas.
 */
export function VariantManager({
  value,
  onChange,
  sizes,
  madeToOrder,
}: VariantManagerProps) {
  function variantFor(size: string): Variant {
    return value.find((v) => v.size === size) ?? { size, stock: 0, soldOut: false };
  }

  function update(size: string, patch: Partial<Variant>) {
    onChange(
      sizes.map((s) => {
        const current = variantFor(s);
        return s === size ? { ...current, ...patch } : current;
      })
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {sizes.map((size) => {
        const variant = variantFor(size);
        return (
          <div
            key={size}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Talla {size}
            </span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={madeToOrder}
              value={variant.stock}
              onChange={(e) =>
                update(size, { stock: Math.max(0, Number(e.target.value) || 0) })
              }
              aria-label={`Stock talla ${size}`}
            />
            <Label className="text-xs font-normal text-muted-foreground">
              <Checkbox
                checked={variant.soldOut}
                onCheckedChange={(checked) => update(size, { soldOut: checked })}
                aria-label={`Marcar talla ${size} como agotada`}
              />
              Agotado
            </Label>
          </div>
        );
      })}
    </div>
  );
}

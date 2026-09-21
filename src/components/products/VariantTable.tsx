"use client";

import { PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface VariantRow {
  size: string;
  color: string;
  stock: number;
  soldOut: boolean;
}

interface VariantTableProps {
  value: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
  sizes: string[];
  /** Igual que en el resto del formulario de producto — sobre pedido deshabilita el stock, no el color/talla. */
  madeToOrder: boolean;
  /** Debajo de este número de filas, el botón de eliminar se deshabilita (siempre debe quedar al menos una). Default 1. */
  minRows?: number;
}

/**
 * Tabla de variantes talla×color con filas agregables/eliminables — a
 * diferencia de una grilla de tamaño fijo, una talla puede repetirse con un
 * color distinto (mismo producto, varios colores) o no aparecer en absoluto.
 * Compartida por `ComponentManager` (una tabla por prenda de un set) y
 * `VariantManager` (una sola tabla para un producto `SIMPLE`, que desde que
 * el color vive por variante también puede ofrecer más de uno).
 */
export function VariantTable({
  value,
  onChange,
  sizes,
  madeToOrder,
  minRows = 1,
}: VariantTableProps) {
  function addVariant() {
    onChange([...value, { size: sizes[0] ?? "", color: "", stock: 0, soldOut: false }]);
  }

  function removeVariant(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((variant, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[5rem_1fr_5rem_auto_auto]"
        >
          <Select
            value={variant.size}
            onValueChange={(v) => updateVariant(index, { size: v ?? sizes[0] })}
          >
            <SelectTrigger className="w-full" aria-label="Talla">
              <SelectValue>{(v: string) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={variant.color}
            onChange={(e) => updateVariant(index, { color: e.target.value })}
            placeholder="Color (opcional)"
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            disabled={madeToOrder}
            value={variant.stock}
            onChange={(e) =>
              updateVariant(index, { stock: Math.max(0, Number(e.target.value) || 0) })
            }
            placeholder="Stock"
            aria-label="Stock"
          />
          <Label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Checkbox
              checked={variant.soldOut}
              onCheckedChange={(checked) => updateVariant(index, { soldOut: checked })}
              aria-label="Marcar como agotada"
            />
            Agotado
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={value.length <= minRows}
            onClick={() => removeVariant(index)}
            aria-label="Eliminar variante"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addVariant}>
        <PlusCircle className="size-3.5" />
        Agregar talla/color
      </Button>
    </div>
  );
}

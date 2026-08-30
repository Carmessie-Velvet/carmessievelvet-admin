"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import type { Color, ProductVariant } from "@/types/product";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VariantManagerProps {
  value: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  colors: Color[];
  sizes: string[];
}

function makeId() {
  return `variant-${Math.random().toString(36).slice(2, 10)}`;
}

function variantKey(color: string, size: string) {
  return `${color.trim().toLowerCase()}__${size.trim().toLowerCase()}`;
}

export function VariantManager({
  value,
  onChange,
  colors,
  sizes,
}: VariantManagerProps) {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const duplicateKeys = useMemo(() => {
    const seen = new Map<string, number>();
    for (const variant of value) {
      const key = variantKey(variant.color, variant.size);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return new Set(
      [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key)
    );
  }, [value]);

  function toggle(setList: Dispatch<SetStateAction<string[]>>, item: string) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function generateCombinations() {
    if (selectedColors.length === 0 || selectedSizes.length === 0) return;

    const existingKeys = new Set(
      value.map((v) => variantKey(v.color, v.size))
    );
    const next = [...value];

    for (const color of selectedColors) {
      for (const size of selectedSizes) {
        const key = variantKey(color, size);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        next.push({ id: makeId(), color, size, stock: 0 });
      }
    }

    onChange(next);
  }

  function addEmptyRow() {
    onChange([...value, { id: makeId(), color: "", size: "", stock: 0 }]);
  }

  function updateRow(id: string, patch: Partial<ProductVariant>) {
    onChange(value.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeRow(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">Generador rápido</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Elige colores y talles, y se crea una variante por cada combinación.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => toggle(setSelectedColors, color.name)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                selectedColors.includes(color.name)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <span
                className="size-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggle(setSelectedSizes, size)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                selectedSizes.includes(size)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {size}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 gap-1.5"
          disabled={selectedColors.length === 0 || selectedSizes.length === 0}
          onClick={generateCombinations}
        >
          <Wand2 className="size-3.5" />
          Generar variantes
        </Button>
      </div>

      <div className="space-y-2">
        {value.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Todavía no hay variantes. Usa el generador rápido o agrega una fila manualmente.
          </p>
        )}

        {value.map((variant) => {
          const isDuplicate = duplicateKeys.has(
            variantKey(variant.color, variant.size)
          );
          return (
            <div
              key={variant.id}
              className={cn(
                "grid grid-cols-[1fr_1fr_5.5rem_2rem] items-center gap-2 rounded-lg border p-2",
                isDuplicate ? "border-destructive/50 bg-destructive/5" : "border-border"
              )}
            >
              <Select
                value={variant.color || null}
                onValueChange={(color) => updateRow(variant.id, { color: color ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.id} value={color.name}>
                      <span
                        className="mr-1.5 inline-block size-2.5 rounded-full border border-black/10 align-middle"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={variant.size || null}
                onValueChange={(size) => updateRow(variant.id, { size: size ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Talle" />
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
                type="number"
                min={0}
                inputMode="numeric"
                value={variant.stock}
                onChange={(e) =>
                  updateRow(variant.id, {
                    stock: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                aria-label="Stock"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(variant.id)}
                aria-label="Quitar variante"
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          );
        })}

        {duplicateKeys.size > 0 && (
          <p className="text-xs text-destructive">
            Hay variantes repetidas con el mismo color y talle — ajústalas antes de guardar.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addEmptyRow}
        >
          <Plus className="size-3.5" />
          Agregar variante
        </Button>
      </div>
    </div>
  );
}

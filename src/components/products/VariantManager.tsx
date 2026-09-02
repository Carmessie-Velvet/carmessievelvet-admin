"use client";

import { Input } from "@/components/ui/input";

interface Variant {
  size: string;
  stock: number;
}

interface VariantManagerProps {
  value: Variant[];
  onChange: (variants: Variant[]) => void;
  sizes: string[];
}

/**
 * One stock field per size — the API only tracks stock per size (no color
 * axis yet), and the size set is fixed (XS/S/M/L), so there's nothing to
 * add/remove here, unlike the old color x size combination generator.
 */
export function VariantManager({ value, onChange, sizes }: VariantManagerProps) {
  function stockFor(size: string): number {
    return value.find((v) => v.size === size)?.stock ?? 0;
  }

  function setStock(size: string, stock: number) {
    onChange(sizes.map((s) => ({ size: s, stock: s === size ? stock : stockFor(s) })));
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {sizes.map((size) => (
        <div
          key={size}
          className="flex flex-col gap-1.5 rounded-lg border border-border p-3"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Talla {size}
          </span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={stockFor(size)}
            onChange={(e) =>
              setStock(size, Math.max(0, Number(e.target.value) || 0))
            }
            aria-label={`Stock talla ${size}`}
          />
        </div>
      ))}
    </div>
  );
}

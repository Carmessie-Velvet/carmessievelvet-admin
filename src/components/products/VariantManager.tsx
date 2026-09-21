"use client";

import { VariantTable, type VariantRow } from "@/components/products/VariantTable";

interface VariantManagerProps {
  value: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
  sizes: string[];
  /**
   * Sobre pedido: el stock no determina si se puede comprar, así que el
   * input queda deshabilitado (se conserva el valor por si algún día vuelve
   * a venderse con inventario) — solo `soldOut` importa mientras esté activo.
   */
  madeToOrder: boolean;
}

/**
 * Variantes talla×color de un producto `SIMPLE` — desde que el color vive
 * por variante (no solo a nivel producto, ver "Color" en el `CLAUDE.md` de
 * la API) puede ofrecer más de uno: la misma talla repetida con un color
 * distinto es una variante legítima, no un duplicado. Delgado sobre
 * `VariantTable`, que también arma la tabla de variantes de cada prenda de
 * un set (`ComponentManager`).
 */
export function VariantManager({ value, onChange, sizes, madeToOrder }: VariantManagerProps) {
  return <VariantTable value={value} onChange={onChange} sizes={sizes} madeToOrder={madeToOrder} />;
}

"use client";

import { PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VariantTable, type VariantRow } from "@/components/products/VariantTable";

type ComponentVariant = VariantRow;

interface ProductComponent {
  name: string;
  variants: ComponentVariant[];
}

interface ComponentManagerProps {
  value: ProductComponent[];
  onChange: (components: ProductComponent[]) => void;
  sizes: string[];
  /** Igual que en `VariantManager` — sobre pedido deshabilita el stock, no el color/talla. */
  madeToOrder: boolean;
}

/** Una fila por talla, igual que el arranque de `VariantManager` — el admin quita/agrega desde ahí si la prenda no usa todas las tallas o necesita más de un color. */
function defaultVariants(sizes: string[]): ComponentVariant[] {
  return sizes.map((size) => ({ size, color: "", stock: 0, soldOut: false }));
}

/**
 * Gestor de "prendas" (`components`) para un producto en una categoría
 * `SET` — cada prenda tiene su propio nombre y su propia tabla de
 * variantes talla×color (a diferencia de `VariantManager`, acá sí hace
 * falta agregar/quitar filas: una prenda puede tener el mismo color en
 * varias tallas, o varios colores, sin una grilla fija).
 */
export function ComponentManager({
  value,
  onChange,
  sizes,
  madeToOrder,
}: ComponentManagerProps) {
  function addComponent() {
    onChange([
      ...value,
      { name: "", variants: defaultVariants(sizes) },
    ]);
  }

  function removeComponent(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateComponent(index: number, patch: Partial<ProductComponent>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((component, componentIndex) => (
        <div
          key={componentIndex}
          className="flex flex-col gap-3 rounded-lg border border-border p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              value={component.name}
              onChange={(e) => updateComponent(componentIndex, { name: e.target.value })}
              placeholder='Nombre de la prenda (ej. "Top", "Panty")'
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeComponent(componentIndex)}
              aria-label="Eliminar prenda"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>

          <VariantTable
            value={component.variants}
            onChange={(variants) => updateComponent(componentIndex, { variants })}
            sizes={sizes}
            madeToOrder={madeToOrder}
          />
        </div>
      ))}

      <Button type="button" variant="outline" className="w-fit gap-1.5" onClick={addComponent}>
        <PlusCircle className="size-4" />
        Agregar prenda
      </Button>
      {value.length < 2 && (
        <p className="text-xs text-muted-foreground">
          Un set necesita al menos 2 prendas (ej. &ldquo;Top&rdquo; y &ldquo;Panty&rdquo;).
        </p>
      )}
    </div>
  );
}

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

interface ComponentVariant {
  size: string;
  color: string;
  stock: number;
  soldOut: boolean;
}

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

function emptyVariant(sizes: string[]): ComponentVariant {
  return { size: sizes[0] ?? "", color: "", stock: 0, soldOut: false };
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

  function addVariant(componentIndex: number) {
    const component = value[componentIndex];
    updateComponent(componentIndex, {
      variants: [...component.variants, emptyVariant(sizes)],
    });
  }

  function removeVariant(componentIndex: number, variantIndex: number) {
    const component = value[componentIndex];
    updateComponent(componentIndex, {
      variants: component.variants.filter((_, i) => i !== variantIndex),
    });
  }

  function updateVariant(
    componentIndex: number,
    variantIndex: number,
    patch: Partial<ComponentVariant>
  ) {
    const component = value[componentIndex];
    updateComponent(componentIndex, {
      variants: component.variants.map((v, i) =>
        i === variantIndex ? { ...v, ...patch } : v
      ),
    });
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

          <div className="flex flex-col gap-2">
            {component.variants.map((variant, variantIndex) => (
              <div
                key={variantIndex}
                className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[5rem_1fr_5rem_auto_auto]"
              >
                <Select
                  value={variant.size}
                  onValueChange={(v) =>
                    updateVariant(componentIndex, variantIndex, { size: v ?? sizes[0] })
                  }
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
                  onChange={(e) =>
                    updateVariant(componentIndex, variantIndex, { color: e.target.value })
                  }
                  placeholder="Color (opcional)"
                />
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={madeToOrder}
                  value={variant.stock}
                  onChange={(e) =>
                    updateVariant(componentIndex, variantIndex, {
                      stock: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  placeholder="Stock"
                  aria-label="Stock"
                />
                <Label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Checkbox
                    checked={variant.soldOut}
                    onCheckedChange={(checked) =>
                      updateVariant(componentIndex, variantIndex, { soldOut: checked })
                    }
                    aria-label="Marcar como agotada"
                  />
                  Agotado
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={component.variants.length <= 1}
                  onClick={() => removeVariant(componentIndex, variantIndex)}
                  aria-label="Eliminar variante"
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            onClick={() => addVariant(componentIndex)}
          >
            <PlusCircle className="size-3.5" />
            Agregar talla/color
          </Button>
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

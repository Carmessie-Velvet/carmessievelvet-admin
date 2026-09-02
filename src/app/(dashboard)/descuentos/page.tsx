"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Percent, Pencil, Trash2, X } from "lucide-react";
import { discountService } from "@/services/discount-service";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ApiProduct } from "@/types/catalog";
import type { ApiProductDiscount } from "@/types/discounts";

const discountFormSchema = z
  .object({
    name: z.string().max(100, "Máximo 100 caracteres"),
    percentage: z
      .number({
        required_error: "Ingresa un porcentaje",
        invalid_type_error: "Ingresa un porcentaje válido",
      })
      .min(0.01, "Debe ser mayor a 0")
      .max(100, "Máximo 100"),
    endsAt: z.string(),
    durationHours: z.union([z.number(), z.nan()]),
    productIds: z.array(z.string()).min(1, "Selecciona al menos un producto"),
  })
  .refine((v) => !(v.endsAt && !Number.isNaN(v.durationHours)), {
    message: "Elige fecha de fin O duración en horas, no ambas",
    path: ["endsAt"],
  });

type DiscountFormValues = z.infer<typeof discountFormSchema>;

const emptyValues: DiscountFormValues = {
  name: "",
  percentage: 10,
  endsAt: "",
  durationHours: NaN,
  productIds: [],
};

function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export default function DiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<ApiProductDiscount[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([discountService.getDiscounts(), catalogService.getProducts()])
      .then(([loadedDiscounts, loadedProducts]) => {
        if (cancelled) return;
        setDiscounts(loadedDiscounts);
        setProducts(loadedProducts);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los descuentos.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredProducts = useMemo(() => {
    if (!productFilter.trim()) return products;
    const q = productFilter.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productFilter]);

  function startEdit(discount: ApiProductDiscount) {
    setEditingId(discount.id);
    form.reset({
      name: discount.name ?? "",
      percentage: discount.percentage,
      endsAt: toLocalInputValue(discount.endsAt),
      durationHours: NaN,
      productIds: discount.products.map((p) => p.id),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    form.reset(emptyValues);
  }

  async function onSubmit(values: DiscountFormValues) {
    const payload = {
      name: values.name || undefined,
      percentage: values.percentage,
      endsAt: fromLocalInputValue(values.endsAt),
      durationHours: Number.isNaN(values.durationHours)
        ? undefined
        : values.durationHours,
      productIds: values.productIds,
    };

    try {
      if (editingId) {
        const updated = await discountService.updateDiscount(editingId, payload);
        setDiscounts((prev) =>
          prev?.map((d) => (d.id === editingId ? updated : d)) ?? prev
        );
        toast.success("Descuento actualizado.");
      } else {
        const created = await discountService.createDiscount(payload);
        setDiscounts((prev) => (prev ? [created, ...prev] : [created]));
        toast.success("Descuento creado.");
      }
      cancelEdit();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo guardar el descuento."
      );
    }
  }

  async function toggleStatus(discount: ApiProductDiscount) {
    setBusyId(discount.id);
    try {
      const updated = await discountService.setDiscountStatus(
        discount.id,
        !discount.enabled
      );
      setDiscounts((prev) =>
        prev?.map((d) => (d.id === discount.id ? updated : d)) ?? prev
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(discount: ApiProductDiscount) {
    if (!window.confirm(`¿Eliminar el descuento "${discount.name ?? discount.percentage + "%"}"?`))
      return;

    setBusyId(discount.id);
    try {
      await discountService.deleteDiscount(discount.id);
      setDiscounts((prev) => prev?.filter((d) => d.id !== discount.id) ?? prev);
      if (editingId === discount.id) cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Descuentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Porcentaje aplicado directo al precio de uno o varios productos, sin
          necesidad de código. Un producto solo puede tener un descuento activo
          a la vez.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Percent className="size-4" />
              </span>
              <div>
                <CardTitle>{editingId ? "Editar descuento" : "Nuevo descuento"}</CardTitle>
                <CardDescription>
                  {editingId
                    ? "Los cambios reemplazan la campaña existente."
                    : "Aplica un % a los productos que elijas."}
                </CardDescription>
              </div>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={cancelEdit}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Venta de verano" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porcentaje</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          max={100}
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              Number.isNaN(e.target.valueAsNumber)
                                ? 0
                                : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termina el (opcional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O dura (horas desde ahora)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Ej. 6"
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? NaN : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="productIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Productos ({field.value.length} seleccionados)</FormLabel>
                    <Input
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      placeholder="Filtrar productos..."
                      className="mb-2"
                    />
                    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
                      {filteredProducts.map((product) => {
                        const checked = field.value.includes(product.id);
                        return (
                          <label
                            key={product.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                field.onChange(
                                  checked
                                    ? field.value.filter((id) => id !== product.id)
                                    : [...field.value, product.id]
                                )
                              }
                              className="size-3.5"
                            />
                            <span className="flex-1">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(product.price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : editingId
                      ? "Guardar cambios"
                      : "Crear descuento"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {!discounts && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {discounts && discounts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay campañas de descuento.
        </div>
      )}

      {discounts && discounts.length > 0 && (
        <div className="flex flex-col gap-2">
          {discounts.map((discount) => (
            <div
              key={discount.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {discount.name ?? `Descuento ${discount.percentage}%`}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {discount.percentage}% · {discount.products.length} producto
                    {discount.products.length === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {discount.endsAt
                    ? `Termina ${new Date(discount.endsAt).toLocaleString("es-MX")}`
                    : "Sin fecha de fin"}
                </p>
              </div>
              <Badge variant={discount.isCurrentlyValid ? "default" : "secondary"}>
                {discount.isCurrentlyValid ? "Vigente" : discount.enabled ? "Programado" : "Deshabilitado"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === discount.id}
                onClick={() => toggleStatus(discount)}
              >
                {discount.enabled ? "Deshabilitar" : "Habilitar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(discount)}
                aria-label="Editar"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busyId === discount.id}
                onClick={() => handleDelete(discount)}
                aria-label="Eliminar"
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

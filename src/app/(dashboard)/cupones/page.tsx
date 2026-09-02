"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Ticket, Trash2, X } from "lucide-react";
import { couponService } from "@/services/coupon-service";
import { ApiError } from "@/lib/api-client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ApiCoupon, DiscountType } from "@/types/coupons";

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  PERCENTAGE: "Porcentaje",
  FIXED_AMOUNT: "Monto fijo",
};

const couponFormSchema = z.object({
  code: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z0-9]{8}$/.test(v), {
      message: "8 caracteres alfanuméricos, o vacío para autogenerar",
    }),
  description: z.string().max(200, "Máximo 200 caracteres"),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z
    .number({
      required_error: "Ingresa un valor",
      invalid_type_error: "Ingresa un valor válido",
    })
    .positive("Debe ser mayor a 0"),
  maxUses: z.union([z.number(), z.nan()]),
  enabled: z.boolean(),
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

const emptyValues: CouponFormValues = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  maxUses: NaN,
  enabled: true,
};

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<ApiCoupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    let cancelled = false;

    couponService
      .getCoupons()
      .then((data) => {
        if (!cancelled) setCoupons(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los cupones.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function startEdit(coupon: ApiCoupon) {
    setEditingId(coupon.id);
    form.reset({
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses ?? NaN,
      enabled: coupon.enabled,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    form.reset(emptyValues);
  }

  async function onSubmit(values: CouponFormValues) {
    const common = {
      description: values.description || undefined,
      discountType: values.discountType,
      discountValue: values.discountValue,
      maxUses: Number.isNaN(values.maxUses) ? undefined : values.maxUses,
      enabled: values.enabled,
    };

    try {
      if (editingId) {
        const updated = await couponService.updateCoupon(editingId, common);
        setCoupons((prev) => prev?.map((c) => (c.id === editingId ? updated : c)) ?? prev);
        toast.success("Cupón actualizado.");
      } else {
        const created = await couponService.createCoupon({
          ...common,
          code: values.code || undefined,
        });
        setCoupons((prev) => (prev ? [created, ...prev] : [created]));
        toast.success(`Cupón "${created.code}" creado.`);
      }
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar el cupón.");
    }
  }

  async function toggleStatus(coupon: ApiCoupon) {
    setBusyId(coupon.id);
    try {
      const updated = await couponService.setCouponStatus(coupon.id, !coupon.enabled);
      setCoupons((prev) => prev?.map((c) => (c.id === coupon.id ? updated : c)) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(coupon: ApiCoupon) {
    if (!window.confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;

    setBusyId(coupon.id);
    try {
      await couponService.deleteCoupon(coupon.id);
      setCoupons((prev) => prev?.filter((c) => c.id !== coupon.id) ?? prev);
      if (editingId === coupon.id) cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cupones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Códigos que el comprador ingresa en el checkout para obtener un
          descuento.
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
                <Ticket className="size-4" />
              </span>
              <div>
                <CardTitle>{editingId ? "Editar cupón" : "Nuevo cupón"}</CardTitle>
                <CardDescription>
                  {editingId
                    ? "El código no se puede cambiar una vez creado."
                    : "Deja el código vacío para generarlo automático."}
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
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. VERANO25"
                          disabled={!!editingId}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Campaña de verano 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {(value: DiscountType) => DISCOUNT_TYPE_LABEL[value]}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">Monto fijo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usos máx. (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Ilimitado"
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? NaN : e.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                      : "Crear cupón"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {!coupons && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {coupons && coupons.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay cupones.
        </div>
      )}

      {coupons && coupons.length > 0 && (
        <div className="flex flex-col gap-2">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex-1">
                <p className="font-mono text-sm font-medium">{coupon.code}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {coupon.discountType === "PERCENTAGE"
                    ? `${coupon.discountValue}%`
                    : formatMoney(coupon.discountValue)}{" "}
                  · {coupon.usedCount} usado{coupon.usedCount === 1 ? "" : "s"}
                  {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                </p>
              </div>
              <Badge variant={coupon.isCurrentlyValid ? "default" : "secondary"}>
                {coupon.isCurrentlyValid ? "Vigente" : coupon.enabled ? "Programado" : "Deshabilitado"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === coupon.id}
                onClick={() => toggleStatus(coupon)}
              >
                {coupon.enabled ? "Deshabilitar" : "Habilitar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(coupon)}
                aria-label="Editar"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busyId === coupon.id}
                onClick={() => handleDelete(coupon)}
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

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

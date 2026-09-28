"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, MessageSquareQuote, Pencil, Star, Trash2, X } from "lucide-react";
import { testimonialService } from "@/services/testimonial-service";
import { ApiError } from "@/lib/api-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SectionIcon } from "@/components/ui/section-icon";
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
import { cn } from "@/lib/utils";
import type { ApiTestimonial } from "@/types/testimonials";

const testimonialFormSchema = z.object({
  customerName: z.string().trim().min(1, "Escribe el nombre del cliente").max(120),
  comment: z.string().trim().min(1, "Escribe el comentario").max(2000),
  rating: z.number().int().min(1).max(5),
  commentedAt: z.string().min(1, "Elige una fecha"),
});

type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD", mismo formato que espera la API
}

function emptyValues(): TestimonialFormValues {
  return { customerName: "", comment: "", rating: 5, commentedAt: todayIso() };
}

function valuesFromTestimonial(t: ApiTestimonial): TestimonialFormValues {
  return {
    customerName: t.customerName,
    comment: t.comment,
    rating: t.rating,
    commentedAt: t.commentedAt,
  };
}

/** Selector de 1-5 estrellas, clic directo — sin opción de "sin calificación" porque la API siempre guarda un valor (ver `types/testimonials.ts`). */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
          className="p-0.5"
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("size-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [testimonials, setTestimonials] = useState<ApiTestimonial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: emptyValues(),
  });

  const rating = useWatch({ control: form.control, name: "rating" });

  useEffect(() => {
    let cancelled = false;

    testimonialService
      .getTestimonials()
      .then((page) => {
        if (!cancelled) setTestimonials(page.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los testimonios.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function startEdit(t: ApiTestimonial) {
    setEditingId(t.id);
    form.reset(valuesFromTestimonial(t));
  }

  function cancelEdit() {
    setEditingId(null);
    form.reset(emptyValues());
  }

  async function onSubmit(values: TestimonialFormValues) {
    try {
      if (editingId) {
        const updated = await testimonialService.updateTestimonial(editingId, values);
        setTestimonials((prev) => prev?.map((t) => (t.id === editingId ? updated : t)) ?? prev);
        toast.success("Testimonio actualizado.");
      } else {
        const created = await testimonialService.createTestimonial(values);
        setTestimonials((prev) => (prev ? [created, ...prev] : [created]));
        toast.success("Testimonio creado.");
      }
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar el testimonio.");
    }
  }

  async function toggleVisibility(t: ApiTestimonial) {
    setBusyId(t.id);
    try {
      const updated = await testimonialService.setVisibility(t.id, !t.visible);
      setTestimonials((prev) => prev?.map((x) => (x.id === t.id ? updated : x)) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(t: ApiTestimonial) {
    const ok = await confirm({
      title: `¿Eliminar el testimonio de "${t.customerName}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(t.id);
    try {
      await testimonialService.deleteTestimonial(t.id);
      setTestimonials((prev) => prev?.filter((x) => x.id !== t.id) ?? prev);
      if (editingId === t.id) cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Testimonios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reseñas de clientes que se muestran en la tienda, después de lo último agregado.
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
              <SectionIcon icon={MessageSquareQuote} index={0} />
              <div>
                <CardTitle>{editingId ? "Editar testimonio" : "Nuevo testimonio"}</CardTitle>
                <CardDescription>
                  Escríbelo tal cual lo dijo el cliente — nombre, comentario y calificación.
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
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. María González" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commentedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha del comentario</FormLabel>
                      <FormControl>
                        <Input type="date" max={todayIso()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentario</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Excelente calidad y envío muy rápido..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Calificación</FormLabel>
                <div className="mt-1.5">
                  <StarPicker value={rating} onChange={(v) => form.setValue("rating", v, { shouldDirty: true })} />
                </div>
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
                      : "Crear testimonio"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {!testimonials && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {testimonials && testimonials.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay testimonios.
        </div>
      )}

      {testimonials && testimonials.length > 0 && (
        <div className="flex flex-col gap-2">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{t.customerName}</p>
                  <StarDisplay rating={t.rating} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.comment}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(`${t.commentedAt}T00:00:00`).toLocaleDateString("es-MX")}
                </p>
              </div>
              <Badge variant={t.visible ? "default" : "secondary"}>
                {t.visible ? "Visible" : "Oculto"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === t.id}
                onClick={() => toggleVisibility(t)}
                className="gap-1.5"
              >
                {t.visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {t.visible ? "Ocultar" : "Mostrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(t)}
                aria-label="Editar"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busyId === t.id}
                onClick={() => handleDelete(t)}
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

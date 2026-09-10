"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers3, Loader2, Pencil, Trash2, X } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ApiCategory, CategoryType } from "@/types/catalog";

const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  SIMPLE: "Simple",
  SET: "Set (varias prendas)",
};

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Requerido"),
  description: z.string().max(200, "Máximo 200 caracteres"),
  type: z.enum(["SIMPLE", "SET"]),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const emptyValues: CategoryFormValues = {
  name: "",
  description: "",
  type: "SIMPLE",
  active: true,
};

export default function CategoriesPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    let cancelled = false;

    catalogService
      .getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las categorías.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function startEdit(category: ApiCategory) {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      description: category.description ?? "",
      type: category.type,
      active: category.active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    form.reset(emptyValues);
  }

  async function onSubmit(values: CategoryFormValues) {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      type: values.type,
      active: values.active,
    };

    try {
      if (editingId) {
        const updated = await catalogService.updateCategory(editingId, payload);
        setCategories((prev) => prev?.map((c) => (c.id === editingId ? updated : c)) ?? prev);
        toast.success("Categoría actualizada.");
      } else {
        const created = await catalogService.createCategory(payload);
        setCategories((prev) => (prev ? [...prev, created] : [created]));
        toast.success(`Categoría "${created.name}" creada.`);
      }
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar la categoría.");
    }
  }

  async function handleDelete(category: ApiCategory) {
    const ok = await confirm({
      title: `¿Eliminar la categoría "${category.name}"?`,
      description: "Solo se puede borrar si ya no tiene productos dentro.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(category.id);
    try {
      await catalogService.deleteCategory(category.id);
      setCategories((prev) => prev?.filter((c) => c.id !== category.id) ?? prev);
      if (editingId === category.id) cancelEdit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar la categoría.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El tipo decide cómo se arma cada producto dentro: &ldquo;Simple&rdquo; es una
          sola prenda con talla/color propios; &ldquo;Set&rdquo; se compone de varias
          prendas (ej. top + panty), cada una con su propia talla y color.
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
              <SectionIcon icon={Layers3} index={0} />
              <div>
                <CardTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</CardTitle>
                <CardDescription>
                  {editingId
                    ? "Cambiar el tipo falla si ya hay productos dentro de esta categoría."
                    : "El tipo no se puede cambiar después si ya hay productos dentro."}
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
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Sets" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {(value: CategoryType) => CATEGORY_TYPE_LABEL[value]}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIMPLE">Simple</SelectItem>
                          <SelectItem value="SET">Set (varias prendas)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Corset + falda o pantalón a juego" {...field} />
                    </FormControl>
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
                      : "Crear categoría"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {!categories && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {categories && categories.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay categorías.
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{category.name}</p>
                {category.description && (
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                )}
              </div>
              <Badge variant="secondary">{CATEGORY_TYPE_LABEL[category.type]}</Badge>
              <Badge variant={category.active ? "default" : "secondary"}>
                {category.active ? "Activa" : "Inactiva"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(category)}
                aria-label="Editar"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busyId === category.id}
                onClick={() => handleDelete(category)}
                aria-label="Eliminar"
              >
                {busyId === category.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

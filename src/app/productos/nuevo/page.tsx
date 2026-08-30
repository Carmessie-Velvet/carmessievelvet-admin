"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Category, Color, CreateProductPayload } from "@/types/product";
import { categoryService } from "@/services/category-service";
import { productService } from "@/services/product-service";
import { commonSizes } from "@/mocks/sizes";
import {
  defaultProductFormValues,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/product-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ImageUploader } from "@/components/products/ImageUploader";
import { VariantManager } from "@/components/products/VariantManager";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  useEffect(() => {
    categoryService.getCategories().then(setCategories);
    categoryService.getColors().then(setColors);
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
    mode: "onBlur",
  });

  async function onSubmit(values: ProductFormValues) {
    const payload: CreateProductPayload = {
      title: values.title,
      price: values.price,
      description: values.description,
      categoryId: values.categoryId,
      images: values.images.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      variants: values.variants.map(({ color, size, stock }) => ({
        color,
        size,
        stock,
      })),
    };

    const created = await productService.createProduct(payload);
    toast.success(`“${created.title}” se creó como borrador.`);
    router.push("/productos");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nuevo producto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se guarda como borrador. El envío queda preparado con un{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            console.log
          </code>{" "}
          listo para conectar la API real.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Título, precio, descripción y categoría del producto.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Vestido Noa Satinado en Vino" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (MXN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          inputMode="numeric"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              Number.isNaN(e.target.valueAsNumber)
                                ? 0
                                : e.target.valueAsNumber
                            )
                          }
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? "")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una categoría">
                              {(categoryId: string) =>
                                categoryId
                                  ? categories.find((c) => c.id === categoryId)?.name ??
                                    categoryId
                                  : "Selecciona una categoría"
                              }
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
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
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Corte, tela, caída, detalles de confección..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
              <CardDescription>
                La primera imagen se usa como portada del producto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <ImageUploader value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variantes</CardTitle>
              <CardDescription>
                Combina color, talle y stock disponible para cada variante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="variants"
                render={({ field }) => (
                  <FormItem>
                    <VariantManager
                      value={field.value}
                      onChange={field.onChange}
                      colors={colors}
                      sizes={commonSizes}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/productos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : "Crear producto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

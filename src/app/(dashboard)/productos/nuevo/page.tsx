"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Images, Info, Layers } from "lucide-react";
import type { ApiCategory, ApiTag } from "@/types/catalog";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { commonSizes } from "@/mocks/sizes";
import { cn } from "@/lib/utils";
import {
  defaultProductFormValues,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/product-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { ImageUploader } from "@/components/products/ImageUploader";
import { VariantManager } from "@/components/products/VariantManager";
import { ComponentManager } from "@/components/products/ComponentManager";
import { TagPicker } from "@/components/products/TagPicker";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);

  useEffect(() => {
    catalogService.getCategories().then(setCategories).catch(() => {
      toast.error("No se pudieron cargar las categorías.");
    });
    catalogService.getTags().then(setTags).catch(() => {
      toast.error("No se pudieron cargar las tags.");
    });
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
    mode: "onBlur",
  });

  const madeToOrder = useWatch({ control: form.control, name: "madeToOrder" });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isSet = selectedCategory?.type === "SET";

  async function onSubmit(values: ProductFormValues) {
    if (isSet && values.components.length < 2) {
      toast.error("Un set necesita al menos 2 prendas.");
      return;
    }

    try {
      const created = await catalogService.createProduct({
        name: values.name,
        description: values.description,
        price: values.price,
        categoryId: values.categoryId,
        sku: values.sku || undefined,
        madeToOrder: values.madeToOrder,
        tagIds: values.tagIds,
        ...(isSet
          ? { components: values.components }
          : { color: values.color || undefined, variants: values.variants }),
      });

      if (values.images.length > 0) {
        await catalogService.uploadProductImages(created.sku, values.images);
      }

      toast.success(`"${created.name}" se creó correctamente.`);
      router.push("/productos");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "No se pudo crear el producto."
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nuevo producto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se crea directo en el catálogo real. El color es un solo valor por
          producto (no por talla) — si el mismo diseño viene en otro color,
          se crea como un producto aparte.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon icon={Info} index={0} />
                <div>
                  <CardTitle>Información general</CardTitle>
                  <CardDescription>
                    Nombre, precio, descripción y categoría del producto.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
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

              <div className={cn("grid grid-cols-1 gap-4", !isSet && "sm:grid-cols-2")}>
                {!isSet && (
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Negro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Se genera automático si lo dejas vacío" {...field} />
                      </FormControl>
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

              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <TagPicker tags={tags} value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon icon={Images} index={1} />
                <div>
                  <CardTitle>Imágenes</CardTitle>
                  <CardDescription>
                    La primera imagen se usa como portada del producto. Se
                    suben a la API en cuanto guardas.
                  </CardDescription>
                </div>
              </div>
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
              <div className="flex items-center gap-3">
                <SectionIcon icon={Layers} index={2} />
                <div>
                  <CardTitle>{isSet ? "Prendas del set" : "Stock por talla"}</CardTitle>
                  <CardDescription>
                    {isSet
                      ? "Cada prenda tiene su propio color y stock por talla — el comprador elige por prenda, no por el producto."
                      : "Cuánto stock hay disponible en cada talla, o márcalo como sobre pedido para venderlo sin inventario."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="madeToOrder"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm font-normal">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      Vender sobre pedido (sin inventario)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      El stock deja de importar: se puede comprar cualquier
                      cantidad de veces hasta que marques una talla como
                      agotada.
                    </p>
                  </FormItem>
                )}
              />

              {isSet ? (
                <FormField
                  control={form.control}
                  name="components"
                  render={({ field }) => (
                    <FormItem>
                      <ComponentManager
                        value={field.value}
                        onChange={field.onChange}
                        sizes={commonSizes}
                        madeToOrder={madeToOrder}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="variants"
                  render={({ field }) => (
                    <FormItem>
                      <VariantManager
                        value={field.value}
                        onChange={field.onChange}
                        sizes={commonSizes}
                        madeToOrder={madeToOrder}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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

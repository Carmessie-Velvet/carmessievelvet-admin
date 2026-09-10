"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Images, Info, Layers, Loader2, Trash2, Video } from "lucide-react";
import type { ApiCategory, ApiProduct, ApiTag } from "@/types/catalog";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { commonSizes } from "@/mocks/sizes";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  productEditFormSchema,
  type ProductEditFormValues,
} from "@/lib/product-schema";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ExistingImagesManager } from "@/components/products/ExistingImagesManager";
import { ExistingVideoManager } from "@/components/products/ExistingVideoManager";
import { VariantManager } from "@/components/products/VariantManager";
import { ComponentManager } from "@/components/products/ComponentManager";
import { TagPicker } from "@/components/products/TagPicker";
import { cn } from "@/lib/utils";

function valuesFromProduct(product: ApiProduct): ProductEditFormValues {
  return {
    name: product.name,
    price: product.price,
    description: product.description ?? "",
    categoryId: product.category.id,
    sku: product.sku,
    color: product.color ?? "",
    active: product.active,
    madeToOrder: product.madeToOrder,
    tagIds: product.tags.map((t) => t.id),
    variants: commonSizes.map((size) => {
      const variant = product.variants.find((v) => v.size === size);
      return {
        size,
        stock: variant?.stock ?? 0,
        soldOut: variant?.soldOut ?? false,
      };
    }),
    components: product.components
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((component) => ({
        name: component.name,
        variants: component.variants.map((v) => ({
          size: v.size,
          color: v.color ?? "",
          stock: v.stock,
          soldOut: v.soldOut,
        })),
      })),
  };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ sku: string }>();
  const routeSku = params.sku;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentSku, setCurrentSku] = useState(routeSku);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      catalogService.getProduct(routeSku),
      catalogService.getCategories(),
      catalogService.getTags(),
    ])
      .then(([loadedProduct, loadedCategories, loadedTags]) => {
        if (cancelled) return;
        setProduct(loadedProduct);
        setCategories(loadedCategories);
        setTags(loadedTags);
        setCurrentSku(loadedProduct.sku);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el producto."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [routeSku, router]);

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
        <Link
          href="/productos"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Volver a productos
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <ProductEditForm
      product={product}
      categories={categories}
      tags={tags}
      currentSku={currentSku}
      onProductChange={(next) => {
        setProduct(next);
        setCurrentSku(next.sku);
      }}
      onSkuRenamed={(sku) => router.replace(`/productos/${sku}`)}
    />
  );
}

function ProductEditForm({
  product,
  categories,
  tags,
  currentSku,
  onProductChange,
  onSkuRenamed,
}: {
  product: ApiProduct;
  categories: ApiCategory[];
  tags: ApiTag[];
  currentSku: string;
  onProductChange: (product: ApiProduct) => void;
  onSkuRenamed: (sku: string) => void;
}) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ProductEditFormValues>({
    resolver: zodResolver(productEditFormSchema),
    defaultValues: valuesFromProduct(product),
    mode: "onBlur",
  });

  const madeToOrder = useWatch({ control: form.control, name: "madeToOrder" });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isSet = selectedCategory?.type === "SET";

  async function handleDelete() {
    const ok = await confirm({
      title: `¿Eliminar "${product.name}"?`,
      description: "Esta acción no se puede deshacer desde el admin.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await catalogService.deleteProduct(currentSku);
      toast.success(`"${product.name}" se eliminó.`);
      router.push("/productos");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "No se pudo eliminar el producto."
      );
      setIsDeleting(false);
    }
  }

  async function onSubmit(values: ProductEditFormValues) {
    if (isSet && values.components.length < 2) {
      toast.error("Un set necesita al menos 2 prendas.");
      return;
    }

    try {
      const updated = await catalogService.updateProduct(currentSku, {
        name: values.name,
        description: values.description,
        price: values.price,
        categoryId: values.categoryId,
        sku: values.sku || undefined,
        active: values.active,
        madeToOrder: values.madeToOrder,
        tagIds: values.tagIds,
        ...(isSet
          ? { components: values.components }
          : { color: values.color, variants: values.variants }),
      });

      onProductChange(updated);
      form.reset(valuesFromProduct(updated));
      toast.success("Producto actualizado.");

      if (updated.sku !== currentSku) {
        onSkuRenamed(updated.sku);
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "No se pudo guardar los cambios."
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/productos"
            aria-label="Volver a productos"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{product.sku}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          className="gap-1.5"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
          {isDeleting ? "Eliminando..." : "Eliminar producto"}
        </Button>
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
                    Nombre, precio, descripción, categoría y estado del
                    producto.
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

              <div className={cn("grid grid-cols-1 gap-4", isSet ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
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
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        value={field.value ? "true" : "false"}
                        onValueChange={(v) => field.onChange(v === "true")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {(value: string) =>
                                value === "true" ? "Activo" : "Inactivo"
                              }
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
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
                    La primera es la portada. Cada cambio se guarda al
                    instante, no hace falta el botón de abajo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ExistingImagesManager
                sku={currentSku}
                images={product.images}
                onChange={(images) => onProductChange({ ...product, images })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon icon={Video} index={2} />
                <div>
                  <CardTitle>Video</CardTitle>
                  <CardDescription>
                    A lo más un video por producto — subir uno nuevo reemplaza
                    el anterior.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ExistingVideoManager
                sku={currentSku}
                videoUrl={product.videoUrl}
                onChange={(videoUrl) => onProductChange({ ...product, videoUrl })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon icon={Layers} index={3} />
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
              disabled={!form.formState.isDirty}
              onClick={() => form.reset(valuesFromProduct(product))}
            >
              Descartar cambios
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

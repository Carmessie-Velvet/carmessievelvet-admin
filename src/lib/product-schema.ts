import { z } from "zod";
import { commonSizes } from "@/mocks/sizes";

export const productVariantSchema = z.object({
  size: z.string().min(1),
  stock: z.number().min(0, "El stock no puede ser negativo"),
  soldOut: z.boolean(),
});

/** Una variante talla×color dentro de una prenda (`components[]`) de un set. */
export const componentVariantSchema = z.object({
  size: z.string().min(1),
  color: z.string().trim().max(50, "Máximo 50 caracteres"),
  stock: z.number().min(0, "El stock no puede ser negativo"),
  soldOut: z.boolean(),
});

/** Una "prenda" de un producto en una categoría `SET` (ej. "Top", "Panty"). */
export const productComponentSchema = z.object({
  name: z.string().trim().min(1, "Nombre de la prenda requerido"),
  variants: z
    .array(componentVariantSchema)
    .min(1, "Agrega al menos una variante"),
});

const productFieldsSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  price: z
    .number({
      required_error: "Ingresa un precio",
      invalid_type_error: "Ingresa un precio válido",
    })
    .positive("El precio debe ser mayor a 0"),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  sku: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z0-9-]{3,50}$/.test(v), {
      message: "Solo letras, números y guiones (3-50 caracteres)",
    }),
  color: z.string().trim().max(50, "Máximo 50 caracteres"),
  /**
   * Sobre pedido: no se rastrea inventario, se vende indefinidamente hasta
   * marcar una talla como agotada. Se manda siempre explícito a la API para
   * no depender de la inferencia por `stock` omitido.
   */
  madeToOrder: z.boolean(),
  tagIds: z.array(z.string()),
  /** Solo se usa (y valida) si la categoría elegida es `SIMPLE` — ver `components`. */
  variants: z
    .array(productVariantSchema)
    .min(1, "Agrega al menos una variante"),
  /**
   * Solo se usa si la categoría elegida es `SET` — validación de "mínimo 2
   * prendas" vive en el `onSubmit` del form (necesita el `type` de la
   * categoría seleccionada, que no vive en este schema).
   */
  components: z.array(productComponentSchema),
});

export const productFormSchema = productFieldsSchema.extend({
  images: z.array(z.instanceof(File)).min(1, "Agrega al menos una imagen"),
  /** Opcional — a lo más un video por producto, ya validado (formato/duración/resolución/bitrate) antes de llegar aquí. */
  video: z.instanceof(File).nullable(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const defaultProductFormValues: ProductFormValues = {
  name: "",
  price: 0,
  description: "",
  categoryId: "",
  sku: "",
  color: "",
  // La mayoría de las piezas son sobre pedido — arranca marcado para no
  // obligar a tildarlo en cada producto nuevo; el admin lo desmarca cuando
  // sí hay inventario real que rastrear.
  madeToOrder: true,
  tagIds: [],
  images: [],
  video: null,
  variants: commonSizes.map((size) => ({ size, stock: 0, soldOut: false })),
  components: [],
};

/**
 * Editing a product never touches images through this form — those go
 * through their own immediate API calls (`ExistingImagesManager`), not a
 * "pending upload" list like the create form's `images` field.
 */
export const productEditFormSchema = productFieldsSchema.extend({
  active: z.boolean(),
});

export type ProductEditFormValues = z.infer<typeof productEditFormSchema>;

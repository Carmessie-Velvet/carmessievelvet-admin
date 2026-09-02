import { z } from "zod";
import { commonSizes } from "@/mocks/sizes";

export const productVariantSchema = z.object({
  size: z.string().min(1),
  stock: z.number().min(0, "El stock no puede ser negativo"),
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
  tagIds: z.array(z.string()),
  variants: z
    .array(productVariantSchema)
    .min(1, "Agrega al menos una variante"),
});

export const productFormSchema = productFieldsSchema.extend({
  images: z.array(z.instanceof(File)).min(1, "Agrega al menos una imagen"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const defaultProductFormValues: ProductFormValues = {
  name: "",
  price: 0,
  description: "",
  categoryId: "",
  sku: "",
  color: "",
  tagIds: [],
  images: [],
  variants: commonSizes.map((size) => ({ size, stock: 0 })),
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

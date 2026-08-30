import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.string(),
  color: z.string().min(1, "Falta el color"),
  size: z.string().min(1, "Falta el talle"),
  stock: z.number().min(0, "El stock no puede ser negativo"),
});

export const productFormSchema = z
  .object({
    title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
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
    images: z.array(z.instanceof(File)).min(1, "Agrega al menos una imagen"),
    variants: z
      .array(productVariantSchema)
      .min(1, "Agrega al menos una variante"),
  })
  .refine(
    (data) => {
      const keys = data.variants.map(
        (v) => `${v.color.trim().toLowerCase()}__${v.size.trim().toLowerCase()}`
      );
      return new Set(keys).size === keys.length;
    },
    { message: "Hay variantes repetidas con el mismo color y talle", path: ["variants"] }
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const defaultProductFormValues: ProductFormValues = {
  title: "",
  price: 0,
  description: "",
  categoryId: "",
  images: [],
  variants: [],
};

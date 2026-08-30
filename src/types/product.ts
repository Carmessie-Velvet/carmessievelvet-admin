export interface Category {
  id: string;
  name: string;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
}

export interface ProductImage {
  id: string;
  url: string;
  name: string;
}

export type ProductStatus = "draft" | "active";

export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  status: ProductStatus;
  createdAt: string;
}

/** Payload construido por el formulario de creación, listo para el POST real. */
export interface CreateProductPayload {
  title: string;
  price: number;
  description: string;
  categoryId: string;
  images: { name: string; size: number; type: string }[];
  variants: Omit<ProductVariant, "id">[];
}

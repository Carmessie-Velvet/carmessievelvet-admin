import type { CreateProductPayload, Product } from "@/types/product";
import { products } from "@/mocks/products";
import { delay } from "@/lib/delay";

/**
 * Contract for reading/writing catalog data. `MockProductService` is the
 * only implementation today; a future `RestProductService` implementing the
 * same interface can replace it at the point where `productService` is
 * exported below, without any UI code changing.
 */
export interface ProductService {
  getAll(): Promise<Product[]>;
  createProduct(payload: CreateProductPayload): Promise<Product>;
}

const NETWORK_DELAY_MS = 200;

export class MockProductService implements ProductService {
  async getAll(): Promise<Product[]> {
    await delay(NETWORK_DELAY_MS);
    return [...products];
  }

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    // TODO(backend): reemplazar este cuerpo por, por ejemplo:
    //   const res = await fetch("/api/products", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload),
    //   });
    //   if (!res.ok) throw new Error("No se pudo crear el producto");
    //   return res.json();
    // La interfaz `ProductService` no cambia, así que el formulario y el
    // resto de la UI no necesitan tocarse cuando esto se conecte.
    console.log("[MockProductService] POST /products", payload);
    await delay(NETWORK_DELAY_MS);

    const created: Product = {
      id: `p${Date.now()}`,
      title: payload.title,
      price: payload.price,
      description: payload.description,
      categoryId: payload.categoryId,
      images: payload.images.map((image, index) => ({
        id: `img-${Date.now()}-${index}`,
        url: "",
        name: image.name,
      })),
      variants: payload.variants.map((variant, index) => ({
        id: `v-${Date.now()}-${index}`,
        ...variant,
      })),
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    products.unshift(created);
    return created;
  }
}

export const productService: ProductService = new MockProductService();

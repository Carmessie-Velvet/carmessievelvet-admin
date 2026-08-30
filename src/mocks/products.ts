import type { Product } from "@/types/product";

function img(file: string, id: string, name: string): Product["images"][number] {
  return { id, url: `/products/${file}.jpeg`, name };
}

export const products: Product[] = [
  {
    id: "p1",
    title: "Corset Aurora Champagne",
    price: 890,
    description:
      "Corset satinado en tono champagne con copas estructuradas y ribete de encaje negro.",
    categoryId: "corsets",
    images: [img("corset-champagne-lace", "img-p1-1", "corset-champagne-lace.jpeg")],
    variants: [
      { id: "v1", color: "Champagne", size: "S", stock: 4 },
      { id: "v2", color: "Champagne", size: "M", stock: 6 },
      { id: "v3", color: "Champagne", size: "L", stock: 2 },
    ],
    status: "active",
    createdAt: "2026-08-02T10:00:00.000Z",
  },
  {
    id: "p2",
    title: "Corset Vino Trenzado",
    price: 850,
    description:
      "Corset en vino profundo con tirantes trenzados anudados y cierre invisible.",
    categoryId: "corsets",
    images: [img("corset-vino-twist", "img-p2-1", "corset-vino-twist.jpeg")],
    variants: [
      { id: "v4", color: "Vino", size: "S", stock: 3 },
      { id: "v5", color: "Vino", size: "M", stock: 5 },
    ],
    status: "active",
    createdAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "p3",
    title: "Corset Alado Brocado",
    price: 990,
    description:
      "Corset strapless en brocado con estampado de aves doradas sobre fondo oscuro.",
    categoryId: "corsets",
    images: [img("corset-brocade", "img-p3-1", "corset-brocade.jpeg")],
    variants: [
      { id: "v6", color: "Negro", size: "S", stock: 0 },
      { id: "v7", color: "Negro", size: "M", stock: 7 },
    ],
    status: "draft",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "p4",
    title: "Corset Jardín Amarillo",
    price: 870,
    description: "Corset en satín amarillo con estampado floral y tirantes finos.",
    categoryId: "corsets",
    images: [img("corset-yellow-floral", "img-p4-1", "corset-yellow-floral.jpeg")],
    variants: [
      { id: "v8", color: "Amarillo", size: "M", stock: 5 },
      { id: "v9", color: "Amarillo", size: "L", stock: 5 },
    ],
    status: "active",
    createdAt: "2026-08-24T10:00:00.000Z",
  },
  {
    id: "p5",
    title: "Set Príncipe de Gales",
    price: 1690,
    description:
      "Set de dos piezas: corset con tirantes anudados y pantalón ancho en estampado príncipe de Gales.",
    categoryId: "sets",
    images: [img("set-houndstooth", "img-p5-1", "set-houndstooth.jpeg")],
    variants: [
      { id: "v10", color: "Taupe", size: "S", stock: 2 },
      { id: "v11", color: "Taupe", size: "M", stock: 4 },
    ],
    status: "active",
    createdAt: "2026-08-27T10:00:00.000Z",
  },
  {
    id: "p6",
    title: "Set Piel Nocturna",
    price: 1790,
    description:
      "Set en terciopelo negro con ribetes de pelo sintético: corset de mangas largas y mini falda a juego.",
    categoryId: "sets",
    images: [img("set-black-fur", "img-p6-1", "set-black-fur.jpeg")],
    variants: [
      { id: "v12", color: "Negro", size: "S", stock: 3 },
      { id: "v13", color: "Negro", size: "M", stock: 3 },
    ],
    status: "draft",
    createdAt: "2026-08-28T10:00:00.000Z",
  },
];

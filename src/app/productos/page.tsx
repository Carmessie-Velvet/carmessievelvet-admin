import Image from "next/image";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import { productService } from "@/services/product-service";
import { categoryService } from "@/services/category-service";
import { formatCurrency } from "@/lib/format-currency";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Productos — Carmessie Velvet Admin",
};

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    productService.getAll(),
    categoryService.getCategories(),
  ]);

  const categoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? categoryId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} producto{products.length === 1 ? "" : "s"} en el catálogo.
          </p>
        </div>
        <Link
          href="/productos/nuevo"
          className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
        >
          <PlusCircle className="size-4" />
          Nuevo producto
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const totalStock = product.variants.reduce(
                (sum, v) => sum + v.stock,
                0
              );
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                      {product.images[0] && (
                        <Image
                          src={product.images[0].url}
                          alt={product.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryName(product.categoryId)}
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <span
                      className={totalStock === 0 ? "text-destructive" : undefined}
                    >
                      {totalStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status === "active" ? "Activo" : "Borrador"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

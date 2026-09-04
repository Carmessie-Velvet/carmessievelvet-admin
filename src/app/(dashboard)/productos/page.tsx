"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PackageSearch, Pencil, PlusCircle, Search } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiProduct } from "@/types/catalog";
import { cn } from "@/lib/utils";

function isFullySoldOut(product: ApiProduct): boolean {
  return product.variants.length > 0 && product.variants.every((v) => v.soldOut);
}

function matchesQuery(product: ApiProduct, query: string): boolean {
  const haystack = [product.name, product.sku, product.category.name, product.color]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ApiProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    catalogService
      .getProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el catálogo."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    if (!products) return null;
    if (!query.trim()) return products;
    return products.filter((product) => matchesQuery(product, query.trim()));
  }, [products, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products
              ? `${products.length} producto${products.length === 1 ? "" : "s"} en el catálogo.`
              : error
                ? "No se pudo cargar el catálogo."
                : "Cargando catálogo desde la API..."}
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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!products && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {products && products.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU, categoría o color..."
            className="pl-8"
          />
        </div>
      )}

      {products && products.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PackageSearch className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Todavía no hay productos</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Crea el primero para empezar a armar el catálogo.
            </p>
          </div>
          <Link
            href="/productos/nuevo"
            className={cn(buttonVariants({ variant: "outline" }), "mt-1 gap-1.5")}
          >
            <PlusCircle className="size-4" />
            Nuevo producto
          </Link>
        </div>
      )}

      {filtered && filtered.length === 0 && products && products.length > 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Ningún producto coincide con &ldquo;{query}&rdquo;.
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                      {product.images[0] && (
                        // Real product images can come from any host (the API's
                        // own dummy placeholder is via.placeholder.com), so a
                        // plain <img> avoids next/image's remotePatterns
                        // allowlist entirely instead of crashing on unlisted
                        // hosts.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {product.name}
                    <div className="text-xs font-normal text-muted-foreground">
                      {product.sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.color ?? "—"}
                  </TableCell>
                  <TableCell>{formatCurrency(product.finalPrice)}</TableCell>
                  <TableCell>
                    {isFullySoldOut(product) ? (
                      <Badge variant="destructive">Agotado</Badge>
                    ) : product.madeToOrder ? (
                      <Badge variant="secondary">Sobre pedido</Badge>
                    ) : product.totalStock === 0 ? (
                      <Badge variant="destructive">Agotado</Badge>
                    ) : (
                      product.totalStock
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/productos/${product.sku}`}
                      aria-label={`Editar ${product.name}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { useRouter } from "next/navigation";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";

export interface CatalogStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  categories: number;
}

/**
 * `{ totalProducts, activeProducts, outOfStock, categories }` — compartido
 * entre el dashboard y el encabezado de `/productos` para no duplicar el
 * mismo `Promise.all` dos veces. Siempre viene directo del inventario real
 * (nunca de la API de estadísticas), así que no depende de ningún rango de
 * fechas.
 */
export function useCatalogStats(router: ReturnType<typeof useRouter>) {
  const [catalog, setCatalog] = useState<CatalogStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([catalogService.getProducts(), catalogService.getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        setCatalog({
          totalProducts: products.length,
          activeProducts: products.filter((p) => p.active).length,
          outOfStock: products.filter((p) => p.totalStock === 0).length,
          categories: categories.length,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las métricas del catálogo.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { catalog, error };
}

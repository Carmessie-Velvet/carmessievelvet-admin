"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Layers,
  PlusCircle,
  ShoppingBag,
  Tags,
} from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CatalogStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  categories: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-md",
            tone === "warning"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {value ?? "—"}
          </CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([catalogService.getProducts(), catalogService.getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        setStats({
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
  }, [router]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panel de administración de Carmessie Velvet.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Productos" value={stats?.totalProducts ?? null} />
        <StatCard icon={Layers} label="Activos" value={stats?.activeProducts ?? null} />
        <StatCard
          icon={AlertTriangle}
          label="Sin stock"
          value={stats?.outOfStock ?? null}
          tone={stats && stats.outOfStock > 0 ? "warning" : "default"}
        />
        <StatCard icon={Tags} label="Categorías" value={stats?.categories ?? null} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShoppingBag className="size-4" />
            </span>
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                Crea y revisa las piezas del catálogo.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Link
              href="/productos/nuevo"
              className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
            >
              <PlusCircle className="size-4" />
              Nuevo producto
            </Link>
          </CardAction>
        </CardHeader>
      </Card>

      <p className="text-xs text-muted-foreground">
        Las métricas de arriba vienen directo del catálogo real. Ventas y
        pedidos se pueden sumar aquí una vez que el módulo de órdenes esté
        conectado.
      </p>
    </div>
  );
}

import Link from "next/link";
import { ShoppingBag, PlusCircle } from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panel de administración de Carmessie Velvet.
        </p>
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
        Este dashboard es un punto de partida — más adelante se pueden sumar
        métricas reales de ventas y pedidos una vez que el backend esté
        conectado.
      </p>
    </div>
  );
}

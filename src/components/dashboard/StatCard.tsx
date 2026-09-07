"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { formatCurrency } from "@/lib/format-currency";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SECTION_ICON_TINTS } from "@/components/ui/section-icon";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de número grande + ícono — compartida entre el dashboard y el
 * encabezado de listas (Productos, Órdenes) para que "cuántos hay" se vea
 * igual en toda la app en vez de reinventarse por pantalla.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  tintIndex = 0,
  money = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tone?: "default" | "warning";
  tintIndex?: number;
  /** Formatea `value` como moneda en vez de un conteo entero. */
  money?: boolean;
}) {
  const animated = useCountUp(value ?? 0);
  return (
    <Card>
      <CardHeader className="gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            tone === "warning" ? "bg-destructive/10 text-destructive" : SECTION_ICON_TINTS[tintIndex % SECTION_ICON_TINTS.length]
          )}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <CardTitle className="text-3xl font-extrabold tracking-tight tabular-nums">
            {value === null ? "—" : money ? formatCurrency(animated) : Math.round(animated)}
          </CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

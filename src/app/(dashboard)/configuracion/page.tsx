"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2, Store } from "lucide-react";
import { settingsService } from "@/services/settings-service";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionIcon } from "@/components/ui/section-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiAppSettings, ApiStoreStatus } from "@/types/settings";
import { cn } from "@/lib/utils";

/**
 * Orden de despliegue lunes-a-domingo (más natural para leer una semana),
 * aunque `value` sigue la convención de la API (0 = domingo … 6 = sábado,
 * igual que `Date.getUTCDay()`) — no reordenar los `value`, solo el orden
 * en que se listan acá.
 */
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ApiAppSettings | null>(null);
  const [status, setStatus] = useState<ApiStoreStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([settingsService.getAppSettings(), settingsService.getStoreStatus()])
      .then(([loadedSettings, loadedStatus]) => {
        if (cancelled) return;
        setSettings(loadedSettings);
        setStatus(loadedStatus);
        setClosedDays(new Set(loadedSettings.closedDays));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudo cargar la configuración.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function toggleDay(day: number) {
    setClosedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const isDirty = useMemo(() => {
    if (!settings) return false;
    const current = [...closedDays].sort().join(",");
    const original = [...settings.closedDays].sort().join(",");
    return current !== original;
  }, [closedDays, settings]);

  async function handleSave() {
    if (closedDays.size === 7) {
      toast.error("No puedes cerrar los 7 días de la semana.");
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsService.updateAppSettings({
        closedDays: [...closedDays],
      });
      setSettings(updated);
      const refreshedStatus = await settingsService.getStoreStatus();
      setStatus(refreshedStatus);
      toast.success("Calendario de pedidos actualizado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo guardar el calendario."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calendario semanal de la tienda — decide qué días acepta pedidos nuevos.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!settings && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {status && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon icon={Store} index={0} />
              <div>
                <CardTitle>Estado actual</CardTitle>
                <CardDescription>Lo mismo que ve el comprador en la tienda ahora mismo.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <Badge variant={status.open ? "default" : "destructive"} className="w-fit capitalize">
              {status.open ? `Abierta hoy (${status.todayLabel})` : `Cerrada hoy (${status.todayLabel})`}
            </Badge>
            {!status.open && status.opensIn && (
              <p className="text-sm text-muted-foreground">Vuelve a abrir en {status.opensIn.human}.</p>
            )}
          </CardContent>
        </Card>
      )}

      {settings && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon icon={CalendarDays} index={1} />
              <div>
                <CardTitle>Días de pedidos</CardTitle>
                <CardDescription>
                  Los días marcados como cerrados no aceptan compras nuevas — el comprador ve un
                  aviso en la tienda en vez del checkout.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAYS.map((day) => {
                const isClosed = closedDays.has(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm transition-colors",
                      isClosed
                        ? "border-destructive/40 bg-destructive/5 text-destructive"
                        : "border-primary/40 bg-primary/5 text-primary"
                    )}
                  >
                    <span className="font-medium">{day.label}</span>
                    <span className="text-xs">{isClosed ? "Cerrado" : "Abierto"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || saving}
                onClick={() => setClosedDays(new Set(settings.closedDays))}
              >
                Descartar cambios
              </Button>
              <Button type="button" disabled={!isDirty || saving} onClick={handleSave}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

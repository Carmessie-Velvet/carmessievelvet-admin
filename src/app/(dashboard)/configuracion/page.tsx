"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ImageIcon, Loader2, Store } from "lucide-react";
import { settingsService } from "@/services/settings-service";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Mismos límites que valida la API en `POST /v1/settings/logo` (ver
// `image.util.ts` en carmessievelvet-api) — se replican acá solo para
// rechazar un archivo obviamente inválido antes de subirlo, no como fuente
// de verdad (la API vuelve a validar del lado del servidor).
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

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
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([settingsService.getAppSettings(), settingsService.getStoreStatus()])
      .then(([loadedSettings, loadedStatus]) => {
        if (cancelled) return;
        setSettings(loadedSettings);
        setStatus(loadedStatus);
        setClosedDays(new Set(loadedSettings.closedDays));
        setDisplayName(loadedSettings.displayName);
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

  const isNameDirty = settings ? displayName.trim() !== settings.displayName : false;

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }

    setSavingName(true);
    try {
      const updated = await settingsService.updateAppSettings({ displayName: trimmed });
      setSettings(updated);
      setDisplayName(updated.displayName);
      toast.success("Nombre actualizado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar el nombre.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("El logo debe ser JPEG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("El logo no puede pesar más de 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const updated = await settingsService.uploadLogo(file);
      setSettings(updated);
      toast.success("Logo actualizado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo subir el logo.");
    } finally {
      setUploadingLogo(false);
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
              <SectionIcon icon={ImageIcon} index={1} />
              <div>
                <CardTitle>Nombre y logo</CardTitle>
                <CardDescription>
                  Lo que se muestra en los correos que la tienda envía (confirmaciones de pedido,
                  avisos, etc.).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Nombre de la tienda</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={120}
                  className="max-w-sm"
                />
                <Button
                  type="button"
                  disabled={!isNameDirty || savingName}
                  onClick={handleSaveName}
                >
                  {savingName ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logoUrl}
                      alt="Logo de la tienda"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? "Subiendo..." : "Cambiar logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPEG, PNG o WEBP, máx. 5MB.</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleLogoFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {settings && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon icon={CalendarDays} index={2} />
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

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
import type { ApiAppSettings, ApiStoreStatus, ClosedDaySchedule } from "@/types/settings";
import { cn } from "@/lib/utils";

/** "Todo el día" es la ventana completa — mismo valor que usa el backfill de la migración `AppSettingsClosedDaysHours` para un día que antes solo se cerraba entero. */
const FULL_DAY: Pick<ClosedDaySchedule, "startTime" | "endTime"> = {
  startTime: "00:00",
  endTime: "23:59",
};
const DAY_START = "00:00";
const DAY_END = "23:59";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function addMinute(time: string): string {
  return minutesToTime(timeToMinutes(time) + 1);
}

function subtractMinute(time: string): string {
  return minutesToTime(timeToMinutes(time) - 1);
}

type DayMode = "OPEN" | "CLOSED" | "PARTIAL";

/**
 * Lo que el admin ve/edita por día — piensa en "¿a qué hora abre/cierra?",
 * no en "¿qué ventana está cerrada?" (que es como lo guarda la API, ver
 * `ClosedDaySchedule`). Pedido explícito de la clienta: describir un día
 * parcial como "abierto de las 6pm a las X" en vez de "cerrado de X a Y" —
 * mismo dato, forma de leerlo invertida, porque así es como ella piensa su
 * horario real (ej. "de jueves 6pm a sábado 5pm").
 */
interface DayView {
  mode: DayMode;
  /** Solo importa en `PARTIAL` — `"00:00"` significa "sin restricción por la mañana". */
  opensAt: string;
  /** Solo importa en `PARTIAL` — `"23:59"` significa "sin restricción por la noche". */
  closesAt: string;
}

const FULLY_OPEN: DayView = { mode: "OPEN", opensAt: DAY_START, closesAt: DAY_END };

/**
 * Traduce la ventana *cerrada* que guarda la API a cómo se ve en pantalla.
 * Solo hay una ventana cerrada por día (restricción real de la API — ver
 * `ClosedDayScheduleDto` en `carmessievelvet-api`), así que un día parcial
 * únicamente puede restringir la apertura O el cierre, nunca los dos —
 * exactamente lo que necesita el caso real ("abre tarde" un día, "cierra
 * temprano" otro). Una ventana que no toca ninguno de los dos extremos del
 * día (cerrado a media tarde, con el resto abierto) es un caso que esta
 * pantalla no puede producir, pero si ya existe en la API (editado a mano)
 * se muestra igual, sin inventar un valor.
 */
function viewFromSchedule(schedule: ClosedDaySchedule | undefined): DayView {
  if (!schedule) return FULLY_OPEN;
  if (schedule.startTime === DAY_START && schedule.endTime === DAY_END) {
    return { mode: "CLOSED", opensAt: DAY_START, closesAt: DAY_END };
  }
  if (schedule.startTime === DAY_START) {
    // Cerrado de medianoche hasta `endTime` -> abre justo después.
    return { mode: "PARTIAL", opensAt: addMinute(schedule.endTime), closesAt: DAY_END };
  }
  if (schedule.endTime === DAY_END) {
    // Cerrado desde `startTime` hasta medianoche -> cierra justo antes.
    return { mode: "PARTIAL", opensAt: DAY_START, closesAt: subtractMinute(schedule.startTime) };
  }
  // No toca ningún extremo del día — no se puede editar como "abre/cierra"
  // sin perder información, se muestra tal cual llegó.
  return { mode: "PARTIAL", opensAt: schedule.endTime, closesAt: schedule.startTime };
}

/** El inverso de `viewFromSchedule` — `null` cuando el admin restringió los dos lados a la vez, algo que una sola ventana cerrada no puede representar. */
function scheduleFromView(day: number, view: DayView): ClosedDaySchedule | undefined | null {
  if (view.mode === "OPEN") return undefined;
  if (view.mode === "CLOSED") return { day, ...FULL_DAY };

  const opensRestricted = view.opensAt !== DAY_START;
  const closesRestricted = view.closesAt !== DAY_END;
  if (opensRestricted && closesRestricted) return null;
  if (opensRestricted) return { day, startTime: DAY_START, endTime: subtractMinute(view.opensAt) };
  if (closesRestricted) return { day, startTime: addMinute(view.closesAt), endTime: DAY_END };
  return undefined; // "Horario limitado" sin restringir ningún lado todavía = abierto todo el día.
}

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
  const [dayViews, setDayViews] = useState<Record<number, DayView>>({});
  const [originalDayViews, setOriginalDayViews] = useState<Record<number, DayView>>({});
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
        const views: Record<number, DayView> = {};
        for (let d = 0; d <= 6; d++) {
          views[d] = viewFromSchedule(loadedSettings.closedDays.find((s) => s.day === d));
        }
        setDayViews(views);
        setOriginalDayViews(views);
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

  function setDayView(day: number, view: DayView) {
    setDayViews((prev) => ({ ...prev, [day]: view }));
  }

  const isDirty = useMemo(
    () => JSON.stringify(dayViews) !== JSON.stringify(originalDayViews),
    [dayViews, originalDayViews]
  );

  async function handleSave() {
    const closedDays: ClosedDaySchedule[] = [];
    for (let day = 0; day <= 6; day++) {
      const view = dayViews[day] ?? FULLY_OPEN;
      const schedule = scheduleFromView(day, view);
      if (schedule === null) {
        toast.error(
          `${DAYS.find((d) => d.value === day)?.label}: hoy solo se puede restringir la hora de apertura o la de cierre en un mismo día, no las dos a la vez.`
        );
        return;
      }
      if (schedule) closedDays.push(schedule);
    }
    if (closedDays.length === 7) {
      toast.error("No puedes cerrar los 7 días de la semana.");
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsService.updateAppSettings({
        closedDays,
      });
      setSettings(updated);
      const views: Record<number, DayView> = {};
      for (let d = 0; d <= 6; d++) {
        views[d] = viewFromSchedule(updated.closedDays.find((s) => s.day === d));
      }
      setDayViews(views);
      setOriginalDayViews(views);
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
            <div className="flex flex-col gap-2">
              {DAYS.map((day) => {
                const view = dayViews[day.value] ?? FULLY_OPEN;
                const isOpen = view.mode === "OPEN";
                const isClosed = view.mode === "CLOSED";
                return (
                  <div
                    key={day.value}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                      isClosed
                        ? "border-destructive/40 bg-destructive/5"
                        : isOpen
                          ? "border-primary/40 bg-primary/5"
                          : "border-amber-500/40 bg-amber-500/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-left text-sm font-medium">{day.label}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDayView(day.value, FULLY_OPEN)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            isOpen
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-ring"
                          )}
                        >
                          Abierto
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDayView(
                              day.value,
                              view.mode === "PARTIAL"
                                ? view
                                : { mode: "PARTIAL", opensAt: DAY_START, closesAt: DAY_END }
                            )
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            view.mode === "PARTIAL"
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-border text-muted-foreground hover:border-ring"
                          )}
                        >
                          Horario limitado
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayView(day.value, { mode: "CLOSED", opensAt: DAY_START, closesAt: DAY_END })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            isClosed
                              ? "border-destructive bg-destructive text-white"
                              : "border-border text-muted-foreground hover:border-ring"
                          )}
                        >
                          Cerrado
                        </button>
                      </div>
                    </div>

                    {view.mode === "PARTIAL" && (
                      <div className="flex items-center gap-2 pl-[5.5rem] sm:pl-0">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Abre a las
                          <input
                            type="time"
                            value={view.opensAt}
                            onChange={(e) => setDayView(day.value, { ...view, opensAt: e.target.value })}
                            className="rounded border border-input bg-background px-1.5 py-1 text-xs"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Cierra a las
                          <input
                            type="time"
                            value={view.closesAt}
                            onChange={(e) => setDayView(day.value, { ...view, closesAt: e.target.value })}
                            className="rounded border border-input bg-background px-1.5 py-1 text-xs"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              &quot;Horario limitado&quot; deja abierto solo un rango del día — restringe la hora de
              apertura (ej. &quot;Abre a las&quot; 6:00pm) <strong>o</strong> la de cierre (ej.
              &quot;Cierra a las&quot; 5:00pm), no las dos a la vez en el mismo día. Para el ejemplo
              de jueves 6pm a sábado 5pm: jueves &quot;Abre a las&quot; 18:00, viernes
              &quot;Abierto&quot;, sábado &quot;Cierra a las&quot; 17:00, el resto de la semana
              &quot;Cerrado&quot;.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || saving}
                onClick={() => setDayViews(originalDayViews)}
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
